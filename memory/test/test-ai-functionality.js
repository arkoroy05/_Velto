#!/usr/bin/env node

/**
 * AI Functionality Test Script for Velto Memory Backend
 * 
 * This script specifically tests:
 * - AI analysis and breakdowns
 * - Context graph creation
 * - RAG functionality
 * - Semantic search
 * - Context relationships
 */

const BASE_URL = 'http://localhost:3001'

// Generate unique test data
const generateUniqueData = () => {
  const timestamp = Date.now()
  const uniqueId = Math.random().toString(36).substring(2, 8)
  
  return {
    email: `ai-test-${timestamp}@velto.ai`,
    name: `AI Test User ${timestamp}`,
    projectName: `AI Test Project ${uniqueId}`,
    projectDescription: `A comprehensive project for testing AI functionality, context graphs, and breakdowns. This project focuses on implementing advanced AI features including semantic search, RAG, and context relationship mapping.`,
    contexts: [
      {
        title: `AI Strategy Meeting ${uniqueId}`,
        content: `Strategic discussion about implementing AI-powered features in our platform. Key decisions: 1) Implement semantic search using embeddings, 2) Build context graphs for relationship mapping, 3) Develop RAG system for intelligent responses, 4) Create automated context breakdowns. Team consensus: prioritize semantic search first, then context graphs.`,
        type: 'meeting',
        tags: ['ai', 'strategy', 'semantic-search', 'context-graphs', 'rag']
      },
      {
        title: `Technical Architecture: Context Processing ${uniqueId}`,
        content: `Technical architecture for context processing system. Components: 1) Context ingestion pipeline with AI analysis, 2) Embedding generation using Google Gemini, 3) Context graph builder with relationship detection, 4) Semantic search engine with cosine similarity, 5) RAG response generator. Dependencies: MongoDB for storage, Google Gemini API for AI processing.`,
        type: 'documentation',
        tags: ['architecture', 'ai', 'context-processing', 'embeddings', 'gemini']
      },
      {
        title: `Implementation Plan: Semantic Search ${uniqueId}`,
        content: `Implementation plan for semantic search functionality. Phase 1: Set up embedding generation pipeline using Google Gemini text-embedding-004 model. Phase 2: Implement cosine similarity calculation for context matching. Phase 3: Build search API with filters for type, tags, and date range. Phase 4: Integrate with context graph for relationship-based search. Timeline: 2 weeks.`,
        type: 'task',
        tags: ['implementation', 'semantic-search', 'embeddings', 'api', 'timeline']
      },
      {
        title: `Research: Context Graph Visualization ${uniqueId}`,
        content: `Research findings on context graph visualization techniques. Best practices: 1) Force-directed layout for dynamic positioning, 2) Color coding by context type, 3) Edge weights based on similarity scores, 4) Interactive node expansion for detailed views. Tools: D3.js for visualization, WebGL for large graphs. Performance considerations: Implement virtual scrolling for graphs with 1000+ nodes.`,
        type: 'research',
        tags: ['visualization', 'context-graphs', 'd3js', 'performance', 'interactive']
      },
      {
        title: `Code Review: Context Processor ${uniqueId}`,
        content: `Code review for the ContextProcessor class. Strengths: Clean separation of concerns, proper error handling, fallback mechanisms for API failures. Areas for improvement: 1) Add caching for embeddings to reduce API calls, 2) Implement batch processing for multiple contexts, 3) Add metrics for AI processing performance, 4) Consider async queue for high-volume processing. Code quality: 8/10.`,
        type: 'code',
        tags: ['code-review', 'context-processor', 'performance', 'caching', 'metrics']
      }
    ]
  }
}

// Utility functions
const log = (message, data = null) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`)
  if (data) {
    console.log(JSON.stringify(data, null, 2))
  }
}

const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  const url = `${BASE_URL}${endpoint}`
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }
  
  if (data) {
    options.body = JSON.stringify(data)
  }
  
  try {
    const response = await fetch(url, options)
    const responseData = await response.text()
    
    let parsedData
    try {
      parsedData = JSON.parse(responseData)
    } catch {
      parsedData = { raw: responseData }
    }
    
    if (!response.ok) {
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        data: parsedData
      }
    }
    
    return { data: parsedData }
  } catch (error) {
    return { error: error.message }
  }
}

// Test functions
const testAIAnalysis = async (contextId, userId) => {
  log('🧠 Testing AI Analysis...')
  
  const result = await makeRequest('POST', `/api/v1/contexts/${contextId}/analyze`, null, {
    'x-user-id': userId
  })
  
  if (result.error) {
    log('❌ AI Analysis failed:', result)
    return false
  }
  
  const analysis = result.data.data
  log('✅ AI Analysis completed successfully')
  log('📊 Analysis Summary:', {
    summary: analysis.summary,
    keywords: analysis.keywords,
    categories: analysis.categories,
    sentiment: analysis.sentiment,
    complexity: analysis.complexity,
    confidence: analysis.confidence
  })
  
  if (analysis.breakdown) {
    log('🔍 Context Breakdown:', analysis.breakdown)
  }
  
  if (analysis.relationships) {
    log('🔗 Context Relationships:', analysis.relationships)
  }
  
  return true
}

const testContextGraphCreation = async (projectId, userId) => {
  log('🕸️ Testing Context Graph Creation...')
  
  // First, get a context from the project
  const contextsResult = await makeRequest('GET', `/api/v1/contexts?projectId=${projectId}&userId=${userId}`)
  
  if (contextsResult.error || !contextsResult.data.data || contextsResult.data.data.length === 0) {
    log('❌ No contexts found for project')
    return false
  }
  
  const firstContext = contextsResult.data.data[0]
  const contextId = firstContext.id
  
  // Get the context graph
  const graphResult = await makeRequest('GET', `/api/v1/contexts/${contextId}/graph`, null, {
    'x-user-id': userId
  })
  
  if (graphResult.error) {
    log('❌ Context Graph retrieval failed:', graphResult)
    return false
  }
  
  const graph = graphResult.data.data
  log('✅ Context Graph created successfully')
  log('🕸️ Graph Structure:', {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    layout: graph.layout.type
  })
  
  // Show some node details
  if (graph.nodes.length > 0) {
    log('📍 Sample Nodes:', graph.nodes.slice(0, 3).map(node => ({
      id: node.id,
      type: node.type,
      label: node.label,
      color: node.color
    })))
  }
  
  // Show some edge details
  if (graph.edges.length > 0) {
    log('🔗 Sample Edges:', graph.edges.slice(0, 3).map(edge => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      weight: edge.weight,
      label: edge.label
    })))
  }
  
  return true
}

const testRAGFunctionality = async (userId) => {
  log('🤖 Testing RAG Functionality...')
  
  const query = "What are the key components of our AI system and how do they work together?"
  
  const result = await makeRequest('POST', '/api/v1/search', {
    query,
    userId,
    searchType: 'rag',
    limit: 5
  }, {
    'x-user-id': userId
  })
  
  if (result.error) {
    log('❌ RAG Search failed:', result)
    return false
  }
  
  log('✅ RAG Search completed successfully')
  log('🔍 RAG Response:', {
    query,
    response: result.data.ragResponse,
    relevantContexts: result.data.results?.length || 0
  })
  
  return true
}

const testSemanticSearch = async (userId) => {
  log('🔍 Testing Semantic Search...')
  
  const queries = [
    "AI implementation strategy",
    "technical architecture components",
    "performance optimization techniques",
    "code quality improvements"
  ]
  
  for (const query of queries) {
    log(`🔍 Testing query: "${query}"`)
    
    const result = await makeRequest('POST', '/api/v1/search', {
      query,
      userId,
      searchType: 'semantic',
      limit: 3
    }, {
      'x-user-id': userId
    })
    
    if (result.error) {
      log(`❌ Semantic search failed for "${query}":`, result)
      continue
    }
    
    const results = result.data.data
    log(`✅ Semantic search for "${query}" returned ${results.length} results`)
    
    if (results.length > 0) {
      log('📋 Top Results:', results.slice(0, 2).map(r => ({
        title: r.title,
        relevance: r.relevance,
        type: r.type
      })))
    }
  }
  
  return true
}

const testContextBreakdowns = async (contextId, userId) => {
  log('📝 Testing Context Breakdowns...')
  
  const result = await makeRequest('POST', `/api/v1/contexts/${contextId}/prompt-version`, null, {
    'x-user-id': userId
  })
  
  if (result.error) {
    log('❌ Context Breakdown failed:', result)
    return false
  }
  
  log('✅ Context Breakdown completed successfully')
  log('📝 Prompt Version:', result.data.data.promptVersion)
  
  return true
}

const testContextRelationships = async (projectId, userId) => {
  log('🔗 Testing Context Relationships...')
  
  // Get all contexts for the project
  const contextsResult = await makeRequest('GET', `/api/v1/contexts?projectId=${projectId}&userId=${userId}`)
  
  if (contextsResult.error || !contextsResult.data.data) {
    log('❌ Failed to get contexts for relationship analysis')
    return false
  }
  
  const contexts = contextsResult.data.data
  
  log(`📊 Analyzing relationships between ${contexts.length} contexts`)
  
  // Analyze each context for relationships
  for (const context of contexts.slice(0, 3)) { // Test first 3 contexts
    log(`🔍 Analyzing relationships for: ${context.title}`)
    
    const analysisResult = await makeRequest('POST', `/api/v1/contexts/${context.id}/analyze`, null, {
      'x-user-id': userId
    })
    
    if (analysisResult.error) {
      log(`❌ Failed to analyze context ${context.id}`)
      continue
    }
    
    const analysis = analysisResult.data.data
    
    if (analysis.relationships) {
      log('🔗 Relationships found:', analysis.relationships)
    }
    
    if (analysis.breakdown) {
      log('🔍 Breakdown analysis:', {
        mainTopics: analysis.breakdown.mainTopics,
        entities: analysis.breakdown.entities,
        questions: analysis.breakdown.questions
      })
    }
  }
  
  return true
}

// Main test execution
const runAITests = async () => {
  log('🚀 Starting AI Functionality Tests for Velto Memory Backend')
  
  try {
    // Generate unique test data
    const testData = generateUniqueData()
    log('📝 Generated test data:', testData)
    
    // Create test user
    log('👤 Creating test user...')
    const userResult = await makeRequest('POST', '/api/v1/users', {
      email: testData.email,
      name: testData.name,
      preferences: {
        theme: 'dark',
        notifications: { email: true, push: true, slack: false },
        aiProvider: 'google'
      }
    })
    
    if (userResult.error) {
      log('❌ User creation failed:', userResult)
      return
    }
    
    const userId = userResult.data.data.id
    log('✅ User created:', userId)
    
    // Create test project
    log('📁 Creating test project...')
    const projectResult = await makeRequest('POST', '/api/v1/projects', {
      name: testData.projectName,
      description: testData.projectDescription,
      isPublic: false,
      tags: ['ai', 'testing', 'context-graphs'],
      settings: {
        autoCategorize: true,
        chunkSize: 1000,
        maxTokens: 5000,
        aiModel: 'gemini-2.0-flash-001'
      }
    }, {
      'x-user-id': userId
    })
    
    if (projectResult.error) {
      log('❌ Project creation failed:', projectResult)
      return
    }
    
    const projectId = projectResult.data.data.id
    log('✅ Project created:', projectId)
    
    // Create test contexts
    log('📝 Creating test contexts...')
    const contextIds = []
    
    for (const contextData of testData.contexts) {
      const contextResult = await makeRequest('POST', '/api/v1/contexts', {
        ...contextData,
        projectId
      }, {
        'x-user-id': userId
      })
      
      if (contextResult.error) {
        log(`❌ Context creation failed for ${contextData.title}:`, contextResult)
        continue
      }
      
      const contextId = contextResult.data.data.id
      contextIds.push(contextId)
      log(`✅ Context created: ${contextData.title} (${contextId})`)
      
      // Wait a bit for AI processing
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    if (contextIds.length === 0) {
      log('❌ No contexts were created successfully')
      return
    }
    
    log(`✅ Created ${contextIds.length} contexts successfully`)
    
    // Wait for all AI processing to complete
    log('⏳ Waiting for AI processing to complete...')
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // Run AI functionality tests
    log('🧪 Running AI Functionality Tests...')
    
    // Test 1: AI Analysis
    await testAIAnalysis(contextIds[0], userId)
    
    // Test 2: Context Graph Creation
    await testContextGraphCreation(projectId, userId)
    
    // Test 3: RAG Functionality
    await testRAGFunctionality(userId)
    
    // Test 4: Semantic Search
    await testSemanticSearch(userId)
    
    // Test 5: Context Breakdowns
    await testContextBreakdowns(contextIds[0], userId)
    
    // Test 6: Context Relationships
    await testContextRelationships(projectId, userId)
    
    log('🎉 All AI functionality tests completed!')
    log('📊 Test Summary:', {
      userCreated: userId,
      projectCreated: projectId,
      contextsCreated: contextIds.length,
      testsRun: 6
    })
    
  } catch (error) {
    log('❌ Fatal error in AI tests:', { error: error.message, stack: error.stack })
  }
}

if (require.main === module) {
  runAITests().catch(error => {
    log('❌ Fatal error in test execution', { error: error.message, stack: error.stack })
    process.exit(1)
  })
}

module.exports = {
  runAITests,
  generateUniqueData,
  makeRequest
}
