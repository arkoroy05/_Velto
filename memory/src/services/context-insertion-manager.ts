import { ContextNode } from '../types';
import { ContextProcessor } from '../ai/context-processor';

export interface ContextInsertionRequest {
  userPrompt: string;
  projectId: string;
  userId: string;
  maxTokens?: number;
  contextType?: 'conversation' | 'document' | 'mixed';
  priority?: 'relevance' | 'recency' | 'importance';
}

export interface ContextInsertionResult {
  contextBlock: string;
  tokenCount: number;
  sourceNodes: string[];
  confidence: number;
  metadata: {
    searchQuery: string;
    selectedNodes: number;
    totalAvailable: number;
    processingTime: number;
  };
}

export interface PromptAnalysis {
  intent: string;
  keywords: string[];
  entities: string[];
  contextType: 'conversation' | 'document' | 'mixed';
  urgency: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
}

export class ContextInsertionManager {
  private contextProcessor: ContextProcessor | null;

  constructor() {
    try {
      this.contextProcessor = new ContextProcessor();
    } catch (error) {
      console.warn('ContextProcessor initialization failed, using fallback mode:', error);
      this.contextProcessor = null;
    }
  }

  /**
   * Main method to generate context insertion block
   */
  async generateContextInsertion(request: ContextInsertionRequest): Promise<ContextInsertionResult> {
    const startTime = Date.now();
    
    try {
      // 1. Analyze the user prompt
      const promptAnalysis = await this.analyzePrompt(request.userPrompt);
      
      // 2. Search for relevant context nodes using a simplified approach
      // For now, we'll use a mock search until we have a proper graph
      const searchResults = await this.performContextSearch(request, promptAnalysis);

      // 3. Select optimal nodes for context
      const selectedNodes = await this.selectOptimalNodes(
        searchResults,
        request,
        promptAnalysis
      );

      // 4. Format context into crisp insertion block
      const contextBlock = await this.formatContextBlock(
        selectedNodes,
        request,
        promptAnalysis
      );

      // 5. Calculate token count and confidence
      const tokenCount = this.estimateTokenCount(contextBlock);
      const confidence = this.calculateConfidence(selectedNodes, searchResults.length);

      const processingTime = Date.now() - startTime;

      return {
        contextBlock,
        tokenCount,
        sourceNodes: selectedNodes.map(node => node.id),
        confidence,
        metadata: {
          searchQuery: this.buildSearchQuery(request.userPrompt, promptAnalysis),
          selectedNodes: selectedNodes.length,
          totalAvailable: searchResults.length,
          processingTime
        }
      };

    } catch (error) {
      console.error('Context insertion generation failed:', error);
      throw new Error(`Context insertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze user prompt to extract intent and context requirements
   */
  private async analyzePrompt(prompt: string): Promise<PromptAnalysis> {
    try {
      if (this.contextProcessor) {
        // Use AI to analyze the prompt
        const analysisPrompt = `
Analyze this user prompt and extract key information:

Prompt: "${prompt}"

Return a JSON response with:
- intent: What the user is trying to accomplish (1-2 words)
- keywords: Key terms for search (max 5)
- entities: Named entities mentioned (max 3)
- contextType: "conversation", "document", or "mixed"
- urgency: "low", "medium", or "high"
- complexity: "simple", "moderate", or "complex"

Example:
{
  "intent": "debug",
  "keywords": ["error", "code", "function"],
  "entities": ["API", "database"],
  "contextType": "conversation",
  "urgency": "high",
  "complexity": "moderate"
}
`;

        const response = await this.contextProcessor.generateResponse(analysisPrompt);
        const analysis = this.parseJsonFromMarkdown(response);

        return {
          intent: analysis.intent || 'general',
          keywords: analysis.keywords || [],
          entities: analysis.entities || [],
          contextType: analysis.contextType || 'mixed',
          urgency: analysis.urgency || 'medium',
          complexity: analysis.complexity || 'moderate'
        };
      } else {
        // Fallback analysis when AI is not available
        return this.analyzePromptFallback(prompt);
      }

    } catch (error) {
      console.warn('Prompt analysis failed, using fallback:', error);
      return this.analyzePromptFallback(prompt);
    }
  }

  /**
   * Fallback prompt analysis when AI is not available
   */
  private analyzePromptFallback(prompt: string): PromptAnalysis {
    const keywords = this.extractKeywordsFallback(prompt);
    
    // Simple intent detection
    let intent = 'general';
    if (prompt.toLowerCase().includes('debug') || prompt.toLowerCase().includes('error')) {
      intent = 'debug';
    } else if (prompt.toLowerCase().includes('how') || prompt.toLowerCase().includes('what')) {
      intent = 'question';
    } else if (prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('build')) {
      intent = 'create';
    }
    
    // Simple context type detection
    let contextType: 'conversation' | 'document' | 'mixed' = 'mixed';
    if (prompt.toLowerCase().includes('chat') || prompt.toLowerCase().includes('conversation')) {
      contextType = 'conversation';
    } else if (prompt.toLowerCase().includes('document') || prompt.toLowerCase().includes('file')) {
      contextType = 'document';
    }
    
    // Simple urgency detection
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    if (prompt.toLowerCase().includes('urgent') || prompt.toLowerCase().includes('asap') || prompt.toLowerCase().includes('immediately')) {
      urgency = 'high';
    } else if (prompt.toLowerCase().includes('when you have time') || prompt.toLowerCase().includes('low priority')) {
      urgency = 'low';
    }
    
    // Simple complexity detection
    let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
    if (prompt.length < 50 && keywords.length <= 2) {
      complexity = 'simple';
    } else if (prompt.length > 200 || keywords.length > 5) {
      complexity = 'complex';
    }
    
    return {
      intent,
      keywords,
      entities: [],
      contextType,
      urgency,
      complexity
    };
  }

  /**
   * Perform context search using available search methods
   */
  private async performContextSearch(_request: ContextInsertionRequest, _analysis: PromptAnalysis): Promise<ContextNode[]> {
    // For now, return empty array as we don't have a full graph search implementation
    // This would be replaced with actual search logic
    return [];
  }

  /**
   * Build search query from prompt and analysis
   */
  private buildSearchQuery(prompt: string, analysis: PromptAnalysis): string {
    const keywords = analysis.keywords.join(' ');
    const entities = analysis.entities.join(' ');
    const intent = analysis.intent;
    
    // Combine all elements for comprehensive search
    return `${intent} ${keywords} ${entities} ${prompt}`.trim();
  }

  /**
   * Select optimal nodes based on relevance, recency, and importance
   */
  private async selectOptimalNodes(
    nodes: ContextNode[],
    request: ContextInsertionRequest,
    analysis: PromptAnalysis
  ): Promise<ContextNode[]> {
    const maxTokens = request.maxTokens || 2000;
    const priority = request.priority || 'relevance';

    // Score nodes based on priority
    const scoredNodes = nodes.map(node => ({
      node,
      score: this.calculateNodeScore(node, analysis, priority)
    }));

    // Sort by score
    scoredNodes.sort((a, b) => b.score - a.score);

    // Select nodes that fit within token limit
    const selectedNodes: ContextNode[] = [];
    let currentTokens = 0;

    for (const { node } of scoredNodes) {
      const nodeTokens = this.estimateTokenCount(node.content);
      
      if (currentTokens + nodeTokens <= maxTokens) {
        selectedNodes.push(node);
        currentTokens += nodeTokens;
      } else {
        // Try to fit a partial node if it's highly relevant
        const nodeScore = scoredNodes.find(sn => sn.node === node)?.score;
        if (nodeScore && nodeScore > 0.8 && selectedNodes.length === 0) {
          const partialContent = this.truncateToTokenLimit(node.content, maxTokens - currentTokens);
          if (partialContent.length > 50) { // Only if meaningful content remains
            selectedNodes.push({
              ...node,
              content: partialContent
            });
          }
        }
        break;
      }
    }

    return selectedNodes;
  }

  /**
   * Format selected nodes into a crisp context insertion block
   */
  private async formatContextBlock(
    nodes: ContextNode[],
    request: ContextInsertionRequest,
    analysis: PromptAnalysis
  ): Promise<string> {
    if (nodes.length === 0) {
      return `<!-- No relevant context found for: ${request.userPrompt} -->`;
    }

    // Group nodes by type for better organization
    const groupedNodes = this.groupNodesByType(nodes);
    
    let contextBlock = `<!-- Context for: ${request.userPrompt} -->\n`;
    contextBlock += `<!-- Project: ${request.projectId} | Intent: ${analysis.intent} | Urgency: ${analysis.urgency} -->\n\n`;

    // Add conversation context first (most relevant for AI)
    if (groupedNodes.conversation.length > 0) {
      contextBlock += `## Previous Conversations\n`;
      for (const node of groupedNodes.conversation) {
        contextBlock += this.formatConversationNode(node);
      }
      contextBlock += '\n';
    }

    // Add document context
    if (groupedNodes.document.length > 0) {
      contextBlock += `## Relevant Documents\n`;
      for (const node of groupedNodes.document) {
        contextBlock += this.formatDocumentNode(node);
      }
      contextBlock += '\n';
    }

    // Add code context
    if (groupedNodes.code.length > 0) {
      contextBlock += `## Code References\n`;
      for (const node of groupedNodes.code) {
        contextBlock += this.formatCodeNode(node);
      }
      contextBlock += '\n';
    }

    // Add metadata context
    if (groupedNodes.metadata.length > 0) {
      contextBlock += `## Additional Context\n`;
      for (const node of groupedNodes.metadata) {
        contextBlock += this.formatMetadataNode(node);
      }
    }

    return contextBlock.trim();
  }

  /**
   * Format conversation node for context
   */
  private formatConversationNode(node: ContextNode): string {
    const title = node.title || 'Conversation';
    const timestamp = node.timestamp ? new Date(node.timestamp).toLocaleDateString() : '';
    
    return `### ${title}${timestamp ? ` (${timestamp})` : ''}\n${node.content}\n\n`;
  }

  /**
   * Format document node for context
   */
  private formatDocumentNode(node: ContextNode): string {
    const title = node.title || 'Document';
    const source = node.metadata?.chunkType || 'Unknown';
    
    return `### ${title} (${source})\n${node.content}\n\n`;
  }

  /**
   * Format code node for context
   */
  private formatCodeNode(node: ContextNode): string {
    const title = node.title || 'Code';
    const language = node.metadata?.chunkType || 'text';
    
    return `### ${title}\n\`\`\`${language}\n${node.content}\n\`\`\`\n\n`;
  }

  /**
   * Format metadata node for context
   */
  private formatMetadataNode(node: ContextNode): string {
    const title = node.title || 'Context';
    return `### ${title}\n${node.content}\n\n`;
  }

  /**
   * Group nodes by their type for organized formatting
   */
  private groupNodesByType(nodes: ContextNode[]): {
    conversation: ContextNode[];
    document: ContextNode[];
    code: ContextNode[];
    metadata: ContextNode[];
  } {
    const groups = {
      conversation: [] as ContextNode[],
      document: [] as ContextNode[],
      code: [] as ContextNode[],
      metadata: [] as ContextNode[]
    };

    for (const node of nodes) {
      const nodeType = node.metadata?.chunkType || 'metadata';
      
      switch (nodeType) {
        case 'conversation':
          groups.conversation.push(node);
          break;
        case 'document':
        case 'markdown':
          groups.document.push(node);
          break;
        case 'code':
        case 'javascript':
        case 'typescript':
        case 'python':
          groups.code.push(node);
          break;
        default:
          groups.metadata.push(node);
      }
    }

    return groups;
  }

  /**
   * Calculate node score based on priority
   */
  private calculateNodeScore(node: ContextNode, analysis: PromptAnalysis, priority: string): number {
    let score = 0;

    // Base importance score
    score += node.importance || 0;

    // Priority-based scoring
    switch (priority) {
      case 'relevance':
        score += (node.importance || 0) * 2;
        break;
      case 'recency':
        const daysSinceCreation = node.timestamp ? 
          (Date.now() - new Date(node.timestamp).getTime()) / (1000 * 60 * 60 * 24) : 30;
        score += Math.max(0, 1 - (daysSinceCreation / 30)) * 2;
        break;
      case 'importance':
        score += (node.importance || 0.5) * 2;
        break;
    }

    // Boost score for matching keywords
    const content = node.content.toLowerCase();
    const keywordMatches = analysis.keywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    ).length;
    score += keywordMatches * 0.3;

    // Boost score for matching entities
    const entityMatches = analysis.entities.filter(entity => 
      content.includes(entity.toLowerCase())
    ).length;
    score += entityMatches * 0.5;

    return Math.min(1, score); // Cap at 1
  }

  /**
   * Parse JSON from markdown-formatted AI response
   */
  private parseJsonFromMarkdown(response: string): any {
    try {
      // First try to parse as direct JSON
      return JSON.parse(response);
    } catch (error) {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (parseError) {
          console.warn('Failed to parse JSON from markdown:', parseError);
        }
      }
      
      // If all else fails, try to find JSON object in the response
      const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch && jsonObjectMatch[0]) {
        try {
          return JSON.parse(jsonObjectMatch[0]);
        } catch (parseError) {
          console.warn('Failed to parse JSON object:', parseError);
        }
      }
      
      // Return empty object as fallback
      return {};
    }
  }

  /**
   * Fallback keyword extraction
   */
  private extractKeywordsFallback(prompt: string): string[] {
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'where', 'much', 'some', 'very', 'when', 'here', 'just', 'into', 'over', 'think', 'back', 'then', 'them', 'these', 'want', 'been', 'good', 'many', 'some', 'time', 'very', 'when', 'much', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word));
    
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4); // Rough approximation: 4 chars per token
  }

  /**
   * Truncate content to fit within token limit
   */
  private truncateToTokenLimit(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // Rough approximation
    if (content.length <= maxChars) return content;
    
    // Try to truncate at sentence boundary
    const truncated = content.substring(0, maxChars);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxChars * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(selectedNodes: ContextNode[], totalAvailable: number): number {
    if (selectedNodes.length === 0) return 0;
    
    const avgImportance = selectedNodes.reduce((sum, node) => sum + (node.importance || 0), 0) / selectedNodes.length;
    const coverage = Math.min(1, selectedNodes.length / Math.max(1, totalAvailable));
    
    return (avgImportance * 0.7) + (coverage * 0.3);
  }
}

