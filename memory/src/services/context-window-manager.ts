// @ts-nocheck
import { ContextNode } from '../types'
import { logger } from '../utils/logger'

export interface ContextWindow {
  content: string
  nodes: ContextNode[]
  totalTokens: number
  relevanceScore: number
  metadata: {
    nodeCount: number
    averageRelevance: number
    coverage: number // Percentage of relevant content included
  }
}

export interface ContextWindowOptions {
  maxTokens: number
  minRelevance?: number
  includeMetadata?: boolean
  preserveStructure?: boolean
  addSeparators?: boolean
}

export class ContextWindowManager {
  private readonly defaultMinRelevance = 0.1
  private readonly tokenEstimationRatio = 4 // Rough estimate: 1 token ≈ 4 characters

  /**
   * Build an optimal context window from search results
   */
  async buildContextWindow(
    query: string,
    nodes: ContextNode[],
    maxTokens: number,
    options: ContextWindowOptions
  ): Promise<ContextWindow> {
    try {
      logger.info(`Building context window for query: "${query}" with ${nodes.length} nodes, max ${maxTokens} tokens`)

      const {
        minRelevance = this.defaultMinRelevance,
        includeMetadata = true,
        preserveStructure = true,
        addSeparators = true
      } = options

      // Prioritize nodes by relevance to query
      const prioritizedNodes = this.prioritizeNodes(nodes, query)
      
      // Filter by minimum relevance
      const relevantNodes = prioritizedNodes.filter(node => 
        this.calculateNodeRelevance(node, query) >= minRelevance
      )

      // Calculate optimal combination that fits within token limit
      const selectedNodes = this.calculateOptimalCombination(relevantNodes, maxTokens, query)

      // Build the context window content
      const content = this.buildContent(selectedNodes, query, {
        includeMetadata,
        preserveStructure,
        addSeparators
      })

      // Calculate metrics
      const totalTokens = this.estimateTokenCount(content)
      const relevanceScore = this.calculateAverageRelevance(selectedNodes, query)
      const coverage = this.calculateCoverage(selectedNodes, relevantNodes)

      const contextWindow: ContextWindow = {
        content,
        nodes: selectedNodes,
        totalTokens,
        relevanceScore,
        metadata: {
          nodeCount: selectedNodes.length,
          averageRelevance: relevanceScore,
          coverage
        }
      }

      logger.info(`Context window built: ${selectedNodes.length} nodes, ${totalTokens} tokens, ${(coverage * 100).toFixed(1)}% coverage`)
      return contextWindow

    } catch (error) {
      logger.error('Error building context window:', error)
      throw error
    }
  }

  /**
   * Prioritize nodes by relevance to the query
   */
  private prioritizeNodes(nodes: ContextNode[], query: string): ContextNode[] {
    const queryKeywords = this.extractKeywords(query.toLowerCase())
    
    return nodes
      .map(node => ({
        node,
        relevance: this.calculateNodeRelevance(node, query, queryKeywords)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .map(item => item.node)
  }

  /**
   * Calculate optimal combination of nodes that fits within token limit
   */
  private calculateOptimalCombination(
    nodes: ContextNode[],
    maxTokens: number,
    query: string
  ): ContextNode[] {
    const selectedNodes: ContextNode[] = []
    let currentTokens = 0
    const queryKeywords = this.extractKeywords(query.toLowerCase())

    // Use a greedy approach with relevance-weighted selection
    for (const node of nodes) {
      const nodeTokens = this.estimateTokenCount(node.content)
      const relevance = this.calculateNodeRelevance(node, query, queryKeywords)
      
      // Calculate value-to-cost ratio (relevance per token)
      const valueRatio = relevance / nodeTokens
      
      // Check if adding this node would exceed token limit
      if (currentTokens + nodeTokens <= maxTokens) {
        selectedNodes.push(node)
        currentTokens += nodeTokens
      } else {
        // Check if this node has high enough value to replace a lower-value node
        const canReplace = this.tryReplaceLowerValueNode(
          selectedNodes,
          node,
          nodeTokens,
          valueRatio,
          maxTokens,
          query,
          queryKeywords
        )
        
        if (canReplace) {
          currentTokens = this.recalculateTokens(selectedNodes)
        }
      }
    }

    return selectedNodes
  }

  /**
   * Try to replace a lower-value node with a higher-value one
   */
  private tryReplaceLowerValueNode(
    selectedNodes: ContextNode[],
    newNode: ContextNode,
    newNodeTokens: number,
    newValueRatio: number,
    maxTokens: number,
    query: string,
    queryKeywords: string[]
  ): boolean {
    // Find the node with the lowest value ratio that we could replace
    let lowestValueIndex = -1
    let lowestValueRatio = Infinity
    let lowestValueTokens = 0

    for (let i = 0; i < selectedNodes.length; i++) {
      const node = selectedNodes[i]
      const nodeTokens = this.estimateTokenCount(node.content)
      const relevance = this.calculateNodeRelevance(node, query, queryKeywords)
      const valueRatio = relevance / nodeTokens

      if (valueRatio < lowestValueRatio) {
        lowestValueIndex = i
        lowestValueRatio = valueRatio
        lowestValueTokens = nodeTokens
      }
    }

    // If the new node has a better value ratio and fits, replace it
    if (lowestValueIndex >= 0 && 
        newValueRatio > lowestValueRatio && 
        (this.recalculateTokens(selectedNodes) - lowestValueTokens + newNodeTokens) <= maxTokens) {
      
      selectedNodes[lowestValueIndex] = newNode
      return true
    }

    return false
  }

  /**
   * Build the final content string from selected nodes
   */
  private buildContent(
    nodes: ContextNode[],
    query: string,
    options: {
      includeMetadata: boolean
      preserveStructure: boolean
      addSeparators: boolean
    }
  ): string {
    const { includeMetadata, preserveStructure, addSeparators } = options
    const parts: string[] = []

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      
      if (addSeparators && i > 0) {
        parts.push('\n---\n')
      }

      // Add node title if available
      if (node.title && node.title !== 'Untitled Context') {
        parts.push(`## ${node.title}\n`)
      }

      // Add metadata if requested
      if (includeMetadata) {
        const metadata = []
        if (node.metadata?.chunkType) {
          metadata.push(`Type: ${node.metadata.chunkType}`)
        }
        if (node.importance) {
          metadata.push(`Importance: ${(node.importance * 100).toFixed(1)}%`)
        }
        if (metadata.length > 0) {
          parts.push(`*${metadata.join(' | ')}*\n`)
        }
      }

      // Add content
      if (preserveStructure) {
        parts.push(node.content)
      } else {
        // Clean up content for better readability
        const cleanedContent = node.content
          .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
          .trim()
        parts.push(cleanedContent)
      }

      // Add summary if available and different from content
      if (node.summary && 
          node.summary !== node.content && 
          node.summary.length < node.content.length * 0.8) {
        parts.push(`\n*Summary: ${node.summary}*`)
      }
    }

    return parts.join('\n').trim()
  }

  /**
   * Calculate relevance score for a node
   */
  private calculateNodeRelevance(
    node: ContextNode, 
    query: string, 
    queryKeywords?: string[]
  ): number {
    if (!queryKeywords) {
      queryKeywords = this.extractKeywords(query.toLowerCase())
    }

    let score = 0

    // Title relevance (highest weight)
    if (node.title) {
      const titleScore = this.calculateTextRelevance(node.title.toLowerCase(), queryKeywords)
      score += titleScore * 0.4
    }

    // Content relevance
    const contentScore = this.calculateTextRelevance(node.content.toLowerCase(), queryKeywords)
    score += contentScore * 0.3

    // Summary relevance
    if (node.summary) {
      const summaryScore = this.calculateTextRelevance(node.summary.toLowerCase(), queryKeywords)
      score += summaryScore * 0.2
    }

    // Keywords relevance
    if (node.keywords && node.keywords.length > 0) {
      const keywordMatches = node.keywords.filter(keyword => 
        queryKeywords.some(qk => keyword.toLowerCase().includes(qk) || qk.includes(keyword.toLowerCase()))
      ).length
      const keywordScore = keywordMatches / Math.max(node.keywords.length, 1)
      score += keywordScore * 0.1
    }

    // Boost for important nodes
    if (node.importance && node.importance > 0.7) {
      score *= 1.2
    }

    return Math.min(score, 1.0)
  }

  /**
   * Calculate text relevance based on keyword matching
   */
  private calculateTextRelevance(text: string, queryKeywords: string[]): number {
    if (!text || queryKeywords.length === 0) return 0

    let matches = 0
    let totalWeight = 0

    for (const keyword of queryKeywords) {
      const weight = keyword.length
      totalWeight += weight
      
      if (text.includes(keyword)) {
        matches += weight
      }
    }

    return totalWeight > 0 ? matches / totalWeight : 0
  }

  /**
   * Extract keywords from query text
   */
  private extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 0)
  }

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / this.tokenEstimationRatio)
  }

  /**
   * Calculate average relevance of selected nodes
   */
  private calculateAverageRelevance(nodes: ContextNode[], query: string): number {
    if (nodes.length === 0) return 0

    const totalRelevance = nodes.reduce((sum, node) => 
      sum + this.calculateNodeRelevance(node, query), 0
    )

    return totalRelevance / nodes.length
  }

  /**
   * Calculate coverage percentage
   */
  private calculateCoverage(selectedNodes: ContextNode[], totalRelevantNodes: ContextNode[]): number {
    if (totalRelevantNodes.length === 0) return 1.0

    const selectedIds = new Set(selectedNodes.map(n => n.id))
    const coveredCount = totalRelevantNodes.filter(n => selectedIds.has(n.id)).length

    return coveredCount / totalRelevantNodes.length
  }

  /**
   * Recalculate total tokens for selected nodes
   */
  private recalculateTokens(nodes: ContextNode[]): number {
    return nodes.reduce((total, node) => total + this.estimateTokenCount(node.content), 0)
  }

  /**
   * Build context window for specific node types
   */
  async buildTypedContextWindow(
    query: string,
    nodes: ContextNode[],
    maxTokens: number,
    nodeType: string
  ): Promise<ContextWindow> {
    const filteredNodes = nodes.filter(node => 
      node.metadata?.chunkType === nodeType
    )

    return this.buildContextWindow(query, filteredNodes, maxTokens, {
      includeMetadata: true,
      preserveStructure: true,
      addSeparators: true
    })
  }

  /**
   * Build context window with time-based prioritization
   */
  async buildTimeBasedContextWindow(
    query: string,
    nodes: ContextNode[],
    maxTokens: number,
    timeWeight: number = 0.3
  ): Promise<ContextWindow> {
    // Sort nodes by recency and relevance
    const now = new Date()
    const sortedNodes = nodes
      .map(node => {
        const relevance = this.calculateNodeRelevance(node, query)
        const age = now.getTime() - new Date(node.timestamp || node.createdAt).getTime()
        const ageScore = Math.max(0, 1 - (age / (365 * 24 * 60 * 60 * 1000))) // Decay over 1 year
        const combinedScore = relevance * (1 - timeWeight) + ageScore * timeWeight
        
        return { node, score: combinedScore }
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.node)

    return this.buildContextWindow(query, sortedNodes, maxTokens)
  }
}
