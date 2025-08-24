import { ObjectId } from 'mongodb'

// Base entity interface
export interface BaseEntity {
  _id?: ObjectId
  createdAt: Date
  updatedAt: Date
}

// User interface
export interface User extends BaseEntity {
  email: string
  name?: string
  avatar?: string
  preferences: UserPreferences
  apiKeys: ApiKey[]
  isActive: boolean
}

export interface UserPreferences {
  defaultProjectId?: string
  theme: 'light' | 'dark' | 'auto'
  notifications: NotificationSettings
  aiProvider: 'anthropic' | 'openai' | 'google'
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  slack?: boolean
}

export interface ApiKey extends BaseEntity {
  name: string
  key: string
  permissions: string[]
  lastUsed?: Date
  isActive: boolean
}

// Project interface
export interface Project extends BaseEntity {
  name: string
  description?: string
  userId: ObjectId
  isPublic: boolean
  tags: string[]
  settings: ProjectSettings
  collaborators: Collaborator[]
}

export interface ProjectSettings {
  autoCategorize: boolean
  chunkSize: number
  maxTokens: number
  aiModel: string
}

export interface Collaborator {
  userId: ObjectId
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  addedAt: Date
}

// Context interfaces
export interface Context extends BaseEntity {
  title: string
  content: string
  projectId?: ObjectId
  userId: ObjectId
  type: ContextType
  source: ContextSource
  metadata: ContextMetadata
  tags: string[]
  
  // Enhanced embedding system
  embeddings?: {
    content: number[];        // Main content vector (required)
    title: number[];          // Title vector (optional)
    summary: number[];        // Summary vector (optional)
    model: string;            // e.g., "text-embedding-004"
    dimensions: number;       // Vector dimensions
    generatedAt: Date;
    version: string;          // Embedding model version
  };
  
  // Vector search optimization
  vectorMetadata?: {
    lastIndexed: Date;
    searchScore?: number;
    similarityCache?: Map<string, number>; // Cache similarity scores
  };
  
  chunkIndex: number
  parentContextId?: ObjectId
  childContextIds: ObjectId[]
  aiAnalysis?: AIAnalysis
  isArchived: boolean
}

export type ContextType = 
  | 'conversation'
  | 'code'
  | 'documentation'
  | 'research'
  | 'idea'
  | 'task'
  | 'note'
  | 'meeting'
  | 'email'
  | 'webpage'
  | 'file'
  | 'image'
  | 'audio'
  | 'video'

export interface ContextSource {
  type: 'claude' | 'cursor' | 'copilot' | 'windsurf' | 'manual' | 'api' | 'webhook'
  agentId?: string
  sessionId?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ContextMetadata {
  language?: string
  framework?: string
  technology?: string
  complexity?: 'low' | 'medium' | 'high'
  importance?: 'low' | 'medium' | 'high'
  urgency?: 'low' | 'medium' | 'high'
  estimatedTime?: number
  actualTime?: number
  status?: 'pending' | 'in-progress' | 'completed' | 'archived'
  priority?: number
  customFields?: Record<string, any>
}

export interface AIAnalysis {
  summary: string
  keywords: string[]
  categories: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  complexity: 'low' | 'medium' | 'high'
  suggestedActions: string[]
  relatedContexts: ObjectId[]
  confidence: number
  analyzedAt: Date
  breakdown?: {
    mainTopics: string[]
    subTopics: string[]
    entities: string[]
    questions: string[]
    assumptions: string[]
    constraints: string[]
    opportunities: string[]
    risks: string[]
  }
  relationships?: {
    dependsOn: string[]
    implements: string[]
    references: string[]
    conflicts: string[]
    enhances: string[]
  }
}

// Graph and relationship interfaces
export interface ContextGraph extends BaseEntity {
  projectId: ObjectId
  nodes: GraphNode[]
  edges: GraphEdge[]
  layout: GraphLayout
}

export interface GraphNode {
  id: string
  contextId: ObjectId
  type: ContextType
  position: { x: number; y: number }
  size: { width: number; height: number }
  color?: string
  label?: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'related' | 'depends_on' | 'implements' | 'references' | 'similar'
  weight: number
  label?: string
  metadata?: {
    similarityType: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
    relationshipStrength: 'strong' | 'moderate' | 'weak'
    commonTopics: string[]
    temporalProximity: number
    semanticOverlap: number
    dependencyDepth: number
    relationshipConfidence: number
  }
}

export interface GraphLayout {
  type: 'force' | 'hierarchical' | 'circular' | 'custom'
  settings: Record<string, any>
}

// Search and query interfaces
export interface SearchQuery {
  query: string
  projectId?: ObjectId
  userId: ObjectId
  filters: SearchFilters
  sort: SearchSort
  pagination: Pagination
}

export interface SearchFilters {
  types?: ContextType[]
  tags?: string[]
  dateRange?: { start: Date; end: Date }
  status?: string[]
  complexity?: string[]
  importance?: string[]
  hasEmbeddings?: boolean
}

export interface SearchSort {
  field: 'relevance' | 'createdAt' | 'updatedAt' | 'title' | 'importance'
  direction: 'asc' | 'desc'
}

export interface Pagination {
  page: number
  limit: number
  total?: number
}

export interface SearchResult {
  contexts: Context[]
  total: number
  page: number
  limit: number
  facets: SearchFacets
}

export interface SearchFacets {
  types: Record<ContextType, number>
  tags: Record<string, number>
  status: Record<string, number>
  complexity: Record<string, number>
}

// MCP interfaces
export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
  handler: (params: any) => Promise<any>
}

export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

// AI Provider interfaces
export interface AIProvider {
  name: string
  models: AIModel[]
  capabilities: AICapability[]
}

export interface AIModel {
  id: string
  name: string
  provider: string
  maxTokens: number
  contextWindow: number
  capabilities: AICapability[]
}

export type AICapability = 
  | 'text-generation'
  | 'text-embedding'
  | 'text-classification'
  | 'text-summarization'
  | 'code-generation'
  | 'code-analysis'
  | 'image-generation'
  | 'image-analysis'

// API Response interfaces
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: Pagination
  preservationMetrics?: {
    averagePreservation: number
    highPreservationCount: number
    totalResults: number
  }
}

export interface APIError {
  code: string
  message: string
  details?: any
  timestamp: Date
}

// Webhook interfaces
export interface WebhookPayload {
  event: string
  timestamp: Date
  data: any
  signature?: string
}

export interface WebhookSubscription extends BaseEntity {
  userId: ObjectId
  url: string
  events: string[]
  isActive: boolean
  secret?: string
  lastTriggered?: Date
  failureCount: number
}

// Analytics interfaces
export interface AnalyticsEvent extends BaseEntity {
  userId: ObjectId
  event: string
  properties: Record<string, any>
  sessionId?: string
  userAgent?: string
  ipAddress?: string
}

export interface UserAnalytics {
  userId: ObjectId
  totalContexts: number
  totalProjects: number
  lastActive: Date
  usageStats: UsageStats
}

export interface UsageStats {
  contextsCreated: number
  contextsViewed: number
  searchesPerformed: number
  aiQueries: number
  storageUsed: number
  period: 'day' | 'week' | 'month' | 'year'
}

// Vector similarity utility types
export interface VectorSimilarity {
  contextId: ObjectId
  similarity: number
  contentScore: number
  titleScore: number
  summaryScore: number
  weightedScore: number
}

export interface EmbeddingModel {
  name: string
  dimensions: number
  provider: string
  version: string
  maxTokens: number
}

// Utility functions for vector operations
export function calculateCosineSimilarity(vec1: number[] | undefined, vec2: number[] | undefined): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    const val1 = vec1[i] || 0;
    const val2 = vec2[i] || 0;
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (norm1 * norm2);
}

export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}
