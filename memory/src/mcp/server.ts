import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { ObjectId } from 'mongodb'
import dotenv from 'dotenv'
import { databaseService } from '../services/database'
import { getContextProcessor } from '../ai/context-processor'
import { Context } from '../types'
import { logger } from '../utils/logger'

// Load environment variables
dotenv.config({ path: '.env.local' })

class VeltoMCPServer {
  private server: Server
  private tools: Map<string, Tool> = new Map()

  constructor() {
    this.server = new Server(
      {
        name: 'velto-memory-server',
        version: '1.0.0',
      }
    )

    this.setupTools()
    this.setupHandlers()
  }

  private setupTools() {
    // Tool 1: Save Context
    this.tools.set('save_context', {
      name: 'save_context',
      description: 'Save a new context to Velto memory system',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the context' },
          content: { type: 'string', description: 'Content of the context' },
          projectId: { type: 'string', description: 'Project ID (optional)' },
          type: { 
            type: 'string', 
            enum: ['conversation', 'code', 'documentation', 'research', 'idea', 'task', 'note', 'meeting', 'email', 'webpage', 'file', 'image', 'audio', 'video'],
            description: 'Type of context'
          },
          tags: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Tags for categorization'
          },
          source: {
            type: 'object',
            properties: {
              type: { 
                type: 'string', 
                enum: ['claude', 'cursor', 'copilot', 'windsurf', 'manual', 'api', 'webhook']
              },
              agentId: { type: 'string' },
              sessionId: { type: 'string' }
            }
          }
        },
        required: ['title', 'content', 'type']
      }
    })

    // Tool 2: Search Contexts
    this.tools.set('search_contexts', {
      name: 'search_contexts',
      description: 'Search for contexts in Velto memory system',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          projectId: { type: 'string', description: 'Project ID to search within (optional)' },
          userId: { type: 'string', description: 'User ID' },
          filters: {
            type: 'object',
            properties: {
              types: { 
                type: 'array', 
                items: { type: 'string' }
              },
              tags: { 
                type: 'array', 
                items: { type: 'string' }
              },
              dateRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', format: 'date-time' },
                  end: { type: 'string', format: 'date-time' }
                }
              }
            }
          },
          limit: { type: 'number', default: 10, description: 'Maximum number of results' }
        },
        required: ['query', 'userId']
      }
    })

    // Tool 3: Get Context
    this.tools.set('get_context', {
      name: 'get_context',
      description: 'Retrieve a specific context by ID',
      inputSchema: {
        type: 'object',
        properties: {
          contextId: { type: 'string', description: 'Context ID' },
          userId: { type: 'string', description: 'User ID' }
        },
        required: ['contextId', 'userId']
      }
    })

    // Tool 4: Generate Prompt Version
    this.tools.set('generate_prompt_version', {
      name: 'generate_prompt_version',
      description: 'Generate a prompt version of a context for AI agents',
      inputSchema: {
        type: 'object',
        properties: {
          contextId: { type: 'string', description: 'Context ID' },
          userId: { type: 'string', description: 'User ID' }
        },
        required: ['contextId', 'userId']
      }
    })

    // Tool 5: Find Related Contexts
    this.tools.set('find_related_contexts', {
      name: 'find_related_contexts',
      description: 'Find contexts related to a given context',
      inputSchema: {
        type: 'object',
        properties: {
          contextId: { type: 'string', description: 'Context ID' },
          userId: { type: 'string', description: 'User ID' },
          limit: { type: 'number', default: 5, description: 'Maximum number of related contexts' }
        },
        required: ['contextId', 'userId']
      }
    })

    // Tool 6: Get Project Contexts
    this.tools.set('get_project_contexts', {
      name: 'get_project_contexts',
      description: 'Get all contexts for a specific project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          userId: { type: 'string', description: 'User ID' },
          limit: { type: 'number', default: 50, description: 'Maximum number of contexts' },
          offset: { type: 'number', default: 0, description: 'Offset for pagination' }
        },
        required: ['projectId', 'userId']
      }
    })

    // Tool 7: Analyze Context
    this.tools.set('analyze_context', {
      name: 'analyze_context',
      description: 'Analyze a context and get AI insights',
      inputSchema: {
        type: 'object',
        properties: {
          contextId: { type: 'string', description: 'Context ID' },
          userId: { type: 'string', description: 'User ID' }
        },
        required: ['contextId', 'userId']
      }
    })
  }

  private setupHandlers() {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values())
      }
    })

    // Handle call tool request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      logger.info(`MCP Tool called: ${name}`, { args })

      try {
        switch (name) {
          case 'save_context':
            return await this.handleSaveContext(args)
          case 'search_contexts':
            return await this.handleSearchContexts(args)
          case 'get_context':
            return await this.handleGetContext(args)
          case 'generate_prompt_version':
            return await this.handleGeneratePromptVersion(args)
          case 'find_related_contexts':
            return await this.handleFindRelatedContexts(args)
          case 'get_project_contexts':
            return await this.handleGetProjectContexts(args)
          case 'analyze_context':
            return await this.handleAnalyzeContext(args)
          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        logger.error(`Error in MCP tool ${name}:`, error)
        throw error
      }
    })
  }

  private async handleSaveContext(args: any) {
    const { title, content, projectId, type, tags = [], source, userId } = args

    const context: Partial<Context> = {
      title,
      content,
      ...(projectId && { projectId: new ObjectId(projectId) }),
      userId: new ObjectId(userId),
      type,
      tags,
      source: {
        type: source?.type || 'manual',
        agentId: source?.agentId || '',
        sessionId: source?.sessionId || '',
        timestamp: new Date()
      },
      metadata: {},
      chunkIndex: 0,
      childContextIds: [],
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Generate embeddings
    context.embeddings = await getContextProcessor().generateEmbeddings(content)

    // Analyze context
    context.aiAnalysis = await getContextProcessor().analyzeContext(context as Context)

    // Save to database
    const collection = databaseService.getCollection<Context>('contexts')
    const result = await collection.insertOne(context as Context)

    return {
      success: true,
      contextId: result.insertedId.toString(),
      message: 'Context saved successfully'
    }
  }

  private async handleSearchContexts(args: any) {
    const { query, projectId, userId, filters = {}, limit = 10 } = args

    // Perform search
    const collection = databaseService.getCollection<Context>('contexts')
    
    let filter: any = { userId: new ObjectId(userId) }
    
    if (projectId) {
      filter.projectId = new ObjectId(projectId)
    }

    if (filters.types && filters.types.length > 0) {
      filter.type = { $in: filters.types }
    }

    if (filters.tags && filters.tags.length > 0) {
      filter.tags = { $in: filters.tags }
    }

    if (filters.dateRange) {
      filter.createdAt = {
        $gte: new Date(filters.dateRange.start),
        $lte: new Date(filters.dateRange.end)
      }
    }

    // Text search
    if (query) {
      filter.$text = { $search: query }
    }

    const contexts = await collection
      .find(filter)
      .sort(query ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .limit(limit)
      .toArray()

    return {
      success: true,
      contexts: contexts.map(ctx => ({
        id: ctx._id?.toString(),
        title: ctx.title,
        content: ctx.content,
        type: ctx.type,
        tags: ctx.tags,
        createdAt: ctx.createdAt,
        aiAnalysis: ctx.aiAnalysis
      })),
      total: contexts.length
    }
  }

  private async handleGetContext(args: any) {
    const { contextId, userId } = args

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(contextId),
      userId: new ObjectId(userId)
    })

    if (!context) {
      throw new Error('Context not found')
    }

    return {
      success: true,
      context: {
        id: context._id?.toString(),
        title: context.title,
        content: context.content,
        type: context.type,
        tags: context.tags,
        createdAt: context.createdAt,
        updatedAt: context.updatedAt,
        aiAnalysis: context.aiAnalysis,
        metadata: context.metadata
      }
    }
  }

  private async handleGeneratePromptVersion(args: any) {
    const { contextId, userId } = args

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(contextId),
      userId: new ObjectId(userId)
    })

    if (!context) {
      throw new Error('Context not found')
    }

    const promptVersion = await getContextProcessor().generatePromptVersion(context, "Generate prompt version", [])

    return {
      success: true,
      promptVersion
    }
  }

  private async handleFindRelatedContexts(args: any) {
    const { contextId, userId, limit = 5 } = args

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(contextId),
      userId: new ObjectId(userId)
    })

    if (!context) {
      throw new Error('Context not found')
    }

    // Get all contexts for the user
    const allContexts = await collection.find({
      userId: new ObjectId(userId),
      _id: { $ne: new ObjectId(contextId) }
    }).toArray()

    const relatedContexts = await getContextProcessor().findRelatedContexts(
      context,
      allContexts,
      limit
    )

    return {
      success: true,
      relatedContexts: relatedContexts.map(ctx => ({
        id: ctx._id?.toString(),
        title: ctx.title,
        content: ctx.content,
        type: ctx.type,
        tags: ctx.tags,
        createdAt: ctx.createdAt
      }))
    }
  }

  private async handleGetProjectContexts(args: any) {
    const { projectId, userId, limit = 50, offset = 0 } = args

    const collection = databaseService.getCollection<Context>('contexts')
    const contexts = await collection
      .find({
        projectId: new ObjectId(projectId),
        userId: new ObjectId(userId)
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()

    return {
      success: true,
      contexts: contexts.map(ctx => ({
        id: ctx._id?.toString(),
        title: ctx.title,
        content: ctx.content,
        type: ctx.type,
        tags: ctx.tags,
        createdAt: ctx.createdAt,
        aiAnalysis: ctx.aiAnalysis
      })),
      total: contexts.length
    }
  }

  private async handleAnalyzeContext(args: any) {
    const { contextId, userId } = args

    const collection = databaseService.getCollection<Context>('contexts')
    const context = await collection.findOne({
      _id: new ObjectId(contextId),
      userId: new ObjectId(userId)
    })

    if (!context) {
      throw new Error('Context not found')
    }

    // Re-analyze the context
    const analysis = await getContextProcessor().analyzeContext(context)

    // Update the context with new analysis
    await collection.updateOne(
      { _id: new ObjectId(contextId) },
      { 
        $set: { 
          aiAnalysis: analysis,
          updatedAt: new Date()
        }
      }
    )

    return {
      success: true,
      analysis
    }
  }

  async start() {
    try {
      // Connect to database
      await databaseService.connect()
      
      // Start MCP server
      const transport = new StdioServerTransport()
      await this.server.connect(transport)
      
      logger.info('Velto MCP Server started successfully')
    } catch (error) {
      logger.error('Failed to start Velto MCP Server:', error)
      throw error
    }
  }

  async stop() {
    try {
      await this.server.close()
      await databaseService.disconnect()
      logger.info('Velto MCP Server stopped')
    } catch (error) {
      logger.error('Error stopping Velto MCP Server:', error)
    }
  }
}

// Start the server if this file is run directly
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  const server = new VeltoMCPServer()
  
  server.start().catch((error) => {
    logger.error('Failed to start server:', error)
    process.exit(1)
  })

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })
}

export { VeltoMCPServer }
