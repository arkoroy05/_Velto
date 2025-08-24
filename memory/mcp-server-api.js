#!/usr/bin/env node

const readline = require('readline');

class VeltoMCPServer {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    
    this.apiBase = 'https://velto.onrender.com/api/v1';
    // Hardcoded user ID matching the extension and client
    this.userId = '689e5a217224da39efe7a47f';
    this.tools = [
      {
        name: 'search_contexts',
        description: 'Search for relevant contexts using semantic search',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            projectId: { type: 'string', description: 'Project ID to search within' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_context',
        description: 'Get a specific context by ID',
        inputSchema: {
          type: 'object',
          properties: {
            contextId: { type: 'string', description: 'Context ID' }
          },
          required: ['contextId']
        }
      },
      {
        name: 'create_context',
        description: 'Create a new context',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Context title' },
            content: { type: 'string', description: 'Context content' },
            type: { type: 'string', description: 'Context type' },
            source: { type: 'object', description: 'Source information' },
            projectId: { type: 'string', description: 'Project ID' }
          },
          required: ['title', 'content', 'type', 'source']
        }
      },
      {
        name: 'get_projects',
        description: 'Get all projects',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'generate_prompt_version',
        description: 'Generate a prompt version for a context',
        inputSchema: {
          type: 'object',
          properties: {
            contextId: { type: 'string', description: 'Context ID' },
            userPrompt: { type: 'string', description: 'User prompt' }
          },
          required: ['contextId', 'userPrompt']
        }
      }
    ];
  }

  async start() {
    console.error('🚀 Velto MCP Server (API-based) starting...');
    
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        await this.handleRequest(request);
      } catch (error) {
        console.error('❌ Error parsing request:', error.message);
        this.sendError(request?.id || null, 'Invalid JSON');
      }
    });
    
    console.error('✅ Velto MCP Server ready for requests');
  }

  async handleRequest(request) {
    const { id, method, params } = request;
    
    try {
      switch (method) {
        case 'initialize':
          await this.handleInitialize(id, params);
          break;
        case 'tools/list':
          await this.handleToolsList(id);
          break;
        case 'tools/call':
          await this.handleToolCall(id, params);
          break;
        default:
          this.sendError(id, `Unknown method: ${method}`);
      }
    } catch (error) {
      console.error('❌ Error handling request:', error);
      this.sendError(id, error.message);
    }
  }

  async handleInitialize(id, params) {
    const response = {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'velto-memory-api',
          version: '1.0.0'
        }
      }
    };
    
    console.log(JSON.stringify(response));
  }

  async handleToolsList(id) {
    const response = {
      jsonrpc: '2.0',
      id,
      result: {
        tools: this.tools
      }
    };
    
    console.log(JSON.stringify(response));
  }

  async handleToolCall(id, params) {
    const { name, arguments: args } = params;
    
    try {
      let result;
      
      switch (name) {
        case 'search_contexts':
          result = await this.searchContexts(args);
          break;
        case 'get_context':
          result = await this.getContext(args);
          break;
        case 'create_context':
          result = await this.createContext(args);
          break;
        case 'get_projects':
          result = await this.getProjects(args);
          break;
        case 'generate_prompt_version':
          result = await this.generatePromptVersion(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      };
      
      console.log(JSON.stringify(response));
      
    } catch (error) {
      console.error(`❌ Error calling tool ${name}:`, error);
      this.sendError(id, `Tool execution failed: ${error.message}`);
    }
  }

  async searchContexts(args) {
    const { query, projectId } = args;
    let url = `${this.apiBase}/search?query=${encodeURIComponent(query)}`;
    
    if (projectId) {
      url += `&projectId=${projectId}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'X-User-ID': this.userId
      }
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async getContext(args) {
    const { contextId } = args;
    const response = await fetch(`${this.apiBase}/contexts/${contextId}`, {
      headers: {
        'X-User-ID': this.userId
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async createContext(args) {
    const response = await fetch(`${this.apiBase}/contexts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': this.userId
      },
      body: JSON.stringify(args)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async getProjects(args) {
    const response = await fetch(`${this.apiBase}/projects`, {
      headers: {
        'X-User-ID': this.userId
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  async generatePromptVersion(args) {
    const { contextId, userPrompt } = args;
    const response = await fetch(`${this.apiBase}/contexts/${contextId}/prompt-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': this.userId
      },
      body: JSON.stringify({ userPrompt })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  sendError(id, message) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code: -1,
        message
      }
    };
    
    console.log(JSON.stringify(response));
  }
}

// Start the server
const server = new VeltoMCPServer();
server.start().catch(console.error);
