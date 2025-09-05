// @ts-nocheck
import { ContextNode, ContextGraph, GraphEdge } from '../types'
import { logger } from '../utils/logger'

export interface SearchResult {
  node: ContextNode
  relevanceScore: number
  path: string[] // Path taken to reach this node
  contextWindow?: string // Pre-built context window if applicable
}

export interface TraversalPath {
  nodes: ContextNode[]
  edges: GraphEdge[]
  totalRelevance: number
  pathLength: number
}

export interface SearchOptions {
  maxResults?: number
  maxDepth?: number
  minRelevance?: number
  includeContext?: boolean
  maxContextTokens?: number
}

export class GraphSearchEngine {
  private readonly defaultMaxResults = 10
  private readonly defaultMaxDepth = 3
  private readonly defaultMinRelevance = 0.1
  private readonly defaultMaxContextTokens = 4000

  /**
   * Search the context graph for relevant nodes
   */
  async searchGraph(
    query: string, 
    graph: ContextGraph, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      logger.info(`Starting graph search for query: "${query}"`)
      
      const {
        maxResults = this.defaultMaxResults,
        maxDepth = this.defaultMaxDepth,
        minRelevance = this.defaultMinRelevance,
        includeContext = false,
        maxContextTokens = this.defaultMaxContextTokens
      } = options

      // Find initial seed nodes with high relevance
      const seedNodes = this.findSeedNodes(query, graph.nodes)
      
      if (seedNodes.length === 0) {
        logger.warn('No seed nodes found for query')
        return []
      }

      // Traverse graph from seed nodes
      const traversalPaths = await this.traverseGraph(seedNodes, query, graph, maxDepth)
      
      // Convert traversal paths to search results
      const results = this.convertPathsToResults(traversalPaths, query, minRelevance)
      
      // Rank and limit results
      const rankedResults = this.rankResults(results).slice(0, maxResults)
      
      // Add context windows if requested
      if (includeContext) {
        await this.addContextWindows(rankedResults, maxContextTokens)
      }

      logger.info(`Graph search completed: ${rankedResults.length} results found`)
      return rankedResults

    } catch (error) {
      logger.error('Error in graph search:', error)
      throw error
    }
  }

  /**
   * Find seed nodes that are most relevant to the query
   */
  private findSeedNodes(query: string, nodes: ContextNode[]): ContextNode[] {
    const queryKeywords = this.extractKeywords(query.toLowerCase())
    const scoredNodes: Array<{ node: ContextNode; score: number }> = []

    for (const node of nodes) {
      const relevanceScore = this.calculateRelevance(node, query, queryKeywords)
      if (relevanceScore > 0.1) { // Only consider nodes with some relevance
        scoredNodes.push({ node, score: relevanceScore })
      }
    }

    // Sort by relevance and return top nodes
    return scoredNodes
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Top 5 seed nodes
      .map(item => item.node)
  }

  /**
   * Traverse the graph from seed nodes to find relevant paths
   */
  private async traverseGraph(
    seedNodes: ContextNode[],
    query: string,
    graph: ContextGraph,
    maxDepth: number
  ): Promise<TraversalPath[]> {
    const paths: TraversalPath[] = []
    const visited = new Set<string>()
    const queryKeywords = this.extractKeywords(query.toLowerCase())

    for (const seedNode of seedNodes) {
      const path = await this.traverseFromNode(
        seedNode,
        query,
        queryKeywords,
        graph,
        maxDepth,
        visited,
        [seedNode.id],
        []
      )
      if (path) {
        paths.push(path)
      }
    }

    return paths
  }

  /**
   * Recursively traverse from a specific node
   */
  private async traverseFromNode(
    currentNode: ContextNode,
    query: string,
    queryKeywords: string[],
    graph: ContextGraph,
    remainingDepth: number,
    visited: Set<string>,
    currentPath: string[],
    currentEdges: GraphEdge[]
  ): Promise<TraversalPath | null> {
    if (remainingDepth === 0 || visited.has(currentNode.id)) {
      return null
    }

    visited.add(currentNode.id)
    
    // Find connected nodes
    const connectedEdges = (graph.edges || []).filter(
      edge => edge.source === currentNode.id || edge.target === currentNode.id
    )

    let bestPath: TraversalPath | null = null
    let bestScore = 0

    // Check current node relevance
    const currentRelevance = this.calculateRelevance(currentNode, query, queryKeywords)
    if (currentRelevance > bestScore) {
      bestPath = {
        nodes: [currentNode],
        edges: currentEdges,
        totalRelevance: currentRelevance,
        pathLength: currentPath.length
      }
      bestScore = currentRelevance
    }

    // Explore connected nodes
    for (const edge of connectedEdges) {
      const nextNodeId = edge.source === currentNode.id ? edge.target : edge.source
      const nextNode = (graph.nodes || []).find(n => n.id === nextNodeId)
      
      if (!nextNode || visited.has(nextNodeId)) continue

      const newPath = [...currentPath, nextNodeId]
      const newEdges = [...currentEdges, edge]

      const subPath = await this.traverseFromNode(
        nextNode,
        query,
        queryKeywords,
        graph,
        remainingDepth - 1,
        new Set(visited), // Create new visited set for this branch
        newPath,
        newEdges
      )

      if (subPath && subPath.totalRelevance > bestScore) {
        bestPath = subPath
        bestScore = subPath.totalRelevance
      }
    }

    return bestPath
  }

  /**
   * Calculate relevance score for a node based on query
   */
  private calculateRelevance(node: ContextNode, query: string, queryKeywords: string[]): number {
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

    // Boost score for important nodes
    if (node.importance && node.importance > 0.7) {
      score *= 1.2
    }

    return Math.min(score, 1.0) // Cap at 1.0
  }

  /**
   * Calculate text relevance based on keyword matching
   */
  private calculateTextRelevance(text: string, queryKeywords: string[]): number {
    if (!text || queryKeywords.length === 0) return 0

    let matches = 0
    let totalWeight = 0

    for (const keyword of queryKeywords) {
      const weight = keyword.length // Longer keywords get more weight
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
      .filter(word => word.length > 2) // Filter out short words
      .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
      .filter(word => word.length > 0)
  }

  /**
   * Convert traversal paths to search results
   */
  private convertPathsToResults(
    paths: TraversalPath[],
    query: string,
    minRelevance: number
  ): SearchResult[] {
    const results: SearchResult[] = []
    const seenNodes = new Set<string>()

    for (const path of paths) {
      for (const node of path.nodes) {
        if (seenNodes.has(node.id)) continue
        
        const relevanceScore = this.calculateRelevance(node, query, this.extractKeywords(query.toLowerCase()))
        
        if (relevanceScore >= minRelevance) {
          results.push({
            node,
            relevanceScore,
            path: path.nodes.map(n => n.id)
          })
          seenNodes.add(node.id)
        }
      }
    }

    return results
  }

  /**
   * Rank search results by relevance and other factors
   */
  private rankResults(results: SearchResult[]): SearchResult[] {
    return results.sort((a, b) => {
      // Primary sort by relevance score
      if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.01) {
        return b.relevanceScore - a.relevanceScore
      }

      // Secondary sort by node importance
      const aImportance = a.node.importance || 0
      const bImportance = b.node.importance || 0
      if (Math.abs(aImportance - bImportance) > 0.01) {
        return bImportance - aImportance
      }

      // Tertiary sort by path length (shorter paths preferred)
      return a.path.length - b.path.length
    })
  }

  /**
   * Add context windows to search results
   */
  private async addContextWindows(results: SearchResult[], maxTokens: number): Promise<void> {
    for (const result of results) {
      try {
        // Simple context window - just the node content for now
        // This will be enhanced with ContextWindowManager in the next step
        result.contextWindow = result.node.content.substring(0, maxTokens * 4) // Rough token estimation
      } catch (error) {
        logger.warn(`Failed to add context window for node ${result.node.id}:`, error)
      }
    }
  }

  /**
   * Search for nodes by specific criteria
   */
  async searchByCriteria(
    criteria: {
      keywords?: string[]
      nodeTypes?: string[]
      minImportance?: number
      dateRange?: { start: Date; end: Date }
    },
    graph: ContextGraph
  ): Promise<ContextNode[]> {
    let results = graph.nodes

    // Filter by keywords
    if (criteria.keywords && criteria.keywords.length > 0) {
      results = results.filter(node => {
        const nodeText = `${node.title || ''} ${node.content} ${node.summary || ''}`.toLowerCase()
        return criteria.keywords!.some(keyword => 
          nodeText.includes(keyword.toLowerCase())
        )
      })
    }

    // Filter by node types
    if (criteria.nodeTypes && criteria.nodeTypes.length > 0) {
      results = results.filter(node => 
        criteria.nodeTypes!.includes(node.metadata?.chunkType || 'unknown')
      )
    }

    // Filter by importance
    if (criteria.minImportance !== undefined) {
      results = results.filter(node => 
        (node.importance || 0) >= criteria.minImportance!
      )
    }

    // Filter by date range
    if (criteria.dateRange) {
      results = results.filter(node => {
        const nodeDate = new Date(node.timestamp || node.createdAt)
        return nodeDate >= criteria.dateRange!.start && nodeDate <= criteria.dateRange!.end
      })
    }

    return results
  }
}
