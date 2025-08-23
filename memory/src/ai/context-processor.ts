import { GoogleGenAI } from '@google/genai'
import { Context, AIAnalysis } from '../types'
import { logger } from '../utils/logger'

export class ContextProcessor {
  private gemini: GoogleGenAI
  private embeddingModel = 'text-embedding-004'
  private generationModel = 'gemini-2.0-flash-001'

  constructor() {
    const apiKey = process.env['GOOGLE_API_KEY'] || process.env['GEMINI_API_KEY']
    
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required')
    }

    this.gemini = new GoogleGenAI({ apiKey })
  }

  /**
   * Analyze a context and generate AI insights
   */
  async analyzeContext(context: Context): Promise<AIAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(context)
      
      const response = await this.gemini.models.generateContent({
        model: this.generationModel,
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json'
        }
      })

      const analysis = this.parseAnalysisResponse(response.text || '')
      logger.info(`Context analysis completed for context ${context._id}`)
      
      return analysis
    } catch (error) {
      logger.error('Error analyzing context:', error)
      return this.getDefaultAnalysis()
    }
  }

  /**
   * Generate embeddings for text content
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.gemini.models.embedContent({
        model: this.embeddingModel,
        contents: text
      })

      const embedding = response.embeddings?.[0]
      if (embedding?.values) {
        return embedding.values
      }
      
      throw new Error('No embedding values returned')
    } catch (error) {
      logger.error('Error generating embeddings:', error)
      // Fallback to simple hash-based embedding
      return this.generateSimpleEmbedding(text)
    }
  }

  /**
   * Generate a comprehensive, structured prompt version of a context for AI agents
   * Creates actionable, formatted context injections based on context type and user intent
   */
  async generatePromptVersion(context: Context, userPrompt: string, relatedContexts: Context[]): Promise<string> {
    try {
      // Analyze user intent and context type to determine prompt structure
      const promptStructure = this.analyzePromptStructure(context, userPrompt, relatedContexts);
      
      // Build structured prompt based on analysis
      const prompt = this.buildStructuredPromptVersion(context, userPrompt, relatedContexts, promptStructure);
      
      const response = await this.gemini.models.generateContent({
        model: this.generationModel,
        contents: prompt,
        config: {
          temperature: 0.1, // Low temperature for precise, consistent output
          maxOutputTokens: 8000, // Increased for comprehensive structured output
          responseMimeType: 'text/plain'
        }
      })

      return response.text || this.generateFallbackStructuredPrompt(context, userPrompt, relatedContexts, promptStructure);
    } catch (error) {
      logger.error('Error generating structured prompt version:', error);
      return this.generateFallbackStructuredPrompt(context, userPrompt, relatedContexts, { type: 'generic' });
    }
  }

  /**
   * Find related contexts using semantic similarity
   */
  async findRelatedContexts(
    context: Context, 
    allContexts: Context[], 
    limit: number = 5
  ): Promise<Context[]> {
    try {
      if (!context.embeddings || context.embeddings.length === 0) {
        return this.findRelatedByTags(context, allContexts, limit)
      }

      const contextEmbedding = context.embeddings
      const similarities: Array<{ context: Context; similarity: number }> = []

      for (const otherContext of allContexts) {
        if (otherContext._id?.equals(context._id)) continue
        
        if (otherContext.embeddings && otherContext.embeddings.length > 0) {
          const similarity = this.calculateCosineSimilarity(contextEmbedding, otherContext.embeddings)
          similarities.push({ context: otherContext, similarity })
        }
      }

      // Sort by similarity and return top results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.context)
    } catch (error) {
      logger.error('Error finding related contexts:', error)
      return this.findRelatedByTags(context, allContexts, limit)
    }
  }

  /**
   * Perform semantic search across contexts
   */
  async semanticSearch(
    query: string, 
    contexts: Context[], 
    limit: number = 10
  ): Promise<Array<{ context: Context; relevance: number }>> {
    try {
      const queryEmbedding = await this.generateEmbeddings(query)
      
      const results: Array<{ context: Context; relevance: number }> = []
      
      for (const context of contexts) {
        if (context.embeddings && context.embeddings.length > 0) {
          const relevance = this.calculateCosineSimilarity(queryEmbedding, context.embeddings)
          results.push({ context, relevance })
        }
      }

      // Sort by relevance and return top results
      return results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit)
    } catch (error) {
      logger.error('Error in semantic search:', error)
      return []
    }
  }

  /**
   * Break down a context into smaller chunks for RAG
   */
  async chunkContext(context: Context, chunkSize: number = 1000): Promise<string[]> {
    try {
      const content = context.content || ''
      const chunks: string[] = []
      
      // Simple text chunking by sentences
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
      
      let currentChunk = ''
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim())
          }
          currentChunk = sentence
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence
        }
      }
      
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      
      return chunks.length > 0 ? chunks : [content]
    } catch (error) {
      logger.error('Error chunking context:', error)
      return [context.content || '']
    }
  }

  /**
   * Generate a response using RAG (Retrieval Augmented Generation)
   */
  async generateRAGResponse(
    query: string, 
    contexts: Context[], 
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      // Get relevant contexts
      const relevantContexts = await this.semanticSearch(query, contexts, 5)
      
      if (relevantContexts.length === 0) {
        return 'I could not find relevant information to answer your question.'
      }

      // Build context for the prompt
      const contextText = relevantContexts
        .map(({ context }) => `Title: ${context.title || 'Untitled'}\nContent: ${context.content || 'No content'}\nType: ${context.type || 'unknown'}`)
        .join('\n\n---\n\n')

      const prompt = `Based on the following context, please answer the question. If the context doesn't contain enough information to answer the question, say so.

Context:
${contextText}

Question: ${query}

Answer:`

      const response = await this.gemini.models.generateContent({
        model: this.generationModel,
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: maxTokens
        }
      })

      return response.text || 'Failed to generate response'
    } catch (error) {
      logger.error('Error generating RAG response:', error)
      return 'I encountered an error while processing your request.'
    }
  }

  // Private helper methods

  private buildAnalysisPrompt(context: Context): string {
    return `Analyze the following context and provide insights in JSON format. Return only valid JSON without markdown formatting.

Context:
Title: ${context.title || 'Untitled'}
Content: ${context.content || 'No content'}
Type: ${context.type || 'unknown'}
Tags: ${context.tags?.join(', ') || 'None'}

Please analyze and return a JSON object with the following structure:
{
  "summary": "Brief summary of the content",
  "keywords": ["key", "terms", "extracted"],
  "categories": ["category1", "category2"],
  "sentiment": "positive|negative|neutral",
  "complexity": "low|medium|high",
  "suggestedActions": ["action1", "action2"],
  "relatedContexts": ["related", "topics"],
  "confidence": 0.95,
  "breakdown": {
    "mainTopics": ["topic1", "topic2"],
    "subTopics": ["subtopic1", "subtopic2"],
    "entities": ["entity1", "entity2"],
    "questions": ["question1", "question2"],
    "assumptions": ["assumption1", "assumption2"],
    "constraints": ["constraint1", "constraint2"],
    "opportunities": ["opportunity1", "opportunity2"],
    "risks": ["risk1", "risk2"]
  },
  "relationships": {
    "dependsOn": ["context1", "context2"],
    "implements": ["context1", "context2"],
    "references": ["context1", "context2"],
    "conflicts": ["context1", "context2"],
    "enhances": ["context1", "context2"]
  }
}

Focus on extracting actionable insights, identifying relationships with other contexts, and providing a comprehensive breakdown for better understanding and context graph creation.`
  }

  private parseAnalysisResponse(response: string): AIAnalysis {
    try {
      // Clean the response - remove markdown formatting
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      const parsed = JSON.parse(cleanResponse)
      
      return {
        summary: parsed.summary || 'Analysis completed',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        sentiment: parsed.sentiment || 'neutral',
        complexity: parsed.complexity || 'medium',
        suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : [],
        relatedContexts: Array.isArray(parsed.relatedContexts) ? parsed.relatedContexts : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        breakdown: parsed.breakdown || undefined,
        relationships: parsed.relationships || undefined,
        analyzedAt: new Date()
      }
    } catch (error) {
      logger.error('Error parsing AI analysis response:', error)
      return this.getDefaultAnalysis()
    }
  }

  /**
   * Analyze the context and user intent to determine optimal prompt structure
   */
  private analyzePromptStructure(context: Context, userPrompt?: string, relatedContexts?: Context[]): any {
    const analysis = {
      type: 'generic',
      contextCategory: 'unknown',
      userIntent: 'unknown',
      complexity: 'low',
      requiresCode: false,
      requiresSetup: false,
      requiresDependencies: false,
      projectType: 'unknown'
    };

    // Determine context category
    if (context.content?.includes('component') || context.content?.includes('React') || context.content?.includes('Next.js')) {
      analysis.contextCategory = 'frontend_development';
      analysis.requiresCode = true;
      analysis.requiresSetup = true;
      analysis.requiresDependencies = true;
    } else if (context.content?.includes('API') || context.content?.includes('backend') || context.content?.includes('server')) {
      analysis.contextCategory = 'backend_development';
      analysis.requiresCode = true;
      analysis.requiresSetup = true;
    } else if (context.content?.includes('database') || context.content?.includes('schema') || context.content?.includes('query')) {
      analysis.contextCategory = 'database';
      analysis.requiresCode = true;
    } else if (context.content?.includes('deploy') || context.content?.includes('CI/CD') || context.content?.includes('infrastructure')) {
      analysis.contextCategory = 'devops';
      analysis.requiresSetup = true;
    }

    // Analyze user intent from prompt
    if (userPrompt) {
      const prompt = userPrompt.toLowerCase();
      if (prompt.includes('build') || prompt.includes('create') || prompt.includes('implement')) {
        analysis.userIntent = 'implementation';
        analysis.complexity = 'high';
      } else if (prompt.includes('fix') || prompt.includes('debug') || prompt.includes('error')) {
        analysis.userIntent = 'troubleshooting';
        analysis.complexity = 'medium';
      } else if (prompt.includes('explain') || prompt.includes('understand') || prompt.includes('how')) {
        analysis.userIntent = 'explanation';
        analysis.complexity = 'low';
      } else if (prompt.includes('integrate') || prompt.includes('add') || prompt.includes('connect')) {
        analysis.userIntent = 'integration';
        analysis.complexity = 'high';
      }
    }

    // Determine project type from related contexts
    if (relatedContexts) {
      for (const ctx of relatedContexts) {
        if (ctx.content?.includes('shadcn') || ctx.content?.includes('Tailwind')) {
          analysis.projectType = 'shadcn_nextjs';
          break;
        } else if (ctx.content?.includes('Vue') || ctx.content?.includes('Nuxt')) {
          analysis.projectType = 'vue';
          break;
        } else if (ctx.content?.includes('Angular')) {
          analysis.projectType = 'angular';
          break;
        }
      }
    }

    // Set prompt type based on analysis
    if (analysis.contextCategory === 'frontend_development' && analysis.userIntent === 'implementation') {
      analysis.type = 'component_implementation';
    } else if (analysis.contextCategory === 'frontend_development' && analysis.userIntent === 'integration') {
      analysis.type = 'component_integration';
    } else if (analysis.contextCategory === 'backend_development') {
      analysis.type = 'backend_implementation';
    } else if (analysis.contextCategory === 'database') {
      analysis.type = 'database_implementation';
    } else if (analysis.contextCategory === 'devops') {
      analysis.type = 'devops_setup';
    } else {
      analysis.type = 'generic_development';
    }

    return analysis;
  }

  /**
   * Build structured prompt based on analysis
   */
  private buildStructuredPromptVersion(context: Context, userPrompt: string, relatedContexts: Context[], structure: any): string {
    const contextId = context._id?.toString() || 'unknown';
    const timestamp = context.createdAt?.toISOString() || 'unknown';
    
    let prompt = `# STRUCTURED CONTEXT INJECTION - ${structure.type.toUpperCase()}
# Context ID: ${contextId}
# Generated: ${timestamp}
# User Intent: ${structure.userIntent}
# Context Category: ${structure.contextCategory}
# Project Type: ${structure.projectType}
# Complexity: ${structure.complexity}

## TASK ANALYSIS
**User Request:** ${userPrompt || 'Not specified'}
**Context Type:** ${context.type || 'unknown'}
**Source:** ${context.source?.type || 'unknown'} (${context.source?.agentId || 'unknown'})

## CONTEXT CONTENT
${context.content || 'No content available'}

## AI ANALYSIS & SEMANTIC BREAKDOWN
**Summary:** ${context.aiAnalysis?.summary || 'No summary available'}

**Keywords:** ${(context.aiAnalysis?.keywords || []).join(', ')}
**Categories:** ${(context.aiAnalysis?.categories || []).join(', ')}
**Complexity:** ${context.aiAnalysis?.complexity || 'unknown'}
**Confidence:** ${context.aiAnalysis?.confidence || 0}

**Main Topics:** ${(context.aiAnalysis?.breakdown?.mainTopics || []).join(', ')}
**Sub Topics:** ${(context.aiAnalysis?.breakdown?.subTopics || []).join(', ')}
**Entities:** ${(context.aiAnalysis?.breakdown?.entities || []).join(', ')}
**Questions:** ${(context.aiAnalysis?.breakdown?.questions || []).join(', ')}
**Assumptions:** ${(context.aiAnalysis?.breakdown?.assumptions || []).join(', ')}
**Constraints:** ${(context.aiAnalysis?.breakdown?.constraints || []).join(', ')}
**Opportunities:** ${(context.aiAnalysis?.breakdown?.opportunities || []).join(', ')}
**Risks:** ${(context.aiAnalysis?.breakdown?.risks || []).join(', ')}

## SEMANTIC RELATIONSHIPS
**Depends On:** ${(context.aiAnalysis?.relationships?.dependsOn || []).join(', ')}
**Implements:** ${(context.aiAnalysis?.relationships?.implements || []).join(', ')}
**References:** ${(context.aiAnalysis?.relationships?.references || []).join(', ')}
**Conflicts:** ${(context.aiAnalysis?.relationships?.conflicts || []).join(', ')}
**Enhances:** ${(context.aiAnalysis?.relationships?.enhances || []).join(', ')}

## RELATED CONTEXTS
${this.buildRelatedContextsSection(relatedContexts || [])}

## STRUCTURED INSTRUCTION SET
${this.buildStructuredInstructions(structure, context, relatedContexts)}

## CONTEXT PRESERVATION VALIDATION
- Maintain all technical specifications and requirements
- Preserve exact terminology, entities, and relationships
- Consider identified constraints and risk factors
- Reference specific context elements when relevant
- Honor the complexity level and technical depth of the original

This context injection provides you with 100% of the available information. Generate a structured, actionable response based on the analysis above.`;

    return prompt;
  }

  /**
   * Build structured instructions based on context type and user intent
   */
  private buildStructuredInstructions(structure: any, context: Context, relatedContexts?: Context[]): string {
    switch (structure.type) {
      case 'component_implementation':
        return this.buildComponentImplementationInstructions(context, relatedContexts);
      case 'component_integration':
        return this.buildComponentIntegrationInstructions(context, relatedContexts);
      case 'backend_implementation':
        return this.buildBackendImplementationInstructions(context, relatedContexts);
      case 'database_implementation':
        return this.buildDatabaseImplementationInstructions(context, relatedContexts);
      case 'devops_setup':
        return this.buildDevOpsSetupInstructions(context, relatedContexts);
      default:
        return this.buildGenericDevelopmentInstructions(context, relatedContexts);
    }
  }

  /**
   * Build component implementation instructions
   */
  private buildComponentImplementationInstructions(context: Context, relatedContexts?: Context[]): string {
    const projectFramework = this.detectFramework(relatedContexts);
    const projectStyling = this.detectStyling(relatedContexts);
    const projectLanguage = this.detectLanguage(relatedContexts);
    const projectUILibrary = this.detectUILibrary(relatedContexts);
    
    let instructions = `## COMPONENT IMPLEMENTATION INSTRUCTIONS

**Task:** Create a React component based on the provided context and requirements.

**Project Analysis:**
- **Framework:** ${projectFramework}
- **Styling:** ${projectStyling}
- **Language:** ${projectLanguage}
- **UI Library:** ${projectUILibrary}

**Context Information:**
- **Title:** ${context.title || 'Untitled'}
- **Type:** ${context.type || 'unknown'}
- **Content Length:** ${context.content?.length || 0} characters

**Implementation Requirements:**
1. **Component Structure:**
   - Create a functional React component with proper TypeScript interfaces
   - Implement proper prop validation and default values
   - Use modern React patterns (hooks, functional components)

2. **Styling & Layout:**
   - Implement responsive design principles
   - Use the detected styling framework appropriately
   - Ensure accessibility compliance

3. **State Management:**
   - Identify required state variables
   - Implement proper state management patterns
   - Handle component lifecycle appropriately

4. **Dependencies:**
   - List all required npm packages
   - Provide installation commands
   - Handle peer dependencies

5. **Integration Points:**
   - Identify where this component should be used
   - Provide usage examples
   - Handle prop passing and event handling

**Output Format:**
- Complete component code with TypeScript
- Required dependencies and installation commands
- Usage examples and integration instructions
- Project setup requirements if needed
- Testing and validation guidelines`;

    return instructions;
  }

  /**
   * Build component integration instructions
   */
  private buildComponentIntegrationInstructions(context: Context, relatedContexts?: Context[]): string {
    const projectFramework = this.detectFramework(relatedContexts);
    const projectStyling = this.detectStyling(relatedContexts);
    
    return `## COMPONENT INTEGRATION INSTRUCTIONS

**Task:** Integrate an existing component into the current project structure.

**Project Context:**
- **Framework:** ${projectFramework}
- **Styling:** ${projectStyling}
- **Component Title:** ${context.title || 'Untitled'}
- **Component Type:** ${context.type || 'unknown'}

**Integration Requirements:**
1. **Project Structure Analysis:**
   - Determine the correct component directory
   - Identify required folder structure
   - Check for existing component patterns

2. **Dependency Management:**
   - Install required npm packages
   - Handle peer dependencies
   - Check for version conflicts

3. **Code Integration:**
   - Copy component code to appropriate location
   - Update import statements
   - Handle any project-specific modifications

4. **Styling Integration:**
   - Ensure styling framework compatibility
   - Handle CSS conflicts
   - Implement responsive design

5. **Testing & Validation:**
   - Verify component functionality
   - Check for console errors
   - Validate responsive behavior

**Output Format:**
- Step-by-step integration guide
- Required file locations and structure
- Installation commands
- Usage examples
- Troubleshooting steps`;
  }

  /**
   * Build backend implementation instructions
   */
  private buildBackendImplementationInstructions(context: Context, relatedContexts?: Context[]): string {
    const projectLanguage = this.detectLanguage(relatedContexts);
    
    return `## BACKEND IMPLEMENTATION INSTRUCTIONS

**Task:** Implement backend functionality based on the provided context.

**Project Context:**
- **Language:** ${projectLanguage}
- **Component Title:** ${context.title || 'Untitled'}
- **Component Type:** ${context.type || 'unknown'}

**Implementation Requirements:**
1. **API Design:**
   - Define RESTful endpoints
   - Implement proper HTTP methods
   - Handle request/response validation

2. **Database Integration:**
   - Design database schema if needed
   - Implement data models
   - Handle database connections

3. **Authentication & Security:**
   - Implement proper authentication
   - Handle authorization
   - Implement security best practices

4. **Error Handling:**
   - Implement proper error responses
   - Handle edge cases
   - Provide meaningful error messages

**Output Format:**
- Complete API implementation code
- Database schema and models
- Installation and setup instructions
- Testing endpoints
- Deployment considerations`;
  }

  /**
   * Build database implementation instructions
   */
  private buildDatabaseImplementationInstructions(context: Context, relatedContexts?: Context[]): string {
    const projectLanguage = this.detectLanguage(relatedContexts);
    
    return `## DATABASE IMPLEMENTATION INSTRUCTIONS

**Task:** Implement database functionality based on the provided context.

**Project Context:**
- **Language:** ${projectLanguage}
- **Component Title:** ${context.title || 'Untitled'}
- **Component Type:** ${context.type || 'unknown'}

**Implementation Requirements:**
1. **Schema Design:**
   - Design database tables
   - Define relationships
   - Implement constraints

2. **Data Models:**
   - Create ORM models
   - Implement validation
   - Handle data types

3. **Query Implementation:**
   - Implement CRUD operations
   - Handle complex queries
   - Optimize performance

**Output Format:**
- Complete database schema
- Data models and validation
- Query implementations
- Migration scripts
- Testing data`;
  }

  /**
   * Build DevOps setup instructions
   */
  private buildDevOpsSetupInstructions(context: Context, relatedContexts?: Context[]): string {
    const projectFramework = this.detectFramework(relatedContexts);
    
    return `## DEVOPS SETUP INSTRUCTIONS

**Task:** Set up DevOps infrastructure based on the provided context.

**Project Context:**
- **Framework:** ${projectFramework}
- **Component Title:** ${context.title || 'Untitled'}
- **Component Type:** ${context.type || 'unknown'}

**Setup Requirements:**
1. **CI/CD Pipeline:**
   - Configure build automation
   - Implement testing
   - Handle deployment

2. **Infrastructure:**
   - Set up hosting environment
   - Configure monitoring
   - Handle scaling

3. **Security:**
   - Implement security measures
   - Handle secrets management
   - Configure access control

**Output Format:**
- Complete configuration files
- Setup commands
- Environment variables
- Monitoring setup
- Security checklist`;
  }

  /**
   * Build generic development instructions
   */
  private buildGenericDevelopmentInstructions(context: Context, relatedContexts?: Context[]): string {
    const projectFramework = this.detectFramework(relatedContexts);
    const projectStyling = this.detectStyling(relatedContexts);
    
    return `## GENERIC DEVELOPMENT INSTRUCTIONS

**Task:** Provide development guidance based on the provided context.

**Project Context:**
- **Framework:** ${projectFramework}
- **Styling:** ${projectStyling}
- **Component Title:** ${context.title || 'Untitled'}
- **Component Type:** ${context.type || 'unknown'}

**Requirements:**
1. **Analysis:**
   - Understand the context requirements
   - Identify implementation approach
   - Consider best practices

2. **Implementation:**
   - Provide code examples
   - Handle dependencies
   - Implement proper structure

3. **Testing:**
   - Validate functionality
   - Handle edge cases
   - Ensure quality

**Output Format:**
- Implementation approach
- Code examples
- Required resources
- Testing guidelines
- Best practices`;
  }

  /**
   * Detect framework from related contexts
   */
  private detectFramework(relatedContexts?: Context[]): string {
    if (!relatedContexts) return 'Unknown';
    
    for (const ctx of relatedContexts) {
      if (ctx.content?.includes('Next.js') || ctx.content?.includes('next')) return 'Next.js';
      if (ctx.content?.includes('React')) return 'React';
      if (ctx.content?.includes('Vue')) return 'Vue';
      if (ctx.content?.includes('Angular')) return 'Angular';
    }
    return 'Unknown';
  }

  /**
   * Detect styling framework from related contexts
   */
  private detectStyling(relatedContexts?: Context[]): string {
    if (!relatedContexts) return 'Unknown';
    
    for (const ctx of relatedContexts) {
      if (ctx.content?.includes('Tailwind')) return 'Tailwind CSS';
      if (ctx.content?.includes('shadcn')) return 'shadcn/ui';
      if (ctx.content?.includes('Material-UI')) return 'Material-UI';
      if (ctx.content?.includes('Bootstrap')) return 'Bootstrap';
    }
    return 'Unknown';
  }

  /**
   * Detect programming language from related contexts
   */
  private detectLanguage(relatedContexts?: Context[]): string {
    if (!relatedContexts) return 'Unknown';
    
    for (const ctx of relatedContexts) {
      if (ctx.content?.includes('TypeScript')) return 'TypeScript';
      if (ctx.content?.includes('JavaScript')) return 'JavaScript';
      if (ctx.content?.includes('Python')) return 'Python';
      if (ctx.content?.includes('Java')) return 'Java';
    }
    return 'Unknown';
  }

  /**
   * Detect UI library from related contexts
   */
  private detectUILibrary(relatedContexts?: Context[]): string {
    if (!relatedContexts) return 'Unknown';
    
    for (const ctx of relatedContexts) {
      if (ctx.content?.includes('shadcn')) return 'shadcn/ui';
      if (ctx.content?.includes('Material-UI')) return 'Material-UI';
      if (ctx.content?.includes('Ant Design')) return 'Ant Design';
      if (ctx.content?.includes('Chakra UI')) return 'Chakra UI';
    }
    return 'Unknown';
  }

  /**
   * Build related contexts section with semantic relationships
   */
  private buildRelatedContextsSection(relatedContexts: Context[]): string {
    if (relatedContexts.length === 0) return '**Related Contexts:** None identified';
    
    let section = '**Related Contexts (Semantic Graph):**\n';
    
    relatedContexts.forEach((ctx, index) => {
      const ctxId = ctx._id?.toString() || 'unknown';
      const title = ctx.title || 'Untitled';
      const type = ctx.type || 'unknown';
      const summary = ctx.aiAnalysis?.summary || 'No summary';
      
      section += `${index + 1}. **${title}** (ID: ${ctxId})\n`;
      section += `   - Type: ${type}\n`;
      section += `   - Summary: ${summary}\n`;
      section += `   - Tags: ${(ctx.tags || []).join(', ')}\n`;
      section += `   - Created: ${ctx.createdAt?.toISOString() || 'unknown'}\n\n`;
    });
    
    return section;
  }

  /**
   * Fallback prompt generation if AI fails for structured prompts
   */
  private generateFallbackStructuredPrompt(context: Context, userPrompt: string, relatedContexts: Context[], structure: any): string {
    const contextId = context._id?.toString() || 'unknown';
    const timestamp = context.createdAt?.toISOString() || 'unknown';
    
    let prompt = `# STRUCTURED CONTEXT INJECTION - FALLBACK VERSION
# Context ID: ${contextId}
# Generated: ${timestamp}
# User Intent: ${structure.userIntent}
# Context Category: ${structure.contextCategory}
# Project Type: ${structure.projectType}
# Complexity: ${structure.complexity}

## TASK ANALYSIS
**User Request:** ${userPrompt || 'Not specified'}
**Context Type:** ${context.type || 'unknown'}
**Source:** ${context.source?.type || 'unknown'} (${context.source?.agentId || 'unknown'})

## CONTEXT CONTENT
${context.content || 'No content available'}

## AI ANALYSIS & SEMANTIC BREAKDOWN
**Summary:** ${context.aiAnalysis?.summary || 'No summary available'}

**Keywords:** ${(context.aiAnalysis?.keywords || []).join(', ')}
**Categories:** ${(context.aiAnalysis?.categories || []).join(', ')}
**Complexity:** ${context.aiAnalysis?.complexity || 'unknown'}
**Confidence:** ${context.aiAnalysis?.confidence || 0}

**Main Topics:** ${(context.aiAnalysis?.breakdown?.mainTopics || []).join(', ')}
**Sub Topics:** ${(context.aiAnalysis?.breakdown?.subTopics || []).join(', ')}
**Entities:** ${(context.aiAnalysis?.breakdown?.entities || []).join(', ')}
**Questions:** ${(context.aiAnalysis?.breakdown?.questions || []).join(', ')}
**Assumptions:** ${(context.aiAnalysis?.breakdown?.assumptions || []).join(', ')}
**Constraints:** ${(context.aiAnalysis?.breakdown?.constraints || []).join(', ')}
**Opportunities:** ${(context.aiAnalysis?.breakdown?.opportunities || []).join(', ')}
**Risks:** ${(context.aiAnalysis?.breakdown?.risks || []).join(', ')}

## SEMANTIC RELATIONSHIPS
**Depends On:** ${(context.aiAnalysis?.relationships?.dependsOn || []).join(', ')}
**Implements:** ${(context.aiAnalysis?.relationships?.implements || []).join(', ')}
**References:** ${(context.aiAnalysis?.relationships?.references || []).join(', ')}
**Conflicts:** ${(context.aiAnalysis?.relationships?.conflicts || []).join(', ')}
**Enhances:** ${(context.aiAnalysis?.relationships?.enhances || []).join(', ')}

## RELATED CONTEXTS
${this.buildRelatedContextsSection(relatedContexts || [])}

## STRUCTURED INSTRUCTION SET
${this.buildStructuredInstructions(structure, context, relatedContexts)}

## CONTEXT PRESERVATION VALIDATION
- Maintain all technical specifications and requirements
- Preserve exact terminology, entities, and relationships
- Consider identified constraints and risk factors
- Reference specific context elements when relevant
- Honor the complexity level and technical depth of the original

This context injection provides you with 100% of the available information. Generate a structured, actionable response based on the analysis above.`;

    return prompt;
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0
    
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += (vec1[i] || 0) * (vec2[i] || 0)
      norm1 += (vec1[i] || 0) * (vec1[i] || 0)
      norm2 += (vec2[i] || 0) * (vec2[i] || 0)
    }
    
    if (norm1 === 0 || norm2 === 0) return 0
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  private findRelatedByTags(context: Context, allContexts: Context[], limit: number): Context[] {
    const contextTags = context.tags || []
    if (contextTags.length === 0) return []

    const related: Array<{ context: Context; score: number }> = []
    
    for (const otherContext of allContexts) {
      if (otherContext._id?.equals(context._id)) continue
      
      const otherTags = otherContext.tags || []
      const commonTags = contextTags.filter(tag => otherTags.includes(tag))
      const score = commonTags.length / Math.max(contextTags.length, otherTags.length)
      
      if (score > 0) {
        related.push({ context: otherContext, score })
      }
    }

    return related
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.context)
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding as fallback
    const hash = this.simpleHash(text)
    const embedding = new Array(384).fill(0)
    
    for (let i = 0; i < Math.min(hash.length, embedding.length); i++) {
      embedding[i] = (hash.charCodeAt(i) % 200 - 100) / 100
    }
    
    return embedding
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }

  private getDefaultAnalysis(): AIAnalysis {
    return {
      summary: 'Analysis completed',
      keywords: [],
      categories: [],
      sentiment: 'neutral',
      complexity: 'medium',
      suggestedActions: [],
      relatedContexts: [],
      confidence: 0.5,
      analyzedAt: new Date()
    }
  }
}

// Export lazy-loaded singleton instance
let _contextProcessor: ContextProcessor | null = null

export const getContextProcessor = (): ContextProcessor => {
  if (!_contextProcessor) {
    _contextProcessor = new ContextProcessor()
  }
  return _contextProcessor
}

// Export getter function instead of direct instance
export const contextProcessor = new Proxy({} as ContextProcessor, {
  get(_target, prop) {
    const instance = getContextProcessor()
    return instance[prop as keyof ContextProcessor]
  }
})
