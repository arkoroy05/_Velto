const { spawn } = require('child_process');

// Test MCP server with proper client communication
async function testMCPServer() {
  console.log('🧪 Testing Velto MCP Server with proper client...\n');

  // Start the MCP server
  const mcpProcess = spawn('node', ['dist/mcp/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Set up output handling
  mcpProcess.stdout.on('data', (data) => {
    console.log('📤 MCP Response:', data.toString());
  });

  mcpProcess.stderr.on('data', (data) => {
    console.log('⚠️  MCP Error:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 1: List tools
  console.log('\n📋 Test 1: Listing MCP tools...');
  const listToolsRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  };
  
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Save context
  console.log('\n📋 Test 2: Saving context via MCP...');
  const saveContextRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "save_context",
      arguments: {
        title: "MCP Test Context",
        content: "This is a test context created via MCP server",
        type: "note",
        tags: ["mcp", "test", "velto"],
        userId: "68a1d55ce4b61c9d884fbe3b"
      }
    }
  };
  
  mcpProcess.stdin.write(JSON.stringify(saveContextRequest) + '\n');
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  mcpProcess.kill();
  
  console.log('\n✅ MCP testing completed');
}

// Run the test
testMCPServer().catch(console.error);
