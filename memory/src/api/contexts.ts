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
        metadata: ctx.metadata
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
        embeddings: context.embeddings ? 'present' : null // Don't send full embeddings
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

// POST /api/v1/contexts - Create new context
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

    // Generate embeddings
    context.embeddings = await getContextProcessor().generateEmbeddings(context.content!)

    // Analyze context with AI
    context.aiAnalysis = await getContextProcessor().analyzeContext(context as Context)

    // Save to database
    const collection = databaseService.getCollection<Context>('contexts')
    const result = await collection.insertOne(context as Context)

    logger.info(`Context created: ${result.insertedId}`)

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
        aiAnalysis: context.aiAnalysis
      },
      message: 'Context created successfully'
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

// POST /api/v1/contexts/:id/prompt-version - Generate prompt version
router.post('/:id/prompt-version', extractUserId, async (req, res): Promise<void> => {
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

    const promptVersion = await getContextProcessor().generatePromptVersion(context)

    res.json({
      success: true,
      data: { promptVersion },
      message: 'Prompt version generated successfully'
    })
  } catch (error) {
    logger.error('Error generating prompt version:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate prompt version'
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
