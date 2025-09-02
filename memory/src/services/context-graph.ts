import { ObjectId } from 'mongodb'
import { databaseService } from './database'
import { Context, ContextGraph, GraphNode, GraphEdge, ContextNode } from '../types'
import { logger } from '../utils/logger'
import { EfficientGraphBuilder } from './efficient-graph-builder'
import { getCacheManager } from './cache-manager'

export class ContextGraphService {
  private collection = databaseService.getCollection<ContextGraph>('contextGraphs')

  /**
   * Create or update context graph for a project
   */
  async buildContextGraph(projectId: ObjectId, userId: ObjectId): Promise<ContextGraph> {
    try {
      const cache = getCacheManager()
      const cacheKey = cache.generateCacheKey('contextGraph', { projectId: projectId.toString(), userId: userId.toString(), mode: 'content' })
      const cached = await cache.getCachedResult<ContextGraph>(cacheKey)
      if (cached) return cached
      const contextsCollection = databaseService.getCollection<Context>('contexts')
      
      // Get all contexts for the project
      const contexts = await contextsCollection
        .find({ projectId, userId })
        .sort({ createdAt: -1 })
        .toArray()

      if (contexts.length === 0) {
        throw new Error('No contexts found for project')
      }

      // Build nodes from contexts
      const nodes: GraphNode[] = contexts.map((context, index) => ({
        id: context._id!.toString(),
        contextId: context._id!,
        type: context.type,
        position: this.calculateNodePosition(index, contexts.length),
        size: { width: 120, height: 80 },
        color: this.getNodeColor(context.type),
        label: context.title
      }))

      // Build edges based on relationships
      const edges: GraphEdge[] = await this.buildEdges(contexts)

      // Create or update the graph
      const existingGraph = await this.collection.findOne({ projectId })
      
      const graphData: Omit<ContextGraph, '_id'> = {
        projectId,
        nodes,
        edges,
        layout: {
          type: 'force',
          settings: {
            nodeSpacing: 150,
            edgeLength: 200,
            gravity: -1000
          }
        },
        createdAt: existingGraph?.createdAt || new Date(),
        updatedAt: new Date()
      }

      if (existingGraph) {
        await this.collection.updateOne(
          { _id: existingGraph._id },
          { $set: graphData }
        )
        logger.info(`Context graph updated for project ${projectId}`)
        const updated = { ...graphData, _id: existingGraph._id }
        await cache.setCachedResult(cacheKey, updated, 60)
        return updated
      } else {
        const result = await this.collection.insertOne(graphData)
        logger.info(`Context graph created for project ${projectId}`)
        const created = { ...graphData, _id: result.insertedId }
        await cache.setCachedResult(cacheKey, created, 60)
        return created
      }
    } catch (error) {
      logger.error('Error building context graph:', error)
      throw error
    }
  }

  /**
   * Build edges between contexts based on semantic similarity and relationships
   */
  private async buildEdges(contexts: Context[]): Promise<GraphEdge[]> {
    const edges: GraphEdge[] = []
    const edgeId = new Map<string, boolean>()

    for (let i = 0; i < contexts.length; i++) {
      for (let j = i + 1; j < contexts.length; j++) {
        const context1 = contexts[i]
        const context2 = contexts[j]
        
        if (!context1 || !context2) continue
        
        // Calculate comprehensive similarity score
        const similarity = await this.calculateComprehensiveSimilarity(context1, context2)
        
        if (similarity > 0.2) { // Lower threshold for more connections
          const edgeIdStr = `${context1._id}-${context2._id}`
          const reverseEdgeIdStr = `${context2._id}-${context1._id}`
          
          if (!edgeId.has(edgeIdStr) && !edgeId.has(reverseEdgeIdStr)) {
            const edgeType = this.determineAdvancedEdgeType(context1, context2, similarity)
            
            edges.push({
              id: edgeIdStr,
              source: context1._id!.toString(),
              target: context2._id!.toString(),
              type: edgeType,
              weight: similarity,
              label: `${Math.round(similarity * 100)}%`,
              metadata: {
                similarityType: this.getSimilarityType(similarity),
                relationshipStrength: this.getRelationshipStrength(similarity),
                commonTopics: this.findCommonTopics(context1, context2),
                temporalProximity: this.calculateTemporalProximity(context1, context2),
                semanticOverlap: similarity,
                dependencyDepth: this.calculateDependencyDepth(context1, context2),
                relationshipConfidence: similarity
              }
            })
            edgeId.set(edgeIdStr, true)
          }
        }
      }
    }

    return edges
  }

  /**
   * Build graph from ContextNodes when available (faster and more granular)
   */
  async buildGraphFromNodes(projectId: ObjectId, userId: ObjectId): Promise<ContextGraph> {
    const cache = getCacheManager()
    const cacheKey = cache.generateCacheKey('contextGraph', { projectId: projectId.toString(), userId: userId.toString(), mode: 'nodes' })
    const cached = await cache.getCachedResult<ContextGraph>(cacheKey)
    if (cached) return cached
    const nodesCollection = databaseService.getCollection<ContextNode>('contextNodes')
    const contextsCollection = databaseService.getCollection<Context>('contexts')
    const builder = new EfficientGraphBuilder()

    // Load latest nodes for this project's contexts
    const projectContexts = await contextsCollection.find({ projectId, userId }).project({ _id: 1 }).toArray()
    const ids = projectContexts.map(c => c._id)
    const nodeDocs = await nodesCollection.find({ 'metadata.originalContextId': { $in: ids } }).limit(2000).toArray()

    const { graphNodes, graphEdges } = await builder.buildGraph(nodeDocs)

    const existingGraph = await this.collection.findOne({ projectId })
    const graphData: Omit<ContextGraph, '_id'> = {
      projectId,
      nodes: graphNodes,
      edges: graphEdges,
      layout: existingGraph?.layout || {
        type: 'force',
        settings: { nodeSpacing: 150, edgeLength: 200, gravity: -1000 }
      },
      createdAt: existingGraph?.createdAt || new Date(),
      updatedAt: new Date()
    }

    if (existingGraph) {
      await this.collection.updateOne({ _id: existingGraph._id }, { $set: graphData })
      logger.info(`Context graph (nodes) updated for project ${projectId}`)
      const updated = { ...graphData, _id: existingGraph._id }
      await cache.setCachedResult(cacheKey, updated, 60)
      return updated
    } else {
      const result = await this.collection.insertOne(graphData)
      logger.info(`Context graph (nodes) created for project ${projectId}`)
      const created = { ...graphData, _id: result.insertedId }
      await cache.setCachedResult(cacheKey, created, 60)
      return created
    }
  }

  /**
   * Calculate comprehensive similarity between two contexts
   */
  private async calculateComprehensiveSimilarity(context1: Context, context2: Context): Promise<number> {
    let totalScore = 0
    let maxPossibleScore = 0
    
    // 1. Embedding similarity (40% weight)
    if (context1.embeddings?.content && context2.embeddings?.content && context1.embeddings.content.length > 0) {
      const embeddingSimilarity = this.calculateCosineSimilarity(context1.embeddings.content, context2.embeddings.content)
      totalScore += embeddingSimilarity * 0.4
      maxPossibleScore += 0.4
    }
    
    // 2. Tag similarity (20% weight)
    const tagSimilarity = this.calculateTagSimilarity(context1, context2)
    totalScore += tagSimilarity * 0.2
    maxPossibleScore += 0.2
    
    // 3. Type similarity (10% weight)
    const typeSimilarity = context1.type === context2.type ? 1 : 0
    totalScore += typeSimilarity * 0.1
    maxPossibleScore += 0.1
    
    // 4. Content similarity (15% weight)
    const contentSimilarity = this.calculateContentSimilarity(context1, context2)
    totalScore += contentSimilarity * 0.15
    maxPossibleScore += 0.15
    
    // 5. AI analysis similarity (15% weight)
    const aiSimilarity = this.calculateAIAnalysisSimilarity(context1, context2)
    totalScore += aiSimilarity * 0.15
    maxPossibleScore += 0.15
    
    return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   */
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

  /**
   * Calculate tag similarity
   */
  private calculateTagSimilarity(context1: Context, context2: Context): number {
    const tags1 = context1.tags || []
    const tags2 = context2.tags || []
    
    if (tags1.length === 0 && tags2.length === 0) return 1
    if (tags1.length === 0 || tags2.length === 0) return 0
    
    const commonTags = tags1.filter(tag => tags2.includes(tag))
    const unionTags = [...new Set([...tags1, ...tags2])]
    
    return commonTags.length / unionTags.length
  }

  /**
   * Calculate content similarity using keyword matching
   */
  private calculateContentSimilarity(context1: Context, context2: Context): number {
    const content1 = (context1.content || '').toLowerCase()
    const content2 = (context2.content || '').toLowerCase()
    
    // Extract meaningful words (3+ characters, exclude common words)
    const stopWords = ['the', 'and', 'for', 'with', 'this', 'that', 'have', 'will', 'from', 'they']
    const words1 = content1.split(/\s+/).filter(word => word.length > 2 && !stopWords.includes(word))
    const words2 = content2.split(/\s+/).filter(word => word.length > 2 && !stopWords.includes(word))
    
    if (words1.length === 0 && words2.length === 0) return 1
    if (words1.length === 0 || words2.length === 0) return 0
    
    const commonWords = words1.filter(word => words2.includes(word))
    const unionWords = [...new Set([...words1, ...words2])]
    
    return commonWords.length / unionWords.length
  }

  /**
   * Calculate AI analysis similarity
   */
  private calculateAIAnalysisSimilarity(context1: Context, context2: Context): number {
    const analysis1 = context1.aiAnalysis
    const analysis2 = context2.aiAnalysis
    
    if (!analysis1 || !analysis2) return 0
    
    let similarity = 0
    let factors = 0
    
    // Category similarity
    if (analysis1.categories && analysis2.categories) {
      const commonCategories = analysis1.categories.filter(cat => analysis2.categories.includes(cat))
      const unionCategories = [...new Set([...analysis1.categories, ...analysis2.categories])]
      similarity += commonCategories.length / unionCategories.length
      factors++
    }
    
    // Keyword similarity
    if (analysis1.keywords && analysis2.keywords) {
      const commonKeywords = analysis1.keywords.filter(keyword => analysis2.keywords.includes(keyword))
      const unionKeywords = [...new Set([...analysis1.keywords, ...analysis2.keywords])]
      similarity += commonKeywords.length / unionKeywords.length
      factors++
    }
    
    // Main topics similarity
    if (analysis1.breakdown?.mainTopics && analysis2.breakdown?.mainTopics) {
      const commonTopics = analysis1.breakdown.mainTopics.filter(topic => 
        analysis2.breakdown?.mainTopics?.includes(topic)
      )
      const unionTopics = [...new Set([...analysis1.breakdown.mainTopics, ...(analysis2.breakdown?.mainTopics || [])])]
      similarity += commonTopics.length / unionTopics.length
      factors++
    }
    
    return factors > 0 ? similarity / factors : 0
  }

  /**
   * Determine advanced edge type based on context analysis
   */
  private determineAdvancedEdgeType(context1: Context, context2: Context, similarity: number): GraphEdge['type'] {
    // High similarity indicates similar contexts
    if (similarity > 0.7) return 'similar'
    
    // Check for implementation relationships
    if (this.hasImplementationRelationship(context1, context2)) return 'implements'
    
    // Check for dependency relationships
    if (this.hasDependencyRelationship(context1, context2)) return 'depends_on'
    
    // Check for reference relationships
    if (this.hasReferenceRelationship(context1, context2)) return 'references'
    
    // Default to related
    return 'related'
  }

  /**
   * Check for implementation relationships
   */
  private hasImplementationRelationship(context1: Context, context2: Context): boolean {
    const analysis1 = context1.aiAnalysis
    const analysis2 = context2.aiAnalysis
    
    if (!analysis1 || !analysis2) return false
    
    // Check if one context implements concepts from another
    const topics1 = analysis1.breakdown?.mainTopics || []
    const topics2 = analysis2.breakdown?.mainTopics || []
    
    return topics1.some(topic1 => 
      topics2.some(topic2 => 
        topic2.toLowerCase().includes('implement') || 
        topic2.toLowerCase().includes('build') ||
        topic2.toLowerCase().includes('create') ||
        topic1.toLowerCase().includes('implement') ||
        topic1.toLowerCase().includes('build') ||
        topic1.toLowerCase().includes('create')
      )
    )
  }

  /**
   * Check for dependency relationships
   */
  private hasDependencyRelationship(context1: Context, context2: Context): boolean {
    const analysis1 = context1.aiAnalysis
    const analysis2 = context2.aiAnalysis
    
    if (!analysis1 || !analysis2) return false
    
    // Check if one context depends on concepts from another
    const dependsOn1 = analysis1.relationships?.dependsOn || []
    const dependsOn2 = analysis2.relationships?.dependsOn || []
    
    return dependsOn1.length > 0 || dependsOn2.length > 0
  }

  /**
   * Check for reference relationships
   */
  private hasReferenceRelationship(context1: Context, context2: Context): boolean {
    const analysis1 = context1.aiAnalysis
    const analysis2 = context2.aiAnalysis
    
    if (!analysis1 || !analysis2) return false
    
    // Check if contexts reference each other
    const references1 = analysis1.relationships?.references || []
    const references2 = analysis2.relationships?.references || []
    
    return references1.length > 0 || references2.length > 0
  }

  /**
   * Get similarity type classification
   */
  private getSimilarityType(similarity: number): 'very_high' | 'high' | 'medium' | 'low' | 'very_low' {
    if (similarity > 0.8) return 'very_high'
    if (similarity > 0.6) return 'high'
    if (similarity > 0.4) return 'medium'
    if (similarity > 0.2) return 'low'
    return 'very_low'
  }

  /**
   * Get relationship strength classification
   */
  private getRelationshipStrength(similarity: number): 'strong' | 'moderate' | 'weak' {
    if (similarity > 0.8) return 'strong'
    if (similarity > 0.5) return 'moderate'
    return 'weak'
  }

  /**
   * Find common topics between contexts
   */
  private findCommonTopics(context1: Context, context2: Context): string[] {
    const topics1 = context1.aiAnalysis?.breakdown?.mainTopics || []
    const topics2 = context2.aiAnalysis?.breakdown?.mainTopics || []
    
    return topics1.filter(topic => topics2.includes(topic))
  }

  /**
   * Calculate temporal proximity between contexts
   */
  private calculateTemporalProximity(context1: Context, context2: Context): number {
    const time1 = context1.createdAt?.getTime() || 0
    const time2 = context2.createdAt?.getTime() || 0
    
    if (time1 === 0 || time2 === 0) return 0
    
    const timeDiff = Math.abs(time1 - time2)
    const maxDiff = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
    
    return Math.max(0, 1 - (timeDiff / maxDiff))
  }

  /**
   * Calculate dependency depth between contexts
   */
  private calculateDependencyDepth(context1: Context, context2: Context): number {
    const analysis1 = context1.aiAnalysis
    const analysis2 = context2.aiAnalysis
    
    if (!analysis1 || !analysis2) return 0
    
    let depth = 0
    
    // Check if one context depends on the other
    const dependsOn1 = analysis1.relationships?.dependsOn || []
    const dependsOn2 = analysis2.relationships?.dependsOn || []
    
    if (dependsOn1.length > 0 || dependsOn2.length > 0) {
      depth += 0.5
    }
    
    // Check for implementation relationships
    if (this.hasImplementationRelationship(context1, context2)) {
      depth += 0.3
    }
    
    // Check for reference relationships
    if (this.hasReferenceRelationship(context1, context2)) {
      depth += 0.2
    }
    
    return Math.min(depth, 1.0)
  }

  /**
   * Calculate node positions for visual layout
   */
  private calculateNodePosition(index: number, total: number): { x: number; y: number } {
    const radius = 200
    const angle = (index / total) * 2 * Math.PI
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    return { x, y }
  }

  /**
   * Get color for node based on context type
   */
  private getNodeColor(type: string): string {
    const colors: Record<string, string> = {
      'code': '#3B82F6',        // Blue
      'documentation': '#10B981', // Green
      'meeting': '#F59E0B',     // Amber
      'task': '#EF4444',        // Red
      'idea': '#8B5CF6',        // Purple
      'research': '#06B6D4',    // Cyan
      'conversation': '#84CC16', // Lime
      'note': '#F97316',        // Orange
      'email': '#EC4899',       // Pink
      'webpage': '#6366F1',     // Indigo
      'file': '#6B7280',        // Gray
      'image': '#8B5CF6',       // Purple
      'audio': '#EC4899',       // Pink
      'video': '#DC2626'        // Red
    }
    return colors[type] || '#6B7280'
  }

  /**
   * Get context graph for a project
   */
  async getContextGraph(projectId: ObjectId, _userId: ObjectId): Promise<ContextGraph | null> {
    return await this.collection.findOne({ projectId })
  }

  /**
   * Update context graph when a context is modified
   */
  async updateContextGraphForContext(contextId: ObjectId, userId: ObjectId): Promise<void> {
    try {
      const contextsCollection = databaseService.getCollection<Context>('contexts')
      const context = await contextsCollection.findOne({ _id: contextId, userId })
      
      if (context && context.projectId) {
        await this.buildContextGraph(context.projectId, userId)
        logger.info(`Context graph updated after context ${contextId} modification`)
      }
    } catch (error) {
      logger.error('Error updating context graph for context:', error)
    }
  }

  /**
   * Delete context graph for a project
   */
  async deleteContextGraph(projectId: ObjectId, _userId: ObjectId): Promise<void> {
    await this.collection.deleteOne({ projectId })
    logger.info(`Context graph deleted for project ${projectId}`)
  }
}

// Export lazy-loaded singleton instance
let _contextGraphService: ContextGraphService | null = null

export const getContextGraphService = (): ContextGraphService => {
  if (!_contextGraphService) {
    _contextGraphService = new ContextGraphService()
  }
  return _contextGraphService
}

export const contextGraphService = new Proxy({} as ContextGraphService, {
  get(_target, prop) {
    const instance = getContextGraphService()
    return instance[prop as keyof ContextGraphService]
  }
})
