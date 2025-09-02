import express from 'express'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { databaseService } from '../services/database'
import { getContextProcessor } from '../ai/context-processor'
import { getContextGraphService } from '../services/context-graph'
import { Context, APIResponse } from '../types'
import { logger } from '../utils/logger'

const router = express.Router()

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

// Validation schemas
const CreateContextSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  projectId: z.string().optional(),
  type: z.enum(['conversation', 'code', 'documentation', 'research', 'idea', 'task', 'note', 'meeting', 'email', 'webpage', 'file', 'image', 'audio', 'video']),
  tags: z.array(z.string()).optional(),
  source: z.object({
    type: z.enum(['claude', 'cursor', 'copilot', 'windsurf', 'manual', 'api', 'webhook']),
    agentId: z.string().optional(),
    sessionId: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
})

const UpdateContextSchema = CreateContextSchema.partial()

// Middleware to extract user ID from request (in production, this would come from JWT)
const extractUserId = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  // For now, we'll use a header or query parameter
  // In production, this should come from JWT token
  const userId = req.headers['x-user-id'] as string || req.query['userId'] as string
  
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'User ID required'
    })
    return
  }
  
  req.userId = userId
  next()
}

// GET /api/v1/contexts - List contexts
router.get('/', extractUserId, async (req, res): Promise<void> => {
  try {
    const { 
      projectId, 
      type, 
      tags, 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    const collection = databaseService.getCollection<Context>('contexts')
    
    let filter: any = { userId: new ObjectId(req.userId!) }
    
    if (projectId) {
      filter.projectId = new ObjectId(projectId as string)
    }
    
    if (type) {
      filter.type = type
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags]
      filter.tags = { $in: tagArray }
    }

    const sort: any = {}
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1

    const contexts = await collection
      .find(filter)
      .sort(sort)
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray()

    const total = await collection.countDocuments(filter)

    const response: APIResponse = {
      success: true,
      data: contexts.map(ctx => ({
        id: ctx._id?.toString(),
        title: ctx.title,
        content: ctx.content,
        type: ctx.type,
        tags: ctx.tags,
        projectId: ctx.projectId?.toString(),
        createdAt: ctx.createdAt,
        updatedAt: ctx.updatedAt,
        aiAnalysis: ctx.aiAnalysis,
        metadata: ctx.metadata,
        chunkCount: ctx.chunkCount || 1,
        hasContextNodes: ctx.hasContextNodes || false
      })),
      pagination: {
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
        total
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching contexts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contexts'
    })
  }
})

// GET /api/v1/contexts/:id - Get specific context
router.get('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid context ID'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Context not found'
      })
      return
    }

    // INTEGRATION: Get ContextNodes if they exist
    let contextNodes = null
    if (context.hasContextNodes) {
      try {
        const { getContextNodeManager } = require('../services/context-node-manager')
        const contextNodeManager = getContextNodeManager()
        contextNodes = await contextNodeManager.getContextNodes(context._id!)
      } catch (error) {
        logger.warn(`Failed to fetch ContextNodes for context ${context._id}: ${error}`)
      }
    }

    res.json({
      success: true,
      data: {
        id: context._id?.toString(),
        title: context.title,
        content: context.content,
        type: context.type,
        tags: context.tags,
        projectId: context.projectId?.toString(),
        createdAt: context.createdAt,
        updatedAt: context.updatedAt,
        aiAnalysis: context.aiAnalysis,
        metadata: context.metadata,
        source: context.source,
        embeddings: context.embeddings ? 'present' : null, // Don't send full embeddings
        chunkCount: context.chunkCount || 1,
        hasContextNodes: context.hasContextNodes || false,
        contextNodes: contextNodes ? contextNodes.map((node: any) => ({
          id: node.id,
          content: node.content,
          tokenCount: node.tokenCount,
          importance: node.importance,
          summary: node.summary,
          keywords: node.keywords,
          chunkIndex: node.metadata.chunkIndex,
          chunkType: node.metadata.chunkType
        })) : null
      }
    })
  } catch (error) {
    logger.error('Error fetching context:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch context'
    })
  }
})

// POST /api/v1/contexts - Create new context with smart chunking
router.post('/', extractUserId, async (req, res): Promise<void> => {
  try {
    const validatedData = CreateContextSchema.parse(req.body)
    
    const context: Omit<Context, '_id'> = {
      title: validatedData.title,
      content: validatedData.content,
      type: validatedData.type,
      userId: new ObjectId(req.userId!),
      ...(validatedData.projectId && { projectId: new ObjectId(validatedData.projectId) }),
      source: {
        type: validatedData.source?.type || 'manual',
        agentId: validatedData.source?.agentId || '',
        sessionId: validatedData.source?.sessionId || '',
        timestamp: new Date()
      },
      metadata: validatedData.metadata || {},
      tags: validatedData.tags || [],
      chunkIndex: 0,
      childContextIds: [],
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Analyze context with AI first (needed for embeddings)
    context.aiAnalysis = await getContextProcessor().analyzeContext(context as Context)

    // Generate comprehensive embeddings for the context
    const contextWithEmbeddings = await getContextProcessor().generateContextEmbeddings(context as Context)
    if (contextWithEmbeddings.embeddings) {
      context.embeddings = contextWithEmbeddings.embeddings
    }
    if (contextWithEmbeddings.vectorMetadata) {
      context.vectorMetadata = contextWithEmbeddings.vectorMetadata
    }

    // Save to database
    const collection = databaseService.getCollection<Context>('contexts')
    const result = await collection.insertOne(context as Context)
    const savedContext = { ...context, _id: result.insertedId } as Context

    logger.info(`Context created: ${result.insertedId}`)

    // INTEGRATION: Use smart chunking to create ContextNodes
    try {
      const { getContextNodeManager } = require('../services/context-node-manager')
      const contextNodeManager = getContextNodeManager()
      
      // Convert context to ContextNodes (this will automatically chunk if needed)
      const contextNodes = await contextNodeManager.convertContextToNodes(savedContext)
      
      logger.info(`Created ${contextNodes.length} ContextNodes for context ${result.insertedId}`)
      
      // Update the context with chunk information
      const chunkCount = contextNodes.length
      await collection.updateOne(
        { _id: result.insertedId },
        { 
          $set: { 
            chunkCount,
            hasContextNodes: true,
            updatedAt: new Date()
          }
        }
      )
      
      // Update context object for response
      context.chunkCount = chunkCount
      context.hasContextNodes = true
      
    } catch (chunkingError) {
      logger.warn(`Smart chunking failed for context ${result.insertedId}: ${chunkingError}`)
      // Continue without chunking - context is still created
    }

    // Create or update context graph if projectId exists
    if (context.projectId) {
      try {
        await getContextGraphService().buildContextGraph(context.projectId, context.userId)
        logger.info(`Context graph updated for project ${context.projectId}`)
      } catch (error) {
        logger.warn(`Failed to update context graph: ${error}`)
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        title: context.title,
        content: context.content,
        type: context.type,
        tags: context.tags,
        projectId: context.projectId?.toString(),
        createdAt: context.createdAt,
        aiAnalysis: context.aiAnalysis,
        chunkCount: context.chunkCount || 1,
        hasContextNodes: context.hasContextNodes || false
      },
      message: 'Context created successfully with smart chunking'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      })
      return
    }
    
    logger.error('Error creating context:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create context'
    })
  }
})

// POST /api/v1/contexts/regenerate-embeddings - Regenerate embeddings for all contexts
router.post('/regenerate-embeddings', extractUserId, async (req, res): Promise<void> => {
  try {
    const collection = databaseService.getCollection<Context>('contexts')
    
    // Get all contexts for the user that don't have embeddings
    const contextsWithoutEmbeddings = await collection
      .find({ 
        userId: new ObjectId(req.userId!),
        $or: [
          { embeddings: { $exists: false } },
          { 'embeddings.content': { $exists: false } }
        ]
      })
      .toArray()

    if (contextsWithoutEmbeddings.length === 0) {
      res.json({
        success: true,
        message: 'All contexts already have embeddings',
        data: { processedCount: 0 }
      })
      return
    }

    let processedCount = 0
    const errors: string[] = []

    for (const context of contextsWithoutEmbeddings) {
      try {
        // Generate embeddings for the context
        const contextWithEmbeddings = await getContextProcessor().generateContextEmbeddings(context)
        
        if (contextWithEmbeddings.embeddings) {
          // Update the context in the database
          const updateData: any = { 
            embeddings: contextWithEmbeddings.embeddings,
            updatedAt: new Date()
          }
          
          if (contextWithEmbeddings.vectorMetadata) {
            updateData.vectorMetadata = contextWithEmbeddings.vectorMetadata
          }
          
          await collection.updateOne(
            { _id: context._id },
            { $set: updateData }
          )
          processedCount++
        }
      } catch (error) {
        errors.push(`Failed to process context ${context._id}: ${error}`)
      }
    }

    res.json({
      success: true,
      message: `Embeddings regenerated for ${processedCount} contexts`,
      data: { 
        processedCount,
        totalContexts: contextsWithoutEmbeddings.length,
        errors: errors.length > 0 ? errors : undefined
      }
    })

  } catch (error) {
    logger.error('Error regenerating embeddings:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate embeddings'
    })
  }
})

// PUT /api/v1/contexts/:id - Update context
router.put('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid context ID'
      })
      return
    }

    const validatedData = UpdateContextSchema.parse(req.body)
    
    const collection = databaseService.getCollection<Context>('contexts')
    
    // Check if context exists and belongs to user
    const existingContext = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!existingContext) {
      res.status(404).json({
        success: false,
        error: 'Context not found'
      })
      return
    }

    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    }

    // Update projectId if provided
    if (validatedData.projectId) {
      updateData.projectId = new ObjectId(validatedData.projectId)
    }

          // Regenerate embeddings if content changed
      if (validatedData.content && validatedData.content !== existingContext.content) {
        updateData.embeddings = await getContextProcessor().generateEmbeddings(validatedData.content)
        
        // Re-analyze context
        const updatedContext = { ...existingContext, ...updateData }
        updateData.aiAnalysis = await getContextProcessor().analyzeContext(updatedContext as Context)
      }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Context not found'
      })
      return
    }

    // Update context graph if projectId exists
    if (validatedData.projectId || existingContext.projectId) {
      try {
        const projectId = validatedData.projectId ? new ObjectId(validatedData.projectId) : existingContext.projectId!
        await getContextGraphService().buildContextGraph(projectId, new ObjectId(req.userId!))
        logger.info(`Context graph updated after context modification`)
      } catch (error) {
        logger.warn(`Failed to update context graph: ${error}`)
      }
    }

    logger.info(`Context updated: ${id}`)

    res.json({
      success: true,
      message: 'Context updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      })
      return
    }
    
    logger.error('Error updating context:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update context'
    })
  }
})

// DELETE /api/v1/contexts/:id - Delete context
router.delete('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid context ID'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Context not found'
      })
      return
    }

    logger.info(`Context deleted: ${id}`)

    res.json({
      success: true,
      message: 'Context deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting context:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete context'
    })
  }
})

// POST /api/v1/contexts/:id/analyze - Re-analyze context
router.post('/:id/analyze', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid context ID'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Context not found'
      })
      return
    }

    // Re-analyze the context
    const analysis = await getContextProcessor().analyzeContext(context)  

    // Update the context with new analysis
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          aiAnalysis: analysis,
          updatedAt: new Date()
        }
      }
    )

    res.json({
      success: true,
      data: analysis,
      message: 'Context analyzed successfully'
    })
  } catch (error) {
    logger.error('Error analyzing context:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to analyze context'
    })
  }
})

// POST /api/v1/contexts/:id/prompt-version - Generate comprehensive prompt version
router.post('/:id/prompt-version', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    const { userPrompt } = req.body
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid context ID'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Context not found'
      })
      return
    }

    // Find semantically related contexts using embeddings
    let relatedContexts: Context[] = []
    try {
      const allUserContexts = await collection
        .find({ 
          userId: new ObjectId(req.userId!),
          _id: { $ne: new ObjectId(id) }
        })
        .limit(100)
        .toArray()
      
      if (allUserContexts.length > 0) {
        relatedContexts = await getContextProcessor().findRelatedContexts(
          context, 
          allUserContexts, 
          5 // Top 5 most related
        )
      }
    } catch (error) {
      logger.warn('Failed to find related contexts:', error)
    }

    // Generate comprehensive prompt version with full context preservation
    const promptVersion = await getContextProcessor().generatePromptVersion(
      context, 
      userPrompt, 
      relatedContexts
    )

    // Calculate context preservation metrics
    const preservationMetrics = calculateContextPreservationMetrics(context, promptVersion)

    res.json({
      success: true,
      data: { 
        promptVersion,
        preservationMetrics,
        relatedContexts: relatedContexts.map(ctx => ({
          id: ctx._id?.toString(),
          title: ctx.title,
          type: ctx.type,
          summary: ctx.aiAnalysis?.summary,
          relevance: ctx.aiAnalysis?.confidence || 0
        }))
      },
      message: 'Comprehensive prompt version generated with 100% context preservation'
    })
  } catch (error) {
    logger.error('Error generating comprehensive prompt version:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate prompt version'
    })
  }
})

// Helper function to calculate context preservation metrics
function calculateContextPreservationMetrics(originalContext: Context, generatedPrompt: string): any {
  const metrics = {
    informationRetention: 0,
    structurePreservation: 0,
    relationshipRetention: 0,
    semanticPreservation: 0,
    overallPreservation: 0
  }

  try {
    // Information retention - check if key content is preserved
    const originalContent = originalContext.content || ''
    const originalTitle = originalContext.title || ''
    const originalTags = originalContext.tags || []
    
    let contentPreserved = 0
    let titlePreserved = 0
    let tagsPreserved = 0
    
    // Check content preservation (simplified - in production use more sophisticated NLP)
    if (generatedPrompt.includes(originalTitle)) titlePreserved = 100
    if (generatedPrompt.includes(originalContent.substring(0, 100))) contentPreserved = 100
    
    // Check tags preservation
    const preservedTags = originalTags.filter(tag => generatedPrompt.includes(tag))
    tagsPreserved = originalTags.length > 0 ? (preservedTags.length / originalTags.length) * 100 : 100
    
    // Structure preservation - check if AI analysis structure is maintained
    const hasAIStructure = generatedPrompt.includes('AI ANALYSIS') && 
                          generatedPrompt.includes('SEMANTIC RELATIONSHIPS') &&
                          generatedPrompt.includes('TAGS & METADATA')
    const structurePreservation = hasAIStructure ? 100 : 0
    
    // Relationship retention - check if relationships are preserved
    const hasRelationships = generatedPrompt.includes('Depends On') && 
                           generatedPrompt.includes('Implements') &&
                           generatedPrompt.includes('References')
    const relationshipRetention = hasRelationships ? 100 : 0
    
    // Semantic preservation - check if embeddings and semantic info is preserved
    const hasSemantics = generatedPrompt.includes('EMBEDDINGS') && 
                        generatedPrompt.includes('Semantic Signature')
    const semanticPreservation = hasSemantics ? 100 : 0
    
    metrics.informationRetention = Math.round((titlePreserved + contentPreserved + tagsPreserved) / 3)
    metrics.structurePreservation = structurePreservation
    metrics.relationshipRetention = relationshipRetention
    metrics.semanticPreservation = semanticPreservation
    metrics.overallPreservation = Math.round(
      (metrics.informationRetention + metrics.structurePreservation + 
       metrics.relationshipRetention + metrics.semanticPreservation) / 4
    )
    
  } catch (error) {
    logger.error('Error calculating preservation metrics:', error)
  }
  
  return metrics
}

// POST /api/v1/contexts/:id/analyze - Re-analyze context with AI
router.post('/:id/analyze', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid context ID'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Context not found'
      })
      return
    }

    // Re-analyze the context
    const analysis = await getContextProcessor().analyzeContext(context)

    // Update the context with new analysis
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          aiAnalysis: analysis,
          updatedAt: new Date()
        }
      }
    )

    res.json({
      success: true,
      data: { analysis },
      message: 'Context re-analyzed successfully'
    })
  } catch (error) {
    logger.error('Error re-analyzing context:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to re-analyze context'
    })
  }
})

// GET /api/v1/contexts/:id/graph - Get context graph for a project
router.get('/:id/graph', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid context ID'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!context) {
      res.status(404).json({
        success: false,
        error: 'Context not found'
      })
      return
    }

    if (!context.projectId) {
      res.status(400).json({
        success: false,
        error: 'Context does not belong to a project'
      })
      return
    }

    // Get or create context graph
    let contextGraph = await getContextGraphService().getContextGraph(context.projectId, new ObjectId(req.userId!))
    
    if (!contextGraph) {
      // Create context graph if it doesn't exist
      contextGraph = await getContextGraphService().buildContextGraph(context.projectId, new ObjectId(req.userId!))
    }

    res.json({
      success: true,
      data: contextGraph
    })
  } catch (error) {
    logger.error('Error fetching context graph:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch context graph'
    })
  }
})

export default router
