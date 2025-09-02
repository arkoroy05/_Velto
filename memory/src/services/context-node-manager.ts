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
      
      // Conversation-aware handling: always structure by turns/responses
      if (context.type === 'conversation') {
        logger.info(`Context ${context._id} detected as conversation. Using conversation-aware conversion`)
        const nodes = await this.convertConversationToNodes(context, strategy)
        const stored = await this.storeContextNodes(nodes)
        logger.info(`Successfully converted conversation context ${context._id} to ${stored.length} ContextNodes`)
        return stored
      }

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
   * Specialized conversion for conversation contexts.
   * Breaks content into turns (User/AI), cleans tags/headers, and chunks oversized parts.
   */
  private async convertConversationToNodes(
    context: Context,
    strategy?: ChunkingStrategy
  ): Promise<ContextNode[]> {
    const content = context.content || ''
    const turns = this.parseConversationTurns(content)
    const nodes: ContextNode[] = []
    const baseStrategy: ChunkingStrategy = strategy || {
      maxTokens: 4000,
      preserveBoundaries: true,
      semanticGrouping: true,
      overlapTokens: 100,
      respectParagraphs: true,
      respectCodeBlocks: true,
      respectHeaders: true,
      minChunkSize: 100,
      maxChunkSize: 8000
    }

    let chunkIndex = 0
    for (const t of turns) {
      const cleaned = this.cleanConversationText(t.content)
      const estimatedTokens = this.estimateTokenCount(cleaned)

      // If this turn is too large, chunk it further using SmartChunker
      if (estimatedTokens > baseStrategy.maxTokens) {
        const chunkingResult = await this.smartChunker.chunkContent(cleaned, baseStrategy)
        for (const [i, ch] of chunkingResult.chunks.entries()) {
          if (!ch) continue
          const node = this.buildContextNodeFromPiece(
            context,
            `${context._id}_turn_${t.turn}_${t.role}_${i}`,
            ch.content,
            ch.tokenCount,
            chunkIndex,
            chunkingResult.chunks.length,
            'conversation_turn'
          )
          nodes.push(node)
          chunkIndex++
        }
      } else {
        const node = this.buildContextNodeFromPiece(
          context,
          `${context._id}_turn_${t.turn}_${t.role}`,
          cleaned,
          estimatedTokens,
          chunkIndex,
          turns.length,
          'conversation_turn'
        )
        nodes.push(node)
        chunkIndex++
      }
    }

    // Normalize totalChunks metadata to the final count
    const total = nodes.length
    for (const n of nodes) {
      n.metadata.totalChunks = total
    }

    return nodes
  }

  /**
   * Build a ContextNode object from a content piece
   */
  private buildContextNodeFromPiece(
    context: Context,
    id: string,
    content: string,
    tokenCount: number,
    chunkIndex: number,
    totalChunks: number,
    chunkType: string
  ): ContextNode {
    const contextNodeData: any = {
      id,
      content,
      tokenCount,
      importance: this.calculateContextImportance(context),
      timestamp: context.createdAt,
      childNodeIds: [],
      embeddings: [],
      summary: this.generateContextSummary(content),
      keywords: this.extractKeywordsFromText(content),
      relationships: [],
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
      metadata: {
        chunkIndex,
        totalChunks,
        originalContextId: context._id!,
        chunkType,
        isOptimized: true
      }
    }
    if (context._id) {
      contextNodeData.parentNodeId = context._id
    }
    return contextNodeData as ContextNode
  }

  /**
   * Parse conversation content into structured turns
   */
  private parseConversationTurns(content: string): Array<{ turn: number; role: 'user' | 'ai'; content: string; timestamp?: string }> {
    const turns: Array<{ turn: number; role: 'user' | 'ai'; content: string; timestamp?: string }> = []
    const blocks = content.split(/\n---\n/g)
    let turnCounter = 0

    for (const block of blocks) {
      const turnMatch = block.match(/##\s*Turn\s*(\d+)/i)
      const timestampMatch = block.match(/\*\*Timestamp:\*\*\s*([^\n]+)/i)
      const turnNumber = turnMatch ? parseInt((turnMatch[1] as string), 10) : (++turnCounter)

      // Extract User Prompt and AI Response sections
      const userMatch = block.match(/\*\*User\s*Prompt:\*\*[\s\S]*?(?=(\*\*AI\s*Response:\*\*|$))/i)
      const aiMatch = block.match(/\*\*AI\s*Response:\*\*[\s\S]*/i)

      if (userMatch) {
        const userContent = userMatch[0]
        const ts = timestampMatch?.[1]?.trim()
        turns.push({ turn: turnNumber, role: 'user', content: userContent, ...(ts ? { timestamp: ts } : {}) })
      }
      if (aiMatch) {
        const aiContent = aiMatch[0]
        const ts = timestampMatch?.[1]?.trim()
        turns.push({ turn: turnNumber, role: 'ai', content: aiContent, ...(ts ? { timestamp: ts } : {}) })
      }
    }

    // Fallback: if no explicit blocks, try simple split by headers
    if (turns.length === 0) {
      const simple = content.split(/##\s*Turn\s*\d+/i)
      for (const [i, partRaw] of simple.entries()) {
        const part = (partRaw || '').trim()
        if (!part) continue
        turns.push({ turn: i + 1, role: 'ai', content: part })
      }
    }

    return turns
  }

  /**
   * Clean conversation text: remove markdown headers/tags and redundant labels
   */
  private cleanConversationText(text: string): string {
    let t = text || ''
    // Remove headers like "# ChatGPT Conversation", "## Turn X"
    t = t.replace(/^#+\s+.*$/gm, '')
    // Remove bold labels like **User Prompt:**, **AI Response:**, **Timestamp:**
    t = t.replace(/\*\*\s*(User\s*Prompt|AI\s*Response|Timestamp)\s*:\s*\*\*/gi, '')
    // Remove markdown code fences surrounding json or text
    t = t.replace(/```[\s\S]*?```/g, (m) => m.replace(/^```\w*\n?/,'').replace(/\n?```$/,''))
    // Trim brackets-only placeholders, keep text inside brackets
    t = t.replace(/\[(.*?)\]/g, '$1')
    // Normalize whitespace
    t = t.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    return t
  }

  /**
   * Extract keywords from plain text
   */
  private extractKeywordsFromText(content: string): string[] {
    const words = content.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3)
    const wordCounts = new Map<string, number>()
    for (const w of words) {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1)
    }
    return Array.from(wordCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w)
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
