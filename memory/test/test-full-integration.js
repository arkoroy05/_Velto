const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

// Ensure fetch is available (Node.js 18+ has it built-in)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch')
}

// Configuration
const SERVER_PORT = 3001
const SERVER_URL = `http://localhost:${SERVER_PORT}`
const TEST_TIMEOUT = 30000 // 30 seconds

// Test data
const testContexts = {
  small: {
    title: 'Small Test Context',
    content: 'This is a small context that should not be chunked.',
    type: 'note',
    tags: ['small', 'test'],
    metadata: {
      complexity: 'low',
      importance: 'medium'
    }
  },
  
  medium: {
    title: 'Medium Test Context',
    content: `This is a medium-sized context that contains multiple paragraphs.

The second paragraph adds more content to test the system.

This third paragraph demonstrates paragraph boundary detection.

The content is structured but not large enough to require chunking.`,
    type: 'documentation',
    tags: ['medium', 'test', 'paragraphs'],
    metadata: {
      complexity: 'medium',
      importance: 'high'
    }
  },
  
  large: {
    title: 'Large Test Context for Chunking',
    content: `This is a large context that should definitely be chunked by the smart chunking system. The content needs to be substantial enough to exceed our token threshold and trigger the chunking mechanism. We will create a very long document that covers multiple topics in detail to ensure it exceeds the 4000 token limit.

The second paragraph contains more content and demonstrates how the chunking system handles paragraph boundaries. We need to ensure that the content is long enough to actually require chunking, so we'll add more substantial content here. This paragraph will be expanded significantly to include detailed explanations, examples, and comprehensive information that adds value to the overall context.

This third paragraph shows that the system can handle multiple paragraphs while preserving semantic meaning. The chunking system should intelligently break down this content into manageable pieces that maintain context and readability. We'll continue to expand this content with additional details, technical explanations, and practical examples that demonstrate the system's capabilities.

Here's some code to test code block handling:

\`\`\`javascript
function testFunction() {
  console.log('This is a test function');
  return 'test result';
}

// Test the function
const result = testFunction();
console.log(result);
\`\`\`

This shows how code blocks are preserved during chunking. Code blocks are important for maintaining the integrity of programming examples and should be handled carefully by the chunking system. We'll add more code examples throughout this document to test various programming languages and code block handling scenarios.

## Markdown Section

This section tests markdown handling and demonstrates various formatting options that the chunking system should preserve. We'll include multiple levels of headers, lists, emphasis, and other markdown features to thoroughly test the system's ability to handle complex formatting.

- Point 1: This is the first point with detailed explanation and comprehensive information about the topic being discussed
- Point 2: This is the second point with additional context and examples that provide deeper understanding of the concepts
- Point 3: This is the third point that provides comprehensive information and practical applications of the discussed topics

### Subsection

More details about the subsection. This subsection contains important information that should be preserved during chunking. The content here is substantial and adds value to the overall context. We'll expand this section with additional paragraphs, examples, and technical details to ensure it contributes significantly to the overall token count.

## Another Section

This section covers additional topics and provides more depth to the content. We need to ensure that the chunking system can handle multiple sections while maintaining the logical flow and structure of the information. This section will be expanded with comprehensive coverage of various subjects, detailed explanations, and practical examples.

### Code Example

\`\`\`python
def python_function():
    print("Python code is also supported")
    return True

# Test the function
result = python_function()
\`\`\`

This demonstrates multi-language code support. The chunking system should recognize different programming languages and handle them appropriately. We'll continue to add more code examples in various languages to test the system's multilingual capabilities.

## Technical Details

This section provides technical details about the chunking system and its capabilities. We'll discuss various aspects of the system including performance, accuracy, and reliability. The content here is designed to be comprehensive and informative, covering multiple technical topics in detail.

### Performance Considerations

When implementing a chunking system, performance is a critical factor. We need to ensure that the system can handle large amounts of content efficiently without compromising on quality or accuracy. This involves careful consideration of algorithms, data structures, and optimization techniques. We'll expand this section with detailed technical discussions about performance optimization, scalability considerations, and best practices for high-performance systems.

### Accuracy and Reliability

The accuracy of the chunking system is paramount. Users rely on the system to break down content in a way that preserves meaning and context. Any loss of information or context during chunking could significantly impact the user experience and the effectiveness of the system. This section will cover various aspects of accuracy including error handling, validation techniques, and quality assurance processes.

## Implementation Details

This section covers the implementation details of the chunking system. We'll discuss the various components, their interactions, and how they work together to provide a robust and efficient chunking solution. This will be a comprehensive technical section that provides deep insights into the system architecture.

### Core Components

The core components of the chunking system include the content analyzer, boundary detector, chunk creator, and optimizer. Each component plays a crucial role in ensuring that the chunking process is both accurate and efficient. We'll provide detailed explanations of each component, their responsibilities, and how they interact with each other to achieve the desired results.

### Boundary Detection

Boundary detection is a critical aspect of the chunking system. The system must be able to identify natural break points in the content such as paragraph boundaries, sentence endings, and code block boundaries. This ensures that chunks are created at logical points that preserve the meaning and structure of the content. We'll discuss various algorithms and techniques used for boundary detection, their advantages and limitations, and how they contribute to the overall quality of the chunking process.

## Advanced Features

This section covers advanced features and capabilities of the chunking system. We'll discuss sophisticated algorithms, optimization techniques, and advanced functionality that sets this system apart from basic text splitting approaches.

### Semantic Analysis

The semantic analysis component of the chunking system goes beyond simple text splitting to understand the meaning and context of the content. This involves natural language processing techniques, context awareness, and intelligent decision-making about where to place chunk boundaries. We'll explore various semantic analysis approaches, their implementation details, and their impact on chunk quality.

### Machine Learning Integration

Modern chunking systems can benefit from machine learning techniques to improve accuracy and performance. We'll discuss various ML approaches including supervised learning for boundary detection, unsupervised learning for content clustering, and reinforcement learning for optimization. This section will cover implementation details, training data requirements, and performance improvements achieved through ML integration.

## Performance Optimization

This section focuses on performance optimization techniques and strategies for the chunking system. We'll discuss various approaches to improving speed, reducing memory usage, and optimizing resource consumption while maintaining quality and accuracy.

### Caching Strategies

Effective caching is crucial for high-performance chunking systems. We'll discuss various caching strategies including memory caching, disk caching, and distributed caching approaches. This section will cover cache invalidation strategies, memory management techniques, and performance metrics for different caching approaches.

### Parallel Processing

Modern systems can benefit from parallel processing to improve chunking performance. We'll discuss various parallelization strategies including multi-threading, multi-processing, and distributed processing approaches. This section will cover implementation details, synchronization requirements, and performance improvements achieved through parallel processing.

## Quality Assurance

This section covers quality assurance processes and techniques for ensuring the chunking system produces high-quality results consistently. We'll discuss various testing approaches, validation techniques, and monitoring strategies.

### Testing Strategies

Comprehensive testing is essential for maintaining chunking quality. We'll discuss various testing strategies including unit testing, integration testing, and end-to-end testing approaches. This section will cover test data preparation, automated testing frameworks, and continuous integration processes.

### Validation Techniques

Validation is crucial for ensuring chunk quality. We'll discuss various validation techniques including content integrity checks, boundary validation, and semantic coherence validation. This section will cover implementation details, validation metrics, and quality thresholds.

## Final Section

This concludes the large context with multiple sections, code blocks, and markdown formatting to thoroughly test the smart chunking system's capabilities. The system should automatically detect this as large content and create multiple ContextNodes while preserving all the semantic structure, code blocks, and formatting.

The content provided here is substantial enough to exceed the token threshold and should trigger the chunking mechanism. This will allow us to test the system's ability to handle large amounts of content while maintaining quality and accuracy. The document covers multiple technical topics in detail, includes numerous code examples, and provides comprehensive information that should definitely exceed our 4000 token threshold for chunking.`,
    type: 'documentation',
    tags: ['large', 'test', 'chunking', 'code', 'markdown'],
    metadata: {
      complexity: 'high',
      importance: 'high'
    }
  }
}

class IntegrationTester {
  constructor() {
    this.serverProcess = null
    this.testResults = []
    this.contextIds = []
    this.projectId = null
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📝'
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  async cleanupDatabase() {
    try {
      this.log('Cleaning up database...')
      
      // Use the same database service as the backend
      const { databaseService } = require('../dist/services/database.js')
      
      // Check if database is connected
      const isConnected = await databaseService.healthCheck()
      if (!isConnected) {
        this.log('Database not connected, attempting to connect...')
        await databaseService.connect()
      }
      
      // Clean all collections
      const collections = ['contexts', 'contextNodes', 'projects', 'users']
      for (const collectionName of collections) {
        try {
          const collection = databaseService.getCollection(collectionName)
          const result = await collection.deleteMany({})
          this.log(`Cleaned ${collectionName}: ${result.deletedCount} documents deleted`)
        } catch (error) {
          this.log(`Warning: Could not clean ${collectionName}: ${error.message}`, 'warning')
        }
      }
      
      this.log('Database cleanup completed', 'success')
    } catch (error) {
      this.log(`Database cleanup failed: ${error.message}`, 'error')
      throw error
    }
  }

  async startServer() {
    try {
      this.log('Starting backend server...')
      
      // Start server in background
      this.serverProcess = exec('npm start', {
        cwd: path.join(__dirname, '..'),
        detached: true
      })
      
      // Wait for server to start
      let attempts = 0
      const maxAttempts = 30
      
      while (attempts < maxAttempts) {
        try {
          const response = await fetch(`${SERVER_URL}/health`)
          if (response.ok) {
            this.log('Server started successfully', 'success')
            return
          }
        } catch (error) {
          // Server not ready yet
        }
        
        attempts++
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      throw new Error('Server failed to start within timeout')
    } catch (error) {
      this.log(`Server start failed: ${error.message}`, 'error')
      throw error
    }
  }

  async stopServer() {
    if (this.serverProcess) {
      try {
        this.log('Stopping server...')
        process.kill(-this.serverProcess.pid, 'SIGTERM')
        this.serverProcess = null
        this.log('Server stopped', 'success')
      } catch (error) {
        this.log(`Server stop warning: ${error.message}`, 'warning')
      }
    }
  }

  async testHealthEndpoint() {
    try {
      this.log('Testing health endpoint...')
      const response = await fetch(`${SERVER_URL}/health`)
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const data = await response.json()
      this.log(`Health check passed: ${data.message || 'OK'}`, 'success')
      this.testResults.push({ test: 'Health Endpoint', status: 'PASSED' })
    } catch (error) {
      this.log(`Health endpoint test failed: ${error.message}`, 'error')
      this.testResults.push({ test: 'Health Endpoint', status: 'FAILED', error: error.message })
      throw error
    }
  }

  async testContextCreation(contextData, expectedChunking = false) {
    try {
      this.log(`Testing context creation: ${contextData.title}`)
      
      const response = await fetch(`${SERVER_URL}/api/v1/contexts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '507f1f77bcf86cd799439011' // Mock user ID for testing
        },
        body: JSON.stringify(this.projectId ? { ...contextData, projectId: this.projectId } : contextData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Context creation failed: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(`Context creation unsuccessful: ${result.error || 'Unknown error'}`)
      }
      
      const context = result.data
      this.contextIds.push(context.id)
      
      // Check chunking results
      const wasChunked = context.chunkCount > 1
      const hasContextNodes = context.hasContextNodes
      
      this.log(`Context created: ${context.id}`)
      this.log(`Chunk count: ${context.chunkCount}`)
      this.log(`Has ContextNodes: ${hasContextNodes}`)
      
      if (expectedChunking && !wasChunked) {
        throw new Error('Expected chunking but context was not chunked')
      }
      
      if (!expectedChunking && wasChunked) {
        throw new Error('Did not expect chunking but context was chunked')
      }
      
      this.log(`Context creation test passed for: ${contextData.title}`, 'success')
      this.testResults.push({ 
        test: `Context Creation: ${contextData.title}`, 
        status: 'PASSED',
        chunkCount: context.chunkCount,
        wasChunked
      })
      
      return context
    } catch (error) {
      this.log(`Context creation test failed for ${contextData.title}: ${error.message}`, 'error')
      this.testResults.push({ 
        test: `Context Creation: ${contextData.title}`, 
        status: 'FAILED', 
        error: error.message 
      })
      throw error
    }
  }

  async createProject() {
    try {
      this.log('Creating test project...')
      const response = await fetch(`${SERVER_URL}/api/v1/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '507f1f77bcf86cd799439011'
        },
        body: JSON.stringify({
          name: 'Integration Test Project',
          description: 'Project for integration graph test',
          isPublic: false,
          tags: ['integration', 'test'],
          settings: { autoCategorize: true, chunkSize: 1000, maxTokens: 8000, aiModel: 'gpt-4' },
          collaborators: []
        })
      })
      if (!response.ok) {
        throw new Error(`Project creation failed: ${response.status}`)
      }
      const result = await response.json()
      if (!result.success || !result.data?.id) {
        throw new Error('Project creation unsuccessful')
      }
      this.projectId = result.data.id
      this.log(`Project created: ${this.projectId}`, 'success')
      this.testResults.push({ test: 'Project Creation', status: 'PASSED' })
    } catch (error) {
      this.log(`Project creation failed: ${error.message}`, 'error')
      this.testResults.push({ test: 'Project Creation', status: 'FAILED', error: error.message })
      throw error
    }
  }

  async testContextRetrieval(contextId, expectedChunking = false) {
    try {
      this.log(`Testing context retrieval: ${contextId}`)
      
      const response = await fetch(`${SERVER_URL}/api/v1/contexts/${contextId}`, {
        headers: {
          'x-user-id': '507f1f77bcf86cd799439011'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Context retrieval failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(`Context retrieval unsuccessful: ${result.error || 'Unknown error'}`)
      }
      
      const context = result.data
      
      // Check chunking information
      this.log(`Retrieved context: ${context.id}`)
      this.log(`Chunk count: ${context.chunkCount}`)
      this.log(`Has ContextNodes: ${context.hasContextNodes}`)
      
      if (expectedChunking) {
        if (!context.contextNodes || context.contextNodes.length === 0) {
          throw new Error('Expected ContextNodes but none were returned')
        }
        
        this.log(`ContextNodes returned: ${context.contextNodes.length}`)
        context.contextNodes.forEach((node, index) => {
          this.log(`  Node ${index + 1}: ${node.tokenCount} tokens, type: ${node.chunkType}`)
        })
      }
      
      this.log(`Context retrieval test passed for: ${contextId}`, 'success')
      this.testResults.push({ 
        test: `Context Retrieval: ${contextId}`, 
        status: 'PASSED',
        hasContextNodes: context.hasContextNodes,
        nodeCount: context.contextNodes?.length || 0
      })
      
      return context
    } catch (error) {
      this.log(`Context retrieval test failed for ${contextId}: ${error.message}`, 'error')
      this.testResults.push({ 
        test: `Context Retrieval: ${contextId}`, 
        status: 'FAILED', 
        error: error.message 
      })
      throw error
    }
  }

  async testContextListing() {
    try {
      this.log('Testing context listing...')
      
      const response = await fetch(`${SERVER_URL}/api/v1/contexts`, {
        headers: {
          'x-user-id': '507f1f77bcf86cd799439011'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Context listing failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(`Context listing unsuccessful: ${result.error || 'Unknown error'}`)
      }
      
      const contexts = result.data
      this.log(`Retrieved ${contexts.length} contexts`)
      
      // Check that chunk information is included
      contexts.forEach(context => {
        if (context.chunkCount === undefined || context.hasContextNodes === undefined) {
          throw new Error(`Context ${context.id} missing chunk information`)
        }
      })
      
      this.log('Context listing test passed', 'success')
      this.testResults.push({ 
        test: 'Context Listing', 
        status: 'PASSED',
        contextCount: contexts.length
      })
      
      return contexts
    } catch (error) {
      this.log(`Context listing test failed: ${error.message}`, 'error')
      this.testResults.push({ 
        test: 'Context Listing', 
        status: 'FAILED', 
        error: error.message 
      })
      throw error
    }
  }

  async testProjectGraph(contextId) {
    try {
      this.log(`Testing project graph for context: ${contextId}`)
      const response = await fetch(`${SERVER_URL}/api/v1/contexts/${contextId}/graph`, {
        headers: {
          'x-user-id': '507f1f77bcf86cd799439011'
        }
      })
      if (!response.ok) {
        throw new Error(`Graph fetch failed: ${response.status}`)
      }
      const result = await response.json()
      if (!result.success || !result.data) {
        throw new Error('Graph fetch unsuccessful')
      }
      const graph = result.data
      if (!graph.nodes || !graph.edges) {
        throw new Error('Graph missing nodes or edges')
      }
      // Basic sanity checks for efficient build
      this.log(`Graph nodes: ${graph.nodes.length}`)
      this.log(`Graph edges: ${graph.edges.length}`)
      if (graph.nodes.length === 0) {
        throw new Error('Expected at least 1 graph node')
      }
      // Ensure edges reference valid node ids
      const nodeIds = new Set(graph.nodes.map(n => n.id))
      for (const e of graph.edges) {
        if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
          throw new Error(`Edge references unknown nodes: ${e.source} -> ${e.target}`)
        }
      }
      this.log('Project graph test passed', 'success')
      this.testResults.push({ test: 'Project Graph', status: 'PASSED', nodeCount: graph.nodes.length, edgeCount: graph.edges.length })
      return graph
    } catch (error) {
      this.log(`Project graph test failed: ${error.message}`, 'error')
      this.testResults.push({ test: 'Project Graph', status: 'FAILED', error: error.message })
      throw error
    }
  }

  async runAllTests() {
    try {
      this.log('🚀 Starting Full Integration Test Suite...\n')
      
      // Phase 1: Cleanup
      await this.cleanupDatabase()
      
      // Phase 2: Start Server
      await this.startServer()
      
      // Phase 2.5: Create Project for Graph Tests
      await this.createProject()

      // Phase 3: Basic Health Check
      await this.testHealthEndpoint()
      
      // Phase 4: Test Context Creation (Small - No Chunking)
      this.log('\n📝 Testing Small Context (No Chunking Expected)')
      const smallContext = await this.testContextCreation(testContexts.small, false)
      
      // Phase 5: Test Context Creation (Medium - No Chunking)
      this.log('\n📝 Testing Medium Context (No Chunking Expected)')
      const mediumContext = await this.testContextCreation(testContexts.medium, false)
      
      // Phase 6: Test Context Creation (Large - Chunking Expected)
      this.log('\n📝 Testing Large Context (Chunking Expected)')
      const largeContext = await this.testContextCreation(testContexts.large, true)
      
      // Phase 7: Test Context Retrieval
      this.log('\n📝 Testing Context Retrieval')
      await this.testContextRetrieval(smallContext.id, false)
      await this.testContextRetrieval(mediumContext.id, false)
      await this.testContextRetrieval(largeContext.id, true)
      
      // Phase 8: Test Context Listing
      this.log('\n📝 Testing Context Listing')
      await this.testContextListing()

      // Phase 9: Build Project Graph (prefer node-based path)
      this.log('\n🧭 Testing Project Graph Building (Node-Preferred)')
      await this.testProjectGraph(largeContext.id)
      
      // Phase 10: Final Cleanup
      this.log('\n🧹 Final Cleanup...')
      await this.cleanupDatabase()
      
      // Phase 11: Results Summary
      this.log('\n📊 Test Results Summary:')
      const passed = this.testResults.filter(r => r.status === 'PASSED').length
      const failed = this.testResults.filter(r => r.status === 'FAILED').length
      
      this.testResults.forEach(result => {
        const status = result.status === 'PASSED' ? '✅' : '❌'
        this.log(`${status} ${result.test}`)
        if (result.error) {
          this.log(`   Error: ${result.error}`)
        }
      })
      
      this.log(`\n🎯 Final Results: ${passed} PASSED, ${failed} FAILED`)
      
      if (failed === 0) {
        this.log('\n🎉 ALL TESTS PASSED! Smart Chunking Integration is working perfectly!', 'success')
      } else {
        this.log(`\n⚠️ ${failed} tests failed. Check the logs above for details.`, 'warning')
      }
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error')
      this.log('Check the logs above for detailed error information.')
    } finally {
      // Always stop server and cleanup
      await this.stopServer()
      
      // Disconnect from database
      try {
        const { databaseService } = require('../dist/services/database.js')
        await databaseService.disconnect()
        this.log('Database disconnected', 'success')
      } catch (error) {
        this.log(`Database disconnect warning: ${error.message}`, 'warning')
      }
    }
  }
}

// Run the test suite
async function main() {
  // Check if MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is required!')
    console.error('Please set it to your MongoDB Atlas connection string.')
    console.error('Example: export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/velto-memory"')
    process.exit(1)
  }
  
  const tester = new IntegrationTester()
  await tester.runAllTests()
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { IntegrationTester, main }
