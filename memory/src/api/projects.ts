import express from 'express'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { databaseService } from '../services/database'
import { Project, APIResponse } from '../types'
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
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  settings: z.object({
    autoCategorize: z.boolean().default(true),
    chunkSize: z.number().min(100).max(10000).default(1000),
    maxTokens: z.number().min(1000).max(100000).default(8000),
    aiModel: z.string().default('gpt-4')
  }).default({}),
  collaborators: z.array(z.object({
    userId: z.string(),
    role: z.enum(['owner', 'admin', 'editor', 'viewer']).default('viewer')
  })).default([])
})

const UpdateProjectSchema = CreateProjectSchema.partial()

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

// GET /api/v1/projects - List projects
router.get('/', extractUserId, async (req, res): Promise<void> => {
  try {
    const { 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isPublic,
      tags
    } = req.query

    const collection = databaseService.getCollection<Project>('projects')
    
    let filter: any = { 
      $or: [
        { userId: new ObjectId(req.userId!) },
        { 'collaborators.userId': req.userId! }
      ]
    }
    
    if (isPublic !== undefined) {
      filter.isPublic = isPublic === 'true'
    }
    
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags]
      filter.tags = { $in: tagArray }
    }

    const sort: any = {}
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1

    const projects = await collection
      .find(filter)
      .sort(sort)
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray()

    const total = await collection.countDocuments(filter)

    const response: APIResponse = {
      success: true,
      data: projects.map(project => ({
        id: project._id?.toString(),
        name: project.name,
        description: project.description,
        isPublic: project.isPublic,
        tags: project.tags,
        settings: project.settings,
        collaborators: project.collaborators,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      })),
      pagination: {
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
        total
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching projects:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    })
  }
})

// GET /api/v1/projects/:id - Get specific project
router.get('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      })
      return
    }

    const collection = databaseService.getCollection<Project>('projects')
    const project = await collection.findOne({
      _id: new ObjectId(id),
      $or: [
        { userId: new ObjectId(req.userId!) },
        { 'collaborators.userId': req.userId! }
      ]
    })

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      })
      return
    }

    res.json({
      success: true,
      data: {
        id: project._id?.toString(),
        name: project.name,
        description: project.description,
        isPublic: project.isPublic,
        tags: project.tags,
        settings: project.settings,
        collaborators: project.collaborators,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    })
  } catch (error) {
    logger.error('Error fetching project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    })
  }
})

// POST /api/v1/projects - Create new project
router.post('/', extractUserId, async (req, res): Promise<void> => {
  try {
    const validatedData = CreateProjectSchema.parse(req.body)
    
    const project: Omit<Project, '_id'> = {
      name: validatedData.name,
      description: validatedData.description || '',
      isPublic: validatedData.isPublic,
      tags: validatedData.tags,
      settings: validatedData.settings,
      userId: new ObjectId(req.userId!),
      collaborators: [
        { userId: new ObjectId(req.userId!), role: 'owner', addedAt: new Date() },
        ...validatedData.collaborators.map(c => ({
          userId: new ObjectId(c.userId),
          role: c.role,
          addedAt: new Date()
        }))
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const collection = databaseService.getCollection<Project>('projects')
    const result = await collection.insertOne(project as Project)

    logger.info(`Project created: ${result.insertedId}`)

    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        name: project.name,
        description: project.description,
        isPublic: project.isPublic,
        tags: project.tags,
        settings: project.settings,
        collaborators: project.collaborators
      },
      message: 'Project created successfully'
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
    
    logger.error('Error creating project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    })
  }
})

// PUT /api/v1/projects/:id - Update project
router.put('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      })
      return
    }

    const validatedData = UpdateProjectSchema.parse(req.body)
    
    const collection = databaseService.getCollection<Project>('projects')
    
    // Check if project exists and user has permission
    const existingProject = await collection.findOne({
      _id: new ObjectId(id),
      $or: [
        { userId: new ObjectId(req.userId!) },
        { 'collaborators.userId': req.userId!, 'collaborators.role': { $in: ['owner', 'admin'] } }
      ]
    })

    if (!existingProject) {
      res.status(404).json({
        success: false,
        error: 'Project not found or insufficient permissions'
      })
      return
    }

    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    }

    // Update collaborators if provided
    if (validatedData.collaborators) {
      updateData.collaborators = [
        { userId: req.userId!, role: 'owner' },
        ...validatedData.collaborators.map(c => ({
          userId: new ObjectId(c.userId),
          role: c.role,
          addedAt: new Date()
        }))
      ]
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      })
      return
    }

    logger.info(`Project updated: ${id}`)

    res.json({
      success: true,
      message: 'Project updated successfully'
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
    
    logger.error('Error updating project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    })
  }
})

// DELETE /api/v1/projects/:id - Delete project
router.delete('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      })
      return
    }

    const collection = databaseService.getCollection<Project>('projects')
    
    // Only project owner can delete
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found or insufficient permissions'
      })
      return
    }

    logger.info(`Project deleted: ${id}`)

    res.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting project:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    })
  }
})

// POST /api/v1/projects/:id/collaborators - Add collaborator
router.post('/:id/collaborators', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    const { userId: collaboratorId, role } = req.body
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      })
      return
    }

    if (!collaboratorId || !role) {
      res.status(400).json({
        success: false,
        error: 'Collaborator ID and role required'
      })
      return
    }

    const collection = databaseService.getCollection<Project>('projects')
    
    // Check if project exists and user has permission
    const existingProject = await collection.findOne({
      _id: new ObjectId(id),
      $or: [
        { userId: new ObjectId(req.userId!) },
        { 'collaborators.userId': req.userId!, 'collaborators.role': { $in: ['owner', 'admin'] } }
      ]
    })

    if (!existingProject) {
      res.status(404).json({
        success: false,
        error: 'Project not found or insufficient permissions'
      })
      return
    }

    // Add collaborator
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $push: { 
          collaborators: {
            userId: new ObjectId(collaboratorId),
            role,
            addedAt: new Date()
          }
        }
      }
    )

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      })
      return
    }

    logger.info(`Collaborator added to project: ${id}`)

    res.json({
      success: true,
      message: 'Collaborator added successfully'
    })
  } catch (error) {
    logger.error('Error adding collaborator:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to add collaborator'
    })
  }
})

export default router
