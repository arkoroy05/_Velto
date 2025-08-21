import { ObjectId } from 'mongodb'
import { databaseService } from './database'
import { Context, ContextGraph, GraphNode, GraphEdge } from '../types'
import { logger } from '../utils/logger'

export class ContextGraphService {
  private collection = databaseService.getCollection<ContextGraph>('contextGraphs')

  /**
   * Create or update context graph for a project
   */
  async buildContextGraph(projectId: ObjectId, userId: ObjectId): Promise<ContextGraph> {
    try {
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
        return { ...graphData, _id: existingGraph._id }
      } else {
        const result = await this.collection.insertOne(graphData)
        logger.info(`Context graph created for project ${projectId}`)
        return { ...graphData, _id: result.insertedId }
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
        
        // Calculate similarity score
        const similarity = this.calculateSimilarity(context1, context2)
        
        if (similarity > 0.3) { // Threshold for creating edges
          const edgeIdStr = `${context1._id}-${context2._id}`
          const reverseEdgeIdStr = `${context2._id}-${context1._id}`
          
          if (!edgeId.has(edgeIdStr) && !edgeId.has(reverseEdgeIdStr)) {
            edges.push({
              id: edgeIdStr,
              source: context1._id!.toString(),
              target: context2._id!.toString(),
              type: this.determineEdgeType(context1, context2),
              weight: similarity,
              label: `${Math.round(similarity * 100)}%`
            })
            edgeId.set(edgeIdStr, true)
          }
        }
      }
    }

    return edges
  }

  /**
   * Calculate similarity between two contexts
   */
  private calculateSimilarity(context1: Context, context2: Context): number {
    let score = 0
    
    // Tag similarity
    const commonTags = context1.tags.filter(tag => context2.tags.includes(tag))
    if (commonTags.length > 0) {
      score += (commonTags.length / Math.max(context1.tags.length, context2.tags.length)) * 0.4
    }
    
    // Type similarity
    if (context1.type === context2.type) {
      score += 0.2
    }
    
    // Content similarity (simple keyword matching)
    const words1 = context1.content.toLowerCase().split(/\s+/)
    const words2 = context2.content.toLowerCase().split(/\s+/)
    const commonWords = words1.filter(word => words2.includes(word))
    if (commonWords.length > 0) {
      score += (commonWords.length / Math.max(words1.length, words2.length)) * 0.4
    }
    
    return Math.min(score, 1.0)
  }

  /**
   * Determine the type of relationship between contexts
   */
  private determineEdgeType(context1: Context, context2: Context): GraphEdge['type'] {
    if (context1.type === context2.type) {
      return 'similar'
    }
    
    if (context1.type === 'code' && context2.type === 'documentation') {
      return 'implements'
    }
    
    if (context1.type === 'task' && context2.type === 'code') {
      return 'depends_on'
    }
    
    if (context1.type === 'meeting' && context2.type === 'task') {
      return 'references'
    }
    
    return 'related'
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
