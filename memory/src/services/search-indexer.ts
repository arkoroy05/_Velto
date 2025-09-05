// @ts-nocheck
import { ContextNode } from '../types'
import { databaseService } from './database'
import { logger } from '../utils/logger'

export interface SearchIndex {
  nodeId: string
  content: string
  title: string
  summary: string
  keywords: string[]
  embeddings: number[]
  metadata: {
    chunkType: string
    importance: number
    timestamp: Date
    originalContextId: string
  }
  textIndex: {
    searchableText: string
    weightedText: string
  }
}

export interface SearchResult {
  node: ContextNode
  score: number
  matchType: 'text' | 'semantic' | 'hybrid'
  highlights?: string[]
}

export interface SearchOptions {
  limit?: number
  offset?: number
  minScore?: number
  includeHighlights?: boolean
  searchType?: 'text' | 'semantic' | 'hybrid'
}

export class SearchIndexer {
  private readonly collectionName = 'searchIndex'
  private readonly textIndexFields = ['title', 'content', 'summary', 'keywords'] as const
  private readonly weightedFields = {
    title: 10,
    summary: 5,
    keywords: 3,
    content: 1
  }

  /**
   * Initialize search indexes
   */
  async initializeIndexes(): Promise<void> {
    try {
      logger.info('Initializing search indexes...')
      
      const collection = databaseService.getCollection(this.collectionName)
      
      // Create text index for full-text search
      await collection.createIndex({
        'textIndex.searchableText': 'text',
        'textIndex.weightedText': 'text'
      }, {
        name: 'text_search_index',
        weights: {
          'textIndex.weightedText': 10,
          'textIndex.searchableText': 1
        },
        default_language: 'english'
      })

      // Create compound index for metadata filtering
      await collection.createIndex({
        'metadata.chunkType': 1,
        'metadata.importance': -1,
        'metadata.timestamp': -1
      }, {
        name: 'metadata_filter_index'
      })

      // Create index for embeddings (for vector search)
      await collection.createIndex({
        'embeddings': '2dsphere'
      }, {
        name: 'embeddings_vector_index',
        sparse: true
      })

      // Create index for original context lookup
      await collection.createIndex({
        'metadata.originalContextId': 1
      }, {
        name: 'context_lookup_index'
      })

      logger.info('Search indexes initialized successfully')
    } catch (error) {
      logger.error('Error initializing search indexes:', error)
      throw error
    }
  }

  /**
   * Index a context node for search
   */
  async indexNode(node: ContextNode): Promise<void> {
    try {
      const searchIndex: SearchIndex = {
        nodeId: node.id,
        content: node.content,
        title: (node as any).title || '',
        summary: node.summary || '',
        keywords: node.keywords || [],
        embeddings: node.embeddings || [],
        metadata: {
          chunkType: node.metadata?.chunkType || 'unknown',
          importance: node.importance || 0,
          timestamp: new Date(node.timestamp || node.createdAt),
          originalContextId: String((node as any).metadata?.originalContextId || '')
        },
        textIndex: {
          searchableText: this.buildSearchableText(node),
          weightedText: this.buildWeightedText(node)
        }
      }

      const collection = databaseService.getCollection(this.collectionName)
      await collection.replaceOne(
        { nodeId: node.id },
        searchIndex,
        { upsert: true }
      )

      logger.debug(`Indexed node: ${node.id}`)
    } catch (error) {
      logger.error(`Error indexing node ${node.id}:`, error)
      throw error
    }
  }

  /**
   * Index multiple nodes in batch
   */
  async indexNodes(nodes: ContextNode[]): Promise<void> {
    try {
      logger.info(`Indexing ${nodes.length} nodes in batch...`)
      
      const collection = databaseService.getCollection(this.collectionName)
      const operations = nodes.map(node => {
        const searchIndex: SearchIndex = {
          nodeId: node.id,
          content: node.content,
          title: (node as any).title || '',
          summary: node.summary || '',
          keywords: node.keywords || [],
          embeddings: node.embeddings || [],
          metadata: {
            chunkType: node.metadata?.chunkType || 'unknown',
            importance: node.importance || 0,
            timestamp: new Date(node.timestamp || node.createdAt),
            originalContextId: String((node as any).metadata?.originalContextId || '')
          },
          textIndex: {
            searchableText: this.buildSearchableText(node),
            weightedText: this.buildWeightedText(node)
          }
        }

        return {
          replaceOne: {
            filter: { nodeId: node.id },
            replacement: searchIndex,
            upsert: true
          }
        }
      })

      await collection.bulkWrite(operations)
      logger.info(`Successfully indexed ${nodes.length} nodes`)
    } catch (error) {
      logger.error('Error batch indexing nodes:', error)
      throw error
    }
  }

  /**
   * Remove node from search index
   */
  async removeNode(nodeId: string): Promise<void> {
    try {
      const collection = databaseService.getCollection(this.collectionName)
      await collection.deleteOne({ nodeId })
      logger.debug(`Removed node from index: ${nodeId}`)
    } catch (error) {
      logger.error(`Error removing node ${nodeId} from index:`, error)
      throw error
    }
  }

  /**
   * Perform text search
   */
  async textSearch(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        limit = 10,
        offset = 0,
        minScore = 0.1,
        includeHighlights = true
      } = options

      const collection = databaseService.getCollection(this.collectionName)
      
      // Perform MongoDB text search
      const cursor = collection.find({ $text: { $search: query } }).sort({ score: { $meta: 'textScore' } }).limit(limit + offset)

      const results = await cursor.toArray()
      
      // Filter by minimum score and apply offset
      const filteredResults = results
        .filter((result: any) => result.score >= minScore)
        .slice(offset, offset + limit)

      // Convert to SearchResult format
      const searchResults: SearchResult[] = []
      for (const result of filteredResults) {
        const node = await this.getNodeById(result.nodeId)
        if (!node) continue
        const entry: SearchResult = {
          node,
          score: (result as any).score || 0,
          matchType: 'text'
        }
        if (includeHighlights) {
          entry.highlights = this.generateHighlights(node, query)
        }
        searchResults.push(entry)
      }
      return searchResults
    } catch (error) {
      logger.error('Error performing text search:', error)
      throw error
    }
  }

  /**
   * Perform semantic search using embeddings
   */
  async semanticSearch(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        limit = 10,
        offset = 0,
        minScore = 0.1
      } = options

      const collection = databaseService.getCollection(this.collectionName)
      
      // Find nodes with embeddings
      const nodes = await collection.find({
        'embeddings': { $exists: true, $ne: [] }
      }).toArray()

      // Calculate cosine similarity for each node
      const scoredNodes = nodes
        .map((node: any) => {
          const similarity = this.calculateCosineSimilarity(queryEmbedding, node.embeddings)
          return {
            nodeId: node.nodeId,
            score: similarity
          }
        })
        .filter(item => item.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(offset, offset + limit)

      // Convert to SearchResult format
      const searchResults: SearchResult[] = []
      for (const item of scoredNodes) {
        const node = await this.getNodeById(item.nodeId)
        if (!node) continue
        searchResults.push({ node, score: item.score, matchType: 'semantic' })
      }
      return searchResults
    } catch (error) {
      logger.error('Error performing semantic search:', error)
      throw error
    }
  }

  /**
   * Perform hybrid search (combines text and semantic search)
   */
  async hybridSearch(
    query: string,
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        limit = 10,
        offset = 0,
        minScore = 0.1
      } = options

      // Perform both text and semantic search
      const [textResults, semanticResults] = await Promise.all([
        this.textSearch(query, { limit: limit * 2, minScore: 0.05 }),
        this.semanticSearch(queryEmbedding, { limit: limit * 2, minScore: 0.05 })
      ])

      // Combine and deduplicate results
      const combinedResults = new Map<string, SearchResult>()

      // Add text search results with weight 0.6
      for (const result of textResults) {
        const existing = combinedResults.get(result.node.id)
        if (existing) {
          existing.score = Math.max(existing.score, result.score * 0.6)
        } else {
          combinedResults.set(result.node.id, {
            ...result,
            score: result.score * 0.6,
            matchType: 'hybrid'
          })
        }
      }

      // Add semantic search results with weight 0.4
      for (const result of semanticResults) {
        const existing = combinedResults.get(result.node.id)
        if (existing) {
          existing.score += result.score * 0.4
        } else {
          combinedResults.set(result.node.id, {
            ...result,
            score: result.score * 0.4,
            matchType: 'hybrid'
          })
        }
      }

      // Sort by combined score and apply limits
      const finalResults = Array.from(combinedResults.values())
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(offset, offset + limit)

      return finalResults
    } catch (error) {
      logger.error('Error performing hybrid search:', error)
      throw error
    }
  }

  /**
   * Search with filters
   */
  async searchWithFilters(
    query: string,
    filters: {
      chunkTypes?: string[]
      minImportance?: number
      dateRange?: { start: Date; end: Date }
      originalContextIds?: string[]
    },
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const {
        limit = 10,
        offset = 0,
        searchType = 'text'
      } = options

      const collection = databaseService.getCollection(this.collectionName)
      
      // Build filter query
      const filterQuery: any = {}
      
      if (filters.chunkTypes && filters.chunkTypes.length > 0) {
        filterQuery['metadata.chunkType'] = { $in: filters.chunkTypes }
      }
      
      if (filters.minImportance !== undefined) {
        filterQuery['metadata.importance'] = { $gte: filters.minImportance }
      }
      
      if (filters.dateRange) {
        filterQuery['metadata.timestamp'] = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        }
      }
      
      if (filters.originalContextIds && filters.originalContextIds.length > 0) {
        filterQuery['metadata.originalContextId'] = { $in: filters.originalContextIds }
      }

      // Add text search to filter query
      if (query) {
        filterQuery.$text = { $search: query }
      }

      // Execute search
      const cursor = collection.find(filterQuery).sort({ score: { $meta: 'textScore' } }).limit(limit + offset)

      const results = await cursor.toArray()
      
      // Convert to SearchResult format
      const searchResults: SearchResult[] = []
      for (const result of results.slice(offset, offset + limit)) {
        const node = await this.getNodeById((result as any).nodeId)
        if (!node) continue
        searchResults.push({ node, score: (result as any).score || 0, matchType: searchType as any })
      }
      return searchResults
    } catch (error) {
      logger.error('Error performing filtered search:', error)
      throw error
    }
  }

  /**
   * Build searchable text from node
   */
  private buildSearchableText(node: ContextNode): string {
    const parts = [
      node.title || '',
      node.content,
      node.summary || '',
      ...(node.keywords || [])
    ]
    
    return parts.join(' ').toLowerCase()
  }

  /**
   * Build weighted text for better search relevance
   */
  private buildWeightedText(node: ContextNode): string {
    const parts: string[] = []
    
    // Repeat title multiple times for higher weight
    if (node.title) {
      parts.push(...Array(this.weightedFields.title).fill(node.title))
    }
    
    // Repeat summary multiple times
    if (node.summary) {
      parts.push(...Array(this.weightedFields.summary).fill(node.summary))
    }
    
    // Repeat keywords multiple times
    if (node.keywords && node.keywords.length > 0) {
      const keywordText = node.keywords.join(' ')
      parts.push(...Array(this.weightedFields.keywords).fill(keywordText))
    }
    
    // Add content once
    parts.push(node.content)
    
    return parts.join(' ').toLowerCase()
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Generate highlights for search results
   */
  private generateHighlights(node: ContextNode, query: string): string[] {
    const highlights: string[] = []
    const queryWords = query.toLowerCase().split(/\s+/)
    
    // Highlight in title
    if (node.title) {
      const titleHighlight = this.highlightText(node.title, queryWords)
      if (titleHighlight !== node.title) {
        highlights.push(`Title: ${titleHighlight}`)
      }
    }
    
    // Highlight in content (first 200 chars)
    const contentPreview = node.content.substring(0, 200)
    const contentHighlight = this.highlightText(contentPreview, queryWords)
    if (contentHighlight !== contentPreview) {
      highlights.push(`Content: ${contentHighlight}...`)
    }
    
    return highlights
  }

  /**
   * Highlight query words in text
   */
  private highlightText(text: string, queryWords: string[]): string {
    let highlighted = text
    
    for (const word of queryWords) {
      if (word.length > 2) {
        const regex = new RegExp(`\\b(${word})\\b`, 'gi')
        highlighted = highlighted.replace(regex, '**$1**')
      }
    }
    
    return highlighted
  }

  /**
   * Get node by ID from database
   */
  private async getNodeById(nodeId: string): Promise<ContextNode | null> {
    try {
      const collection = databaseService.getCollection('contextNodes')
      const node = await collection.findOne({ id: nodeId })
      return node as ContextNode | null
    } catch (error) {
      logger.error(`Error getting node ${nodeId}:`, error)
      return null
    }
  }

  /**
   * Clear all search indexes
   */
  async clearIndexes(): Promise<void> {
    try {
      const collection = databaseService.getCollection(this.collectionName)
      await collection.deleteMany({})
      logger.info('Search indexes cleared')
    } catch (error) {
      logger.error('Error clearing search indexes:', error)
      throw error
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{
    totalIndexed: number
    averageEmbeddings: number
    indexSize: number
  }> {
    try {
      const collection = databaseService.getCollection(this.collectionName)
      
      const totalIndexed = await collection.countDocuments()
      
      const embeddingStats = await collection.aggregate([
        { $match: { 'embeddings': { $exists: true, $ne: [] } } },
        { $group: { _id: null, avgLength: { $avg: { $size: '$embeddings' } } } }
      ]).toArray()
      
      const averageEmbeddings = embeddingStats.length > 0 ? embeddingStats[0].avgLength : 0
      
      // Get collection stats for size estimation
      const indexSize = 0
      
      return {
        totalIndexed,
        averageEmbeddings,
        indexSize
      }
    } catch (error) {
      logger.error('Error getting index stats:', error)
      throw error
    }
  }
}
