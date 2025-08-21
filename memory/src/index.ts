import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { databaseService } from './services/database'
import { logger, requestLogger, errorLogger } from './utils/logger'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Import API routes
import contextRoutes from './api/contexts'
import projectRoutes from './api/projects'
import userRoutes from './api/users'
import searchRoutes from './api/search'
import webhookRoutes from './api/webhooks'
import analyticsRoutes from './api/analytics'

const app = express()
const PORT = parseInt(process.env['PORT'] || '3001', 10)

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  }
})

// Rate limiting middleware is applied directly

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
  credentials: true
}))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(rateLimiter)
app.use(requestLogger)

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck()
    const uptime = process.uptime()
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      database: dbHealth ? 'connected' : 'disconnected',
      version: process.env['npm_package_version'] || '1.0.0'
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Service unavailable'
    })
  }
})

// API routes
app.use('/api/v1/contexts', contextRoutes)
app.use('/api/v1/projects', projectRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/search', searchRoutes)
app.use('/api/v1/webhooks', webhookRoutes)
app.use('/api/v1/analytics', analyticsRoutes)

// API documentation endpoint
app.get('/api/v1/docs', (_req, res) => {
  res.json({
    success: true,
    message: 'Velto Memory API Documentation',
    version: '1.0.0',
    endpoints: {
      contexts: '/api/v1/contexts',
      projects: '/api/v1/projects',
      users: '/api/v1/users',
      search: '/api/v1/search',
      webhooks: '/api/v1/webhooks',
      analytics: '/api/v1/analytics'
    },
    documentation: 'https://docs.velto.ai'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  })
})

// Error handling middleware
app.use(errorLogger)

// Global error handler
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', error)
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    ...(process.env['NODE_ENV'] === 'development' && { stack: error.stack })
  })
})

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`)
  
  try {
    await databaseService.disconnect()
    logger.info('Database disconnected')
    
    process.exit(0)
  } catch (error) {
    logger.error('Error during graceful shutdown:', error)
    process.exit(1)
  }
}

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await databaseService.connect()
    logger.info('Connected to MongoDB')
    
    // Start Express server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Velto Memory Backend server running on port ${PORT}`)
      logger.info(`📊 Health check: http://0.0.0.0:${PORT}/health`)
      logger.info(`📚 API docs: http://0.0.0.0:${PORT}/api/v1/docs`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('unhandledRejection')
})

// Start the server
startServer()

export default app
