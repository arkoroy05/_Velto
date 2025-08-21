import { MongoClient, Db, Collection, Document } from 'mongodb'
import { logger } from '../utils/logger'

export class DatabaseService {
  private client: MongoClient | null = null
  private db: Db | null = null
  private static instance: DatabaseService

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  public async connect(): Promise<void> {
    try {
      const uri = process.env['MONGODB_URI']
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is required')
      }

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })

      await this.client.connect()
      this.db = this.client.db('velto-memory')
      
      logger.info('Successfully connected to MongoDB')
      
      // Create indexes for better performance
      await this.createIndexes()
      
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error)
      throw error
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close()
        this.client = null
        this.db = null
        logger.info('Disconnected from MongoDB')
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error)
      throw error
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.db
  }

  public getCollection<T extends Document>(name: string): Collection<T> {
    return this.getDb().collection<T>(name)
  }

  private async createIndexes(): Promise<void> {
    try {
      const db = this.getDb()

      // Users collection indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true })
      await db.collection('users').createIndex({ 'apiKeys.key': 1 })

      // Projects collection indexes
      await db.collection('projects').createIndex({ userId: 1 })
      await db.collection('projects').createIndex({ tags: 1 })
      await db.collection('projects').createIndex({ isPublic: 1 })

      // Contexts collection indexes
      await db.collection('contexts').createIndex({ userId: 1 })
      await db.collection('contexts').createIndex({ projectId: 1 })
      await db.collection('contexts').createIndex({ type: 1 })
      await db.collection('contexts').createIndex({ tags: 1 })
      await db.collection('contexts').createIndex({ 'source.type': 1 })
      await db.collection('contexts').createIndex({ createdAt: -1 })
      await db.collection('contexts').createIndex({ updatedAt: -1 })
      await db.collection('contexts').createIndex({ isArchived: 1 })

      // Text search index for contexts
      await db.collection('contexts').createIndex({
        title: 'text',
        content: 'text',
        tags: 'text'
      })

      // Context graphs indexes
      await db.collection('contextGraphs').createIndex({ projectId: 1 })

      // Search queries indexes
      await db.collection('searchQueries').createIndex({ userId: 1 })
      await db.collection('searchQueries').createIndex({ createdAt: -1 })

      // Webhook subscriptions indexes
      await db.collection('webhookSubscriptions').createIndex({ userId: 1 })
      await db.collection('webhookSubscriptions').createIndex({ isActive: 1 })

      // Analytics indexes
      await db.collection('analyticsEvents').createIndex({ userId: 1 })
      await db.collection('analyticsEvents').createIndex({ event: 1 })
      await db.collection('analyticsEvents').createIndex({ createdAt: -1 })

      logger.info('Database indexes created successfully')
    } catch (error) {
      logger.error('Error creating database indexes:', error)
      throw error
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        return false
      }
      
      await this.db.admin().ping()
      return true
    } catch (error) {
      logger.error('Database health check failed:', error)
      return false
    }
  }

  public async getStats(): Promise<any> {
    try {
      const db = this.getDb()
      const stats = await db.stats()
      
      // Get collection stats
      const collections = await db.listCollections().toArray()
      const collectionStats: Record<string, any> = {}
      
      for (const collection of collections) {
        const collectionName = collection.name
        try {
          // Use aggregate to get collection stats instead of the deprecated stats() method
          const statsPipeline = [
            { $collStats: { latencyStats: { histograms: true } } },
            { $group: { _id: null, count: { $sum: 1 }, size: { $sum: "$size" } } }
          ]
          
          const statsResult = await db.collection(collectionName).aggregate(statsPipeline).toArray()
          const collectionStatsData = statsResult[0] || { count: 0, size: 0 }
          
          collectionStats[collectionName] = {
            count: collectionStatsData['count'] || 0,
            size: collectionStatsData['size'] || 0,
            avgObjSize: collectionStatsData['size'] && collectionStatsData['count'] ? 
              Math.round(collectionStatsData['size'] / collectionStatsData['count']) : 0,
            storageSize: collectionStatsData['size'] || 0,
            indexes: 0 // We'll get this from the collection info
          }
        } catch (error) {
          logger.warn(`Could not get stats for collection ${collectionName}:`, error)
        }
      }
      
      return {
        database: stats['db'],
        collections: collectionStats,
        totalCollections: collections.length
      }
    } catch (error) {
      logger.error('Error getting database stats:', error)
      throw error
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance()
