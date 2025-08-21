import express from 'express'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { databaseService } from '../services/database'
import { getContextProcessor } from '../ai/context-processor'
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
const SearchQuerySchema = z.object({
  query: z.string().min(1),
  userId: z.string(),
  projectId: z.string().optional(),
  searchType: z.enum(['text', 'semantic', 'hybrid', 'rag']).default('semantic'),
  filters: z.object({
    types: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional()
    }).optional()
  }).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
})

// Middleware to extract user ID from request
const extractUserId = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
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

// POST /api/v1/search - Advanced search with semantic capabilities
router.post('/', extractUserId, async (req, res): Promise<void> => {
  try {
    const validatedData = SearchQuerySchema.parse(req.body)
    
    const collection = databaseService.getCollection<Context>('contexts')
    
    // Build base filter
    let filter: any = { userId: new ObjectId(validatedData.userId) }
    
    if (validatedData.projectId) {
      filter.projectId = new ObjectId(validatedData.projectId)
    }

    // Apply filters
    if (validatedData.filters?.types && validatedData.filters.types.length > 0) {
      filter.type = { $in: validatedData.filters.types }
    }

    if (validatedData.filters?.tags && validatedData.filters.tags.length > 0) {
      filter.tags = { $in: validatedData.filters.tags }
    }

    if (validatedData.filters?.dateRange) {
      const dateFilter: any = {}
      if (validatedData.filters.dateRange.start) {
        dateFilter.$gte = new Date(validatedData.filters.dateRange.start)
      }
      if (validatedData.filters.dateRange.end) {
        dateFilter.$lte = new Date(validatedData.filters.dateRange.end)
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.createdAt = dateFilter
      }
    }

    // Get all contexts matching the filter
    const allContexts = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    let results: Array<{ context: Context; relevance: number }> = []

    // Perform search based on type
    switch (validatedData.searchType) {
      case 'semantic':
        results = await getContextProcessor().semanticSearch(
          validatedData.query, 
          allContexts, 
          validatedData.limit
        )
        break
        
      case 'rag':
        // For RAG, we'll return the top contexts and generate a response
        const ragResults = await getContextProcessor().semanticSearch(
          validatedData.query, 
          allContexts, 
          validatedData.limit
        )
        results = ragResults
        
        // Generate RAG response
        const ragResponse = await getContextProcessor().generateRAGResponse(
          validatedData.query,
          allContexts,
          1000
        )
        
        // Add RAG response to results
        res.json({
          success: true,
          data: results.map(({ context, relevance }) => ({
            id: context._id?.toString(),
            title: context.title,
            content: context.content,
            type: context.type,
            tags: context.tags,
            projectId: context.projectId?.toString(),
            createdAt: context.createdAt,
            updatedAt: context.updatedAt,
            relevance: relevance
          })),
          ragResponse,
          pagination: {
            page: Math.floor(validatedData.offset / validatedData.limit) + 1,
            limit: validatedData.limit,
            total: results.length
          }
        })
        return
        
      case 'hybrid':
        // Combine text search with semantic search
        const textResults = allContexts.filter(ctx => 
          ctx.title?.toLowerCase().includes(validatedData.query.toLowerCase()) ||
          ctx.content?.toLowerCase().includes(validatedData.query.toLowerCase())
        ).map(ctx => ({ context: ctx, relevance: 0.8 }))
        
        const hybridSemanticResults = await getContextProcessor().semanticSearch(
          validatedData.query, 
          allContexts, 
          Math.floor(validatedData.limit / 2)
        )
        
        // Merge and deduplicate results
        const allResults = [...textResults, ...hybridSemanticResults]
        const seenIds = new Set()
        results = allResults.filter(({ context }) => {
          const id = context._id?.toString()
          if (seenIds.has(id)) return false
          seenIds.add(id)
          return true
        }).slice(0, validatedData.limit)
        break
        
      default: // text search
        results = allContexts.filter(ctx => 
          ctx.title?.toLowerCase().includes(validatedData.query.toLowerCase()) ||
          ctx.content?.toLowerCase().includes(validatedData.query.toLowerCase())
        ).map(ctx => ({ context: ctx, relevance: 0.8 }))
        break
    }

    // Apply pagination
    const paginatedResults = results.slice(validatedData.offset, validatedData.offset + validatedData.limit)

    const response: APIResponse = {
      success: true,
      data: paginatedResults.map(({ context, relevance }) => ({
        id: context._id?.toString(),
        title: context.title,
        content: context.content,
        type: context.type,
        tags: context.tags,
        projectId: context.projectId?.toString(),
        createdAt: context.createdAt,
        updatedAt: context.updatedAt,
        relevance: relevance
      })),
      pagination: {
        page: Math.floor(validatedData.offset / validatedData.limit) + 1,
        limit: validatedData.limit,
        total: results.length
      }
    }

    res.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      })
      return
    }
    
    logger.error('Error performing search:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    })
  }
})

// GET /api/v1/search/suggestions - Get search suggestions
router.get('/suggestions', extractUserId, async (req, res): Promise<void> => {
  try {
    const { query, userId } = req.query
    
    if (!query || !userId) {
      res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    
    // Get contexts for the user
    const contexts = await collection
      .find({ userId: new ObjectId(userId as string) })
      .limit(100)
      .toArray()

    // Generate suggestions based on titles and content
    const suggestions = new Set<string>()
    
    // Add query itself as a suggestion
    suggestions.add(query as string)
    
    // Add matching titles
    contexts.forEach(ctx => {
      if (ctx.title?.toLowerCase().includes((query as string).toLowerCase())) {
        suggestions.add(ctx.title)
      }
    })

    res.json({
      success: true,
      data: {
        suggestions: Array.from(suggestions).slice(0, 10),
        query: query
      }
    })
  } catch (error) {
    logger.error('Error getting search suggestions:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get search suggestions'
    })
  }
})

// GET /api/v1/search/autocomplete - Get autocomplete suggestions
router.get('/autocomplete', extractUserId, async (req, res): Promise<void> => {
  try {
    const { query, userId, limit = 5 } = req.query
    
    if (!query || !userId) {
      res.status(400).json({
        success: false,
        error: 'Query and userId are required'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    
    // Get contexts for the user
    const contexts = await collection
      .find({ userId: new ObjectId(userId as string) })
      .limit(100)
      .toArray()

    // Find matching titles and content
    const matches = contexts
      .filter(ctx => 
        ctx.title?.toLowerCase().includes((query as string).toLowerCase()) ||
        ctx.content?.toLowerCase().includes((query as string).toLowerCase())
      )
      .slice(0, Number(limit))
      .map(ctx => ({
        text: ctx.title || 'Untitled',
        type: ctx.type,
        id: ctx._id?.toString()
      }))

    res.json({
      success: true,
      data: matches
    })
  } catch (error) {
    logger.error('Error getting autocomplete:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get autocomplete'
    })
  }
})

// GET /api/v1/search/filters - Get available search filters
router.get('/filters', extractUserId, async (req, res): Promise<void> => {
  try {
    const { userId } = req.query
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'UserId is required'
      })
      return
    }

    const collection = databaseService.getCollection<Context>('contexts')
    
    // Get contexts for the user
    const contexts = await collection
      .find({ userId: new ObjectId(userId as string) })
      .toArray()

    // Extract unique types
    const types = [...new Set(contexts.map(ctx => ctx.type).filter(Boolean))]

    // Extract unique tags
    const allTags = contexts.flatMap(ctx => ctx.tags || [])
    const tags = [...new Set(allTags)]

    // Get date range
    const dates = contexts.map(ctx => ctx.createdAt).filter(Boolean)
    const dateRange = dates.length > 0 ? {
      start: new Date(Math.min(...dates.map(d => d.getTime()))),
      end: new Date(Math.max(...dates.map(d => d.getTime())))
    } : null

    res.json({
      success: true,
      data: {
        types,
        tags,
        dateRange
      }
    })
  } catch (error) {
    logger.error('Error getting search filters:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get search filters'
    })
  }
})

export default router
