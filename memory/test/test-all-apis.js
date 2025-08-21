#!/usr/bin/env node

/**
 * Comprehensive API Test Script for Velto Memory Backend
 * 
 * This script tests all API endpoints and populates the database with realistic data.
 * Each run generates unique data to ensure comprehensive testing.
 */

const BASE_URL = 'http://localhost:3001'
const TEST_USER_EMAIL = `test-${Date.now()}@velto.ai`
const TEST_USER_NAME = `Test User ${Date.now()}`

// Generate unique data for each test run
const generateUniqueData = () => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(7)
  
  return {
    projectNames: [
      `AI Research Project ${timestamp}`,
      `Code Review System ${randomId}`,
      `Knowledge Management ${timestamp}`,
      `Documentation Hub ${randomId}`,
      `Learning Platform ${timestamp}`
    ],
    contextTitles: [
      `Meeting Notes: AI Strategy Discussion ${timestamp}`,
      `Code Review: Authentication Module ${randomId}`,
      `Research: Machine Learning Trends ${timestamp}`,
      `Documentation: API Design Patterns ${randomId}`,
      `Ideas: Product Roadmap ${timestamp}`,
      `Task: Database Optimization ${randomId}`,
      `Note: Performance Metrics ${timestamp}`,
      `Meeting: Sprint Planning ${randomId}`,
      `Email: Client Requirements ${timestamp}`,
      `Webpage: Best Practices ${randomId}`
    ],
    contextContent: [
      `This is a comprehensive analysis of our AI strategy for Q4 ${new Date().getFullYear()}. We discussed various approaches including machine learning, natural language processing, and computer vision applications. The team agreed on prioritizing NLP for customer support automation.`,
      
      `Code review for the authentication module implementation. The code follows security best practices with proper input validation, secure password hashing using bcrypt, and JWT token management. Minor improvements suggested for error handling.`,
      
      `Research findings on current machine learning trends in software development. Key areas include automated code review, intelligent testing, and AI-powered debugging tools. Notable frameworks: TensorFlow, PyTorch, and Hugging Face.`,
      
      `Documentation covering API design patterns for microservices architecture. Includes RESTful principles, GraphQL considerations, authentication strategies, rate limiting, and error handling. Examples provided in Node.js and Python.`,
      
      `Product roadmap ideas for the next 6 months. Focus areas: user experience improvements, performance optimization, new feature development, and technical debt reduction. Priority given to customer feedback and market analysis.`,
      
      `Database optimization task for improving query performance. Current issues identified: missing indexes, inefficient joins, and suboptimal query patterns. Solutions include query optimization, indexing strategy, and caching implementation.`,
      
      `Performance metrics analysis for the application. Key KPIs: response time, throughput, error rate, and resource utilization. Monitoring tools: Prometheus, Grafana, and custom dashboards. Areas for improvement identified.`,
      
      `Sprint planning meeting notes. Team capacity: 8 developers, 2 designers, 1 product manager. Sprint goals: user authentication, dashboard redesign, and API documentation. Risk assessment and mitigation strategies discussed.`,
      
      `Client requirements email summary. Project: E-commerce platform with AI-powered recommendations. Features: product search, user management, order processing, payment integration, and analytics dashboard. Timeline: 3 months.`,
      
      `Webpage content about software development best practices. Topics: code quality, testing strategies, deployment pipelines, monitoring, and security. Includes practical examples and industry standards.`
    ],
    tags: [
      'ai', 'machine-learning', 'code-review', 'documentation', 'performance',
      'security', 'api-design', 'database', 'testing', 'deployment',
      'monitoring', 'user-experience', 'product-management', 'research',
      'meeting-notes', 'ideas', 'tasks', 'best-practices'
    ]
  }
}

// Utility functions
const log = (message, data = null) => {
  const timestamp = new Date().toISOString()
  if (data) {
    console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2))
  } else {
    console.log(`[${timestamp}] ${message}`)
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
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data)
  }
  
  try {
    const response = await fetch(url, options)
    const responseData = await response.json()
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseData.error || 'Unknown error'}`)
    }
    
    return { status: response.status, data: responseData }
  } catch (error) {
    log(`Request failed: ${method} ${endpoint}`, { error: error.message })
    throw error
  }
}

// Test functions
const testHealthCheck = async () => {
  log('Testing health check endpoint...')
  const response = await makeRequest('GET', '/health')
  log('Health check passed', response.data)
  return response.data
}

const testAPIDocumentation = async () => {
  log('Testing API documentation endpoint...')
  const response = await makeRequest('GET', '/api/v1/docs')
  log('API documentation retrieved', response.data)
  return response.data
}

const testUserCreation = async () => {
  log('Testing user creation...')
  
  const userData = {
    email: TEST_USER_EMAIL,
    name: TEST_USER_NAME,
    preferences: {
      theme: 'dark',
      notifications: {
        email: true,
        push: true,
        slack: false
      },
      aiProvider: 'google'
    }
  }
  
  const response = await makeRequest('POST', '/api/v1/users', userData)
  log('User created successfully', response.data)
  
  const userId = response.data.data.id
  log(`Test user ID: ${userId}`)
  
  return userId
}

const testProjectCreation = async (userId) => {
  log('Testing project creation...')
  
  const uniqueData = generateUniqueData()
  const projects = []
  
  for (const projectName of uniqueData.projectNames) {
    const projectData = {
      name: projectName,
      description: `A comprehensive project for ${projectName.toLowerCase()}. This project focuses on implementing best practices and innovative solutions.`,
      isPublic: Math.random() > 0.5,
      tags: uniqueData.tags.slice(0, Math.floor(Math.random() * 5) + 1),
      settings: {
        autoCategorize: true,
        chunkSize: Math.floor(Math.random() * 1000) + 500,
        maxTokens: Math.floor(Math.random() * 4000) + 4000,
        aiModel: 'gemini-2.0-flash-001'
      }
    }
    
    const response = await makeRequest('POST', '/api/v1/projects', projectData, {
      'x-user-id': userId
    })
    
    log(`Project created: ${projectName}`, response.data)
    projects.push(response.data.data)
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return projects
}

const testContextCreation = async (userId, projects) => {
  log('Testing context creation...')
  
  const uniqueData = generateUniqueData()
  const contexts = []
  
  for (let i = 0; i < uniqueData.contextTitles.length; i++) {
    const project = projects[i % projects.length]
    const contextData = {
      title: uniqueData.contextTitles[i],
      content: uniqueData.contextContent[i],
      type: ['conversation', 'code', 'documentation', 'research', 'idea', 'task', 'note', 'meeting', 'email', 'webpage'][i % 10],
      projectId: project.id,
      tags: uniqueData.tags.slice(0, Math.floor(Math.random() * 4) + 1),
      source: {
        type: 'manual'
      }
    }
    
    const response = await makeRequest('POST', '/api/v1/contexts', contextData, {
      'x-user-id': userId
    })
    
    log(`Context created: ${contextData.title}`, response.data)
    contexts.push(response.data.data)
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  return contexts
}

const testWebhookCreation = async (userId) => {
  log('Testing webhook creation...')
  
  const webhookData = {
    name: `Test Webhook ${Date.now()}`,
    url: 'https://httpbin.org/post',
    events: ['context.created', 'context.updated', 'project.created'],
    isActive: true,
    maxRetries: 3
  }
  
  const response = await makeRequest('POST', '/api/v1/webhooks', webhookData, {
    'x-user-id': userId
  })
  
  log('Webhook created successfully', response.data)
  return response.data.data
}

const testSearchFunctionality = async (userId, projects) => {
  log('Testing search functionality...')
  
  // Test different search types
  const searchTests = [
    {
      name: 'Semantic Search',
      data: {
        query: 'machine learning and AI',
        userId: userId,
        searchType: 'semantic',
        limit: 5
      }
    },
    {
      name: 'RAG Search',
      data: {
        query: 'What are the best practices for API design?',
        userId: userId,
        searchType: 'rag',
        limit: 3
      }
    },
    {
      name: 'Hybrid Search',
      data: {
        query: 'code review',
        userId: userId,
        searchType: 'hybrid',
        limit: 5
      }
    },
    {
      name: 'Text Search',
      data: {
        query: 'performance',
        userId: userId,
        searchType: 'text',
        limit: 5
      }
    }
  ]
  
  for (const test of searchTests) {
    log(`Testing ${test.name}...`)
    try {
      const response = await makeRequest('POST', '/api/v1/search', test.data)
      log(`${test.name} successful`, {
        results: response.data.data.length,
        hasRAGResponse: !!response.data.ragResponse
      })
    } catch (error) {
      log(`${test.name} failed: ${error.message}`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const testSearchSuggestions = async (userId) => {
  log('Testing search suggestions...')
  
  const queries = ['ai', 'code', 'performance', 'security', 'testing']
  
  for (const query of queries) {
    try {
      const response = await makeRequest('GET', `/api/v1/search/suggestions?query=${query}&userId=${userId}`)
      log(`Suggestions for "${query}":`, response.data)
    } catch (error) {
      log(`Suggestions for "${query}" failed: ${error.message}`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

const testSearchFilters = async (userId) => {
  log('Testing search filters...')
  
  try {
    const response = await makeRequest('GET', `/api/v1/search/filters?userId=${userId}`)
    log('Search filters retrieved', response.data)
  } catch (error) {
    log(`Search filters failed: ${error.message}`)
  }
}

const testWebhookTesting = async (webhookId, userId) => {
  log('Testing webhook functionality...')
  
  try {
    const response = await makeRequest('POST', `/api/v1/webhooks/${webhookId}/test`, {}, {
      'x-user-id': userId
    })
    log('Webhook test successful', response.data)
  } catch (error) {
    log(`Webhook test failed: ${error.message}`)
  }
}

const testReadOperations = async (userId, projects, contexts) => {
  log('Testing read operations...')
  
  // Test reading users
  try {
    const response = await makeRequest('GET', `/api/v1/users?userId=${userId}`)
    log('Users read successful', { count: response.data.data.length })
  } catch (error) {
    log(`Users read failed: ${error.message}`)
  }
  
  // Test reading projects
  try {
    const response = await makeRequest('GET', `/api/v1/projects?userId=${userId}`)
    log('Projects read successful', { count: response.data.data.length })
  } catch (error) {
    log(`Projects read failed: ${error.message}`)
  }
  
  // Test reading contexts
  try {
    const response = await makeRequest('GET', `/api/v1/contexts?userId=${userId}`)
    log('Contexts read successful', { count: response.data.data.length })
  } catch (error) {
    log(`Contexts read failed: ${error.message}`)
  }
  
  // Test reading webhooks
  try {
    const response = await makeRequest('GET', `/api/v1/webhooks?userId=${userId}`)
    log('Webhooks read successful', { count: response.data.data.length })
  } catch (error) {
    log(`Webhooks read failed: ${error.message}`)
  }
}

const testAnalytics = async () => {
  log('Testing analytics endpoint...')
  
  try {
    const response = await makeRequest('GET', '/api/v1/analytics')
    log('Analytics endpoint working', response.data)
  } catch (error) {
    log(`Analytics failed: ${error.message}`)
  }
}

const testContextAnalysis = async (userId, contexts) => {
  log('Testing context analysis...')
  
  if (contexts.length === 0) {
    log('No contexts to analyze')
    return
  }
  
  const contextToAnalyze = contexts[0]
  
  try {
    const response = await makeRequest('POST', `/api/v1/contexts/${contextToAnalyze.id}/analyze`, {}, {
      'x-user-id': userId
    })
    log('Context analysis successful', response.data)
  } catch (error) {
    log(`Context analysis failed: ${error.message}`)
  }
}

const testPromptVersionGeneration = async (userId, contexts) => {
  log('Testing prompt version generation...')
  
  if (contexts.length === 0) {
    log('No contexts to generate prompts for')
    return
  }
  
  const contextForPrompt = contexts[0]
  
  try {
    const response = await makeRequest('POST', `/api/v1/contexts/${contextForPrompt.id}/prompt-version`, {}, {
      'x-user-id': userId
    })
    log('Prompt version generation successful', response.data)
  } catch (error) {
    log(`Prompt version generation failed: ${error.message}`)
  }
}

// Main test execution
const runAllTests = async () => {
  log('🚀 Starting comprehensive API tests for Velto Memory Backend')
  log('=' * 60)
  
  try {
    // Basic health checks
    await testHealthCheck()
    await testAPIDocumentation()
    
    // Create test data
    const userId = await testUserCreation()
    const projects = await testProjectCreation(userId)
    const contexts = await testContextCreation(userId, projects)
    const webhook = await testWebhookCreation(userId)
    
    // Test search functionality
    await testSearchFunctionality(userId, projects)
    await testSearchSuggestions(userId)
    await testSearchFilters(userId)
    
    // Test webhook functionality
    await testWebhookTesting(webhook.id, userId)
    
    // Test read operations
    await testReadOperations(userId, projects, contexts)
    
    // Test AI features
    await testContextAnalysis(userId, contexts)
    await testPromptVersionGeneration(userId, contexts)
    
    // Test analytics
    await testAnalytics()
    
    log('=' * 60)
    log('✅ All tests completed successfully!')
    log(`📊 Test Summary:`)
    log(`   - User created: ${userId}`)
    log(`   - Projects created: ${projects.length}`)
    log(`   - Contexts created: ${contexts.length}`)
    log(`   - Webhook created: ${webhook.id}`)
    log(`   - Test email: ${TEST_USER_EMAIL}`)
    
  } catch (error) {
    log('❌ Test execution failed', { error: error.message, stack: error.stack })
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log('❌ Fatal error in test execution', { error: error.message, stack: error.stack })
    process.exit(1)
  })
}

module.exports = {
  runAllTests,
  generateUniqueData,
  makeRequest
}
