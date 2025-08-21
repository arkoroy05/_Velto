const { spawn } = require('child_process');
const readline = require('readline');

// Test MCP server communication
async function testMCPServer() {
  console.log('🧪 Testing Velto MCP Server...\n');

  // Start the MCP server
  const mcpProcess = spawn('node', ['dist/mcp/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Test data
  const testContext = {
    title: "MCP Test Context",
    content: "This is a test context for testing MCP server functionality",
    type: "note",
    tags: ["mcp", "test", "velto"],
    userId: "68a1d55ce4b61c9d884fbe3b" // Use existing user ID
  };

  // Test MCP tools
  const tests = [
    {
      name: "List Tools",
      request: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list"
      }
    },
    {
      name: "Save Context",
      request: {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "save_context",
          arguments: testContext
        }
      }
    }
  ];

  for (const test of tests) {
    console.log(`📋 Testing: ${test.name}`);
    
    // Send request
    mcpProcess.stdin.write(JSON.stringify(test.request) + '\n');
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Cleanup
  mcpProcess.kill();
  console.log('\n✅ MCP testing completed');
}

// Run the test
testMCPServer().catch(console.error);
