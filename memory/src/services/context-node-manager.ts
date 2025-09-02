import { ObjectId } from 'mongodb'
import { databaseService } from './database'
import { Context, ContextNode, ChunkingStrategy } from '../types'
import { SmartChunker } from './smart-chunker'
import { logger } from '../utils/logger'

/**
 * Service for managing ContextNodes - the chunked, optimized version of contexts
 * This service handles the conversion from regular contexts to ContextNodes
 * and manages their relationships and metadata
 */
export class ContextNodeManager {
  private collection = databaseService.getCollection<ContextNode>('contextNodes')
  private smartChunker = new SmartChunker()

  /**
   * Convert a context to ContextNodes using smart chunking
   */
  async convertContextToNodes(
    context: Context, 
    strategy?: ChunkingStrategy
  ): Promise<ContextNode[]> {
    try {
      logger.info(`Converting context ${context._id} to ContextNodes`)
      
      // Check if content is large enough to warrant chunking
      if (!this.shouldChunkContext(context)) {
        logger.info(`Context ${context._id} is small enough, creating single node`)
        return [await this.createSingleNode(context)]
      }
      
      // Use smart chunking to break down the content
      const chunkingResult = await this.smartChunker.chunkContent(
        context.content || '', 
        strategy
      )
      
      // Convert chunks to ContextNodes
      const contextNodes = await this.smartChunker.convertToContextNodes(
        chunkingResult.chunks, 
        context
      )
      
      // Store the ContextNodes in the database
      const storedNodes = await this.storeContextNodes(contextNodes)
      
      logger.info(`Successfully converted context ${context._id} to ${storedNodes.length} ContextNodes`)
      
      return storedNodes
    } catch (error) {
      logger.error('Error converting context to ContextNodes:', error)
      throw new Error(`Failed to convert context to ContextNodes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Determine if a context should be chunked
   */
  private shouldChunkContext(context: Context): boolean {
    const content = context.content || ''
    const estimatedTokens = this.estimateTokenCount(content)
    
    logger.info(`Context content length: ${content.length}, estimated tokens: ${estimatedTokens}`)
    
    // Chunk if content is larger than 4000 tokens
    return estimatedTokens > 4000
  }

  /**
   * Estimate token count more accurately
   */
  private estimateTokenCount(content: string): number {
    if (!content) return 0
    
    // Count words (more accurate than character count)
    const words = content.trim().split(/\s+/).filter(word => word.length > 0)
    const wordCount = words.length
    
    // Count code blocks and markdown (these add complexity)
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length
    const markdownHeaders = (content.match(/^#{1,6}\s+/gm) || []).length
    const markdownLists = (content.match(/^[-*+]\s+/gm) || []).length
    
    // Base token estimation: ~2.5 tokens per word (more realistic for complex content)
    let estimatedTokens = Math.ceil(wordCount * 2.5)
    
    // Add tokens for code blocks (code is more token-dense)
    estimatedTokens += codeBlocks * 100
    
    // Add tokens for markdown formatting
    estimatedTokens += markdownHeaders * 20
    estimatedTokens += markdownLists * 10
    
    // Add tokens for special characters and formatting
    const specialChars = (content.match(/[^\w\s]/g) || []).length
    estimatedTokens += Math.ceil(specialChars * 1.0)
    
    // Add tokens for paragraph breaks and structure
    const paragraphs = (content.match(/\n\s*\n/g) || []).length
    estimatedTokens += paragraphs * 15
    
    // Add tokens for sentence complexity
    const sentences = (content.match(/[.!?]+/g) || []).length
    estimatedTokens += sentences * 5
    
    return estimatedTokens
  }

  /**
   * Create a single ContextNode for small contexts
   */
  private async createSingleNode(context: Context): Promise<ContextNode> {
    const content = context.content || ''
    const estimatedTokens = this.estimateTokenCount(content)
    
    const contextNodeData: any = {
      id: `${context._id}_node_0`,
      content: content,
      tokenCount: estimatedTokens,
      importance: this.calculateContextImportance(context),
      timestamp: context.createdAt,
      childNodeIds: [],
      embeddings: [], // Will be generated later
      summary: this.generateContextSummary(content),
      keywords: this.extractContextKeywords(context),
      relationships: [],
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
      metadata: {
        chunkIndex: 0,
        totalChunks: 1,
        originalContextId: context._id!,
        chunkType: this.determineContextType(context),
        isOptimized: false
      }
    }
    
    // Only add parentNodeId if it exists
    if (context._id) {
      contextNodeData.parentNodeId = context._id
    }
    
    const contextNode: ContextNode = contextNodeData
    
    // Store the node
    const result = await this.collection.insertOne(contextNode)
    contextNode._id = result.insertedId
    
    return contextNode
  }

  /**
   * Store ContextNodes in the database
   */
  private async storeContextNodes(contextNodes: ContextNode[]): Promise<ContextNode[]> {
    try {
      const results = await this.collection.insertMany(contextNodes)
      
      // Update the nodes with their database IDs
      const storedNodes = contextNodes.map((node, index) => {
        const storedNode = { ...node }
        if (results.insertedIds[index]) {
          storedNode._id = results.insertedIds[index]
        }
        return storedNode
      })
      
      logger.info(`Stored ${storedNodes.length} ContextNodes in database`)
      
      return storedNodes
    } catch (error) {
      logger.error('Error storing ContextNodes:', error)
      throw new Error(`Failed to store ContextNodes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Calculate importance score for a context
   */
  private calculateContextImportance(context: Context): number {
    let importance = 0.5 // Base importance
    
    // Higher importance for certain types
    if (context.type === 'code') importance += 0.2
    if (context.type === 'documentation') importance += 0.15
    if (context.type === 'research') importance += 0.1
    
    // Higher importance for high complexity
    if (context.metadata?.complexity === 'high') importance += 0.1
    
    // Higher importance for high urgency
    if (context.metadata?.urgency === 'high') importance += 0.1
    
    // Higher importance for high importance
    if (context.metadata?.importance === 'high') importance += 0.1
    
    return Math.min(importance, 1.0)
  }

  /**
   * Generate a summary for a context
   */
  private generateContextSummary(content: string): string {
    if (content.length <= 150) return content
    
    // Try to find a good breaking point (end of sentence)
    const sentences = content.split(/[.!?]+/)
    let summary = ''
    
    for (const sentence of sentences) {
      if ((summary + sentence).length <= 150) {
        summary += sentence + '. '
      } else {
        break
      }
    }
    
    return summary.trim() || content.substring(0, 150).trim() + '...'
  }

  /**
   * Extract keywords from a context
   */
  private extractContextKeywords(context: Context): string[] {
    const keywords: string[] = []
    
    // Add tags as keywords
    if (context.tags && context.tags.length > 0) {
      keywords.push(...context.tags)
    }
    
    // Extract keywords from content
    const content = context.content || ''
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
    
    const wordCounts = new Map<string, number>()
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    })
    
    // Get top 5 most frequent words
    const topWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, _]) => word)
    
    keywords.push(...topWords)
    
    // Remove duplicates and limit to 10 keywords
    return [...new Set(keywords)].slice(0, 10)
  }

  /**
   * Determine the type of a context
   */
  private determineContextType(context: Context): string {
    const content = context.content || ''
    
    if (content.includes('```') || content.includes('function') || content.includes('class')) {
      return 'code'
    } else if (content.includes('#') || content.includes('**') || content.includes('[')) {
      return 'markdown'
    } else if (content.includes('http') || content.includes('www.')) {
      return 'web_content'
    } else if (context.type === 'conversation') {
      return 'conversation'
    } else if (context.type === 'meeting') {
      return 'meeting'
    } else {
      return 'text'
    }
  }

  /**
   * Get ContextNodes for a specific context
   */
  async getContextNodes(contextId: ObjectId): Promise<ContextNode[]> {
    try {
      const nodes = await this.collection
        .find({ 'metadata.originalContextId': contextId })
        .sort({ 'metadata.chunkIndex': 1 })
        .toArray()
      
      return nodes
    } catch (error) {
      logger.error('Error getting ContextNodes:', error)
      throw new Error(`Failed to get ContextNodes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a specific ContextNode by ID
   */
  async getContextNode(nodeId: ObjectId): Promise<ContextNode | null> {
    try {
      return await this.collection.findOne({ _id: nodeId })
    } catch (error) {
      logger.error('Error getting ContextNode:', error)
      throw new Error(`Failed to get ContextNode: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update a ContextNode
   */
  async updateContextNode(nodeId: ObjectId, updates: Partial<ContextNode>): Promise<ContextNode | null> {
    try {
      const result = await this.collection.findOneAndUpdate(
        { _id: nodeId },
        { 
          $set: { 
            ...updates, 
            updatedAt: new Date() 
          } 
        },
        { returnDocument: 'after' }
      )
      
      if (result) {
        logger.info(`Updated ContextNode ${nodeId}`)
      }
      
      return result
    } catch (error) {
      logger.error('Error updating ContextNode:', error)
      throw new Error(`Failed to update ContextNode: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete ContextNodes for a specific context
   */
  async deleteContextNodes(contextId: ObjectId): Promise<number> {
    try {
      const result = await this.collection.deleteMany({ 'metadata.originalContextId': contextId })
      
      logger.info(`Deleted ${result.deletedCount} ContextNodes for context ${contextId}`)
      
      return result.deletedCount
    } catch (error) {
      logger.error('Error deleting ContextNodes:', error)
      throw new Error(`Failed to delete ContextNodes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get ContextNodes by project
   */
  async getContextNodesByProject(_projectId: ObjectId): Promise<ContextNode[]> {
    try {
      // This would need to join with the original contexts to get projectId
      // For now, we'll need to implement this differently
      const nodes = await this.collection
        .find({})
        .sort({ createdAt: -1 })
        .limit(100) // Limit for performance
        .toArray()
      
      return nodes
    } catch (error) {
      logger.error('Error getting ContextNodes by project:', error)
      throw new Error(`Failed to get ContextNodes by project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get ContextNodes by type
   */
  async getContextNodesByType(type: string): Promise<ContextNode[]> {
    try {
      const nodes = await this.collection
        .find({ 'metadata.chunkType': type })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()
      
      return nodes
    } catch (error) {
      logger.error('Error getting ContextNodes by type:', error)
      throw new Error(`Failed to get ContextNodes by type: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search ContextNodes by content
   */
  async searchContextNodes(query: string, limit: number = 20): Promise<ContextNode[]> {
    try {
      const nodes = await this.collection
        .find({ 
          $text: { $search: query } 
        })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .toArray()
      
      return nodes
    } catch (error) {
      logger.error('Error searching ContextNodes:', error)
      // Fallback to simple text search if text index is not available
      const nodes = await this.collection
        .find({ 
          content: { $regex: query, $options: 'i' } 
        })
        .limit(limit)
        .toArray()
      
      return nodes
    }
  }

  /**
   * Get statistics about ContextNodes
   */
  async getContextNodeStats(): Promise<{
    totalNodes: number
    nodesByType: Record<string, number>
    averageTokens: number
    totalTokens: number
  }> {
    try {
      const totalNodes = await this.collection.countDocuments()
      
      // Get nodes by type
      const typeStats = await this.collection.aggregate([
        {
          $group: {
            _id: '$metadata.chunkType',
            count: { $sum: 1 }
          }
        }
      ]).toArray()
      
      const nodesByType: Record<string, number> = {}
      typeStats.forEach(stat => {
        nodesByType[stat['_id'] || 'unknown'] = stat['count']
      })
      
      // Get token statistics
      const tokenStats = await this.collection.aggregate([
        {
          $group: {
            _id: null,
            totalTokens: { $sum: '$tokenCount' },
            averageTokens: { $avg: '$tokenCount' }
          }
        }
      ]).toArray()
      
      const totalTokens = tokenStats[0]?.['totalTokens'] || 0
      const averageTokens = tokenStats[0]?.['averageTokens'] || 0
      
      return {
        totalNodes,
        nodesByType,
        averageTokens: Math.round(averageTokens),
        totalTokens
      }
    } catch (error) {
      logger.error('Error getting ContextNode stats:', error)
      throw new Error(`Failed to get ContextNode stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Export lazy-loaded singleton instance
let _contextNodeManager: ContextNodeManager | null = null

export const getContextNodeManager = (): ContextNodeManager => {
  if (!_contextNodeManager) {
    _contextNodeManager = new ContextNodeManager()
  }
  return _contextNodeManager
}

export const contextNodeManager = new Proxy({} as ContextNodeManager, {
  get(_target, prop) {
    const instance = getContextNodeManager()
    return instance[prop as keyof ContextNodeManager]
  }
})

export default ContextNodeManager
