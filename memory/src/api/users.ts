import express from 'express'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { databaseService } from '../services/database'
import { User, ApiKey, APIResponse } from '../types'
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
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  preferences: z.object({
    defaultProjectId: z.string().optional(),
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      slack: z.boolean().optional()
    }).default({}),
    aiProvider: z.enum(['anthropic', 'openai', 'google']).default('anthropic')
  }).default({}),
  apiKeys: z.array(z.object({
    name: z.string().min(1).max(50),
    permissions: z.array(z.string()).default(['read'])
  })).default([])
})

const UpdateUserSchema = CreateUserSchema.partial()

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.array(z.string()).default(['read'])
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

// GET /api/v1/users - List users (admin only)
router.get('/', extractUserId, async (req, res): Promise<void> => {
  try {
    const { 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive,
      search
    } = req.query

    const collection = databaseService.getCollection<User>('users')
    
    let filter: any = {}
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }
    
    if (search) {
      filter.$or = [
        { email: { $regex: search as string, $options: 'i' } },
        { name: { $regex: search as string, $options: 'i' } }
      ]
    }

    const sort: any = {}
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1

    const users = await collection
      .find(filter)
      .sort(sort)
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray()

    const total = await collection.countDocuments(filter)

    const response: APIResponse = {
      success: true,
      data: users.map(user => ({
        id: user._id?.toString(),
        email: user.email,
        name: user.name,
        preferences: user.preferences,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      pagination: {
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
        total
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching users:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    })
  }
})

// GET /api/v1/users/:id - Get specific user
router.get('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      })
      return
    }

    const collection = databaseService.getCollection<User>('users')
    const user = await collection.findOne({ _id: new ObjectId(id) })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    res.json({
      success: true,
      data: {
        id: user._id?.toString(),
        email: user.email,
        name: user.name,
        preferences: user.preferences,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    logger.error('Error fetching user:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    })
  }
})

// GET /api/v1/users/profile - Get current user profile
router.get('/profile', extractUserId, async (req, res): Promise<void> => {
  try {
    const collection = databaseService.getCollection<User>('users')
    const user = await collection.findOne({ _id: new ObjectId(req.userId!) })

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    res.json({
      success: true,
      data: {
        id: user._id?.toString(),
        email: user.email,
        name: user.name,
        preferences: user.preferences,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    logger.error('Error fetching user profile:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    })
  }
})

// POST /api/v1/users - Create new user
router.post('/', async (req, res): Promise<void> => {
  try {
    const validatedData = CreateUserSchema.parse(req.body)
    
    const user: Omit<User, '_id'> = {
      email: validatedData.email,
      name: validatedData.name || '',
      preferences: {
        ...validatedData.preferences,
        defaultProjectId: validatedData.preferences.defaultProjectId || '',
        notifications: {
          ...validatedData.preferences.notifications,
          slack: validatedData.preferences.notifications.slack || false
        }
      },
      apiKeys: validatedData.apiKeys.map(key => ({
        name: key.name,
        key: generateApiKey(),
        permissions: key.permissions,
        lastUsed: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const collection = databaseService.getCollection<User>('users')
    const result = await collection.insertOne(user as User)

    logger.info(`User created: ${result.insertedId}`)

    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        email: user.email,
        name: user.name,
        preferences: user.preferences
      },
      message: 'User created successfully'
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
    
    logger.error('Error creating user:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    })
  }
})

// PUT /api/v1/users/:id - Update user
router.put('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      })
      return
    }

    const validatedData = UpdateUserSchema.parse(req.body)
    
    const collection = databaseService.getCollection<User>('users')
    
    // Check if user exists
    const existingUser = await collection.findOne({ _id: new ObjectId(id) })

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    logger.info(`User updated: ${id}`)

    res.json({
      success: true,
      message: 'User updated successfully'
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
    
    logger.error('Error updating user:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    })
  }
})

// DELETE /api/v1/users/:id - Delete user
router.delete('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      })
      return
    }

    const collection = databaseService.getCollection<User>('users')
    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    logger.info(`User deleted: ${id}`)

    res.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting user:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    })
  }
})

// POST /api/v1/users/:id/api-keys - Create API key
router.post('/:id/api-keys', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    const validatedData = CreateApiKeySchema.parse(req.body)
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      })
      return
    }

    const collection = databaseService.getCollection<User>('users')
    
    const apiKey: Omit<ApiKey, '_id'> = {
      name: validatedData.name,
      key: generateApiKey(),
      permissions: validatedData.permissions,
      lastUsed: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { apiKeys: apiKey } }
    )

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    logger.info(`API key created for user: ${id}`)

    res.status(201).json({
      success: true,
      data: {
        name: apiKey.name,
        key: apiKey.key,
        permissions: apiKey.permissions
      },
      message: 'API key created successfully'
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
    
    logger.error('Error creating API key:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create API key'
    })
  }
})

// DELETE /api/v1/users/:id/api-keys/:keyName - Delete API key
router.delete('/:id/api-keys/:keyName', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id, keyName } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      })
      return
    }

    const collection = databaseService.getCollection<User>('users')
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { apiKeys: { name: keyName || '' } } }
    )

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      })
      return
    }

    logger.info(`API key deleted for user: ${id}`)

    res.json({
      success: true,
      message: 'API key deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting API key:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key'
    })
  }
})

// Helper function to generate API key
function generateApiKey(): string {
  return 'velto_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export default router
