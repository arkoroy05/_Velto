import express from 'express'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { databaseService } from '../services/database'
import { APIResponse } from '../types'
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

// Webhook interface
interface Webhook {
  _id?: ObjectId
  name: string
  url: string
  events: string[]
  userId: ObjectId
  isActive: boolean
  secret?: string
  headers?: Record<string, string>
  retryCount: number
  maxRetries: number
  lastTriggered?: Date
  lastResponse?: {
    status: number
    body: string
    timestamp: Date
  }
  createdAt: Date
  updatedAt: Date
}

// Validation schemas
const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  maxRetries: z.number().min(0).max(10).default(3)
})

const UpdateWebhookSchema = CreateWebhookSchema.partial()

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

// GET /api/v1/webhooks - List webhooks
router.get('/', extractUserId, async (req, res): Promise<void> => {
  try {
    const { 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive,
      events
    } = req.query

    const collection = databaseService.getCollection<Webhook>('webhooks')
    
    let filter: any = { userId: new ObjectId(req.userId!) }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }
    
    if (events) {
      const eventArray = Array.isArray(events) ? events : [events]
      filter.events = { $in: eventArray }
    }

    const sort: any = {}
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1

    const webhooks = await collection
      .find(filter)
      .sort(sort)
      .skip(Number(offset))
      .limit(Number(limit))
      .toArray()

    const total = await collection.countDocuments(filter)

    const response: APIResponse = {
      success: true,
      data: webhooks.map(webhook => ({
        id: webhook._id?.toString(),
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        retryCount: webhook.retryCount,
        maxRetries: webhook.maxRetries,
        lastTriggered: webhook.lastTriggered,
        lastResponse: webhook.lastResponse,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      })),
      pagination: {
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
        total
      }
    }

    res.json(response)
  } catch (error) {
    logger.error('Error fetching webhooks:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhooks'
    })
  }
})

// GET /api/v1/webhooks/:id - Get specific webhook
router.get('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid webhook ID'
      })
      return
    }

    const collection = databaseService.getCollection<Webhook>('webhooks')
    const webhook = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found'
      })
      return
    }

    res.json({
      success: true,
      data: {
        id: webhook._id?.toString(),
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        secret: webhook.secret ? '***' : undefined,
        headers: webhook.headers,
        retryCount: webhook.retryCount,
        maxRetries: webhook.maxRetries,
        lastTriggered: webhook.lastTriggered,
        lastResponse: webhook.lastResponse,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      }
    })
  } catch (error) {
    logger.error('Error fetching webhook:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook'
    })
  }
})

// POST /api/v1/webhooks - Create new webhook
router.post('/', extractUserId, async (req, res): Promise<void> => {
  try {
    const validatedData = CreateWebhookSchema.parse(req.body)
    
    const webhook: Omit<Webhook, '_id'> = {
      name: validatedData.name,
      url: validatedData.url,
      events: validatedData.events,
      userId: new ObjectId(req.userId!),
      isActive: validatedData.isActive,
      secret: validatedData.secret || generateWebhookSecret(),
      headers: validatedData.headers || {},
      retryCount: 0,
      maxRetries: validatedData.maxRetries,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const collection = databaseService.getCollection<Webhook>('webhooks')
    const result = await collection.insertOne(webhook as Webhook)

    logger.info(`Webhook created: ${result.insertedId}`)

    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        maxRetries: webhook.maxRetries
      },
      message: 'Webhook created successfully'
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
    
    logger.error('Error creating webhook:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create webhook'
    })
  }
})

// PUT /api/v1/webhooks/:id - Update webhook
router.put('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid webhook ID'
      })
      return
    }

    const validatedData = UpdateWebhookSchema.parse(req.body)
    
    const collection = databaseService.getCollection<Webhook>('webhooks')
    
    // Check if webhook exists and belongs to user
    const existingWebhook = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!existingWebhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found'
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
        error: 'Webhook not found'
      })
      return
    }

    logger.info(`Webhook updated: ${id}`)

    res.json({
      success: true,
      message: 'Webhook updated successfully'
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
    
    logger.error('Error updating webhook:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update webhook'
    })
  }
})

// DELETE /api/v1/webhooks/:id - Delete webhook
router.delete('/:id', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid webhook ID'
      })
      return
    }

    const collection = databaseService.getCollection<Webhook>('webhooks')
    const result = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found'
      })
      return
    }

    logger.info(`Webhook deleted: ${id}`)

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting webhook:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook'
    })
  }
})

// POST /api/v1/webhooks/:id/test - Test webhook
router.post('/:id/test', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid webhook ID'
      })
      return
    }

    const collection = databaseService.getCollection<Webhook>('webhooks')
    const webhook = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found'
      })
      return
    }

    if (!webhook.isActive) {
      res.status(400).json({
        success: false,
        error: 'Webhook is not active'
      })
      return
    }

    // Test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Velto',
        webhookId: id,
        webhookName: webhook.name
      }
    }

    try {
      // Send test webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Velto-Webhook/1.0',
          'X-Velto-Event': 'test',
          'X-Velto-Signature': generateSignature(testPayload, webhook.secret || ''),
          ...webhook.headers
        },
        body: JSON.stringify(testPayload)
      })

      const responseBody = await response.text()

      // Update webhook with test results
      await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            lastTriggered: new Date(),
            lastResponse: {
              status: response.status,
              body: responseBody,
              timestamp: new Date()
            },
            updatedAt: new Date()
          }
        }
      )

      res.json({
        success: true,
        data: {
          status: response.status,
          body: responseBody,
          timestamp: new Date()
        },
        message: 'Webhook test completed'
      })
    } catch (fetchError) {
      logger.error('Error testing webhook:', fetchError)
      
      // Update webhook with error results
      await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            lastTriggered: new Date(),
            lastResponse: {
              status: 0,
              body: 'Network error: ' + (fetchError as Error).message,
              timestamp: new Date()
            },
            updatedAt: new Date()
          }
        }
      )

      res.status(500).json({
        success: false,
        error: 'Failed to test webhook',
        details: (fetchError as Error).message
      })
    }
  } catch (error) {
    logger.error('Error testing webhook:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to test webhook'
    })
  }
})

// POST /api/v1/webhooks/:id/regenerate-secret - Regenerate webhook secret
router.post('/:id/regenerate-secret', extractUserId, async (req, res): Promise<void> => {
  try {
    const { id } = req.params
    
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid webhook ID'
      })
      return
    }

    const collection = databaseService.getCollection<Webhook>('webhooks')
    
    // Check if webhook exists and belongs to user
    const existingWebhook = await collection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.userId!)
    })

    if (!existingWebhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found'
      })
      return
    }

    const newSecret = generateWebhookSecret()

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          secret: newSecret,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found'
      })
      return
    }

    logger.info(`Webhook secret regenerated: ${id}`)

    res.json({
      success: true,
      message: 'Webhook secret regenerated successfully'
    })
  } catch (error) {
    logger.error('Error regenerating webhook secret:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate webhook secret'
    })
  }
})

// Helper functions
function generateWebhookSecret(): string {
  return 'whsec_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateSignature(payload: any, secret: string): string {
  const crypto = require('crypto')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(JSON.stringify(payload))
  return hmac.digest('hex')
}

export default router
