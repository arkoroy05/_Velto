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
   * Generate a prompt version of a context for AI agents
   */
  async generatePromptVersion(context: Context): Promise<string> {
    try {
      const prompt = this.buildPromptVersionPrompt(context)
      
      const response = await this.gemini.models.generateContent({
        model: this.generationModel,
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })

      return response.text || 'Failed to generate prompt version'
    } catch (error) {
      logger.error('Error generating prompt version:', error)
      return `Context: ${context.title}\n\nContent: ${context.content}\n\nType: ${context.type}`
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

  private buildPromptVersionPrompt(context: Context): string {
    return `Create a concise, AI-agent-friendly prompt version of the following context. Focus on the key information and make it easy for AI agents to understand and act upon.

Context:
Title: ${context.title || 'Untitled'}
Content: ${context.content || 'No content'}
Type: ${context.type || 'unknown'}

Generate a clear, actionable prompt that captures the essence of this context.`
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
