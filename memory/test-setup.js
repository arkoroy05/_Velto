const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testSetup() {
  console.log('🧪 Testing Velto Memory Backend Setup...\n');

  // Test 1: Environment Variables
  console.log('1. Checking environment variables...');
  const requiredEnvVars = ['MONGODB_URI'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`❌ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('   Please create a .env file with the required variables.');
    return false;
  }
  console.log('✅ Environment variables configured');

  // Test 2: MongoDB Connection
  console.log('\n2. Testing MongoDB connection...');
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db('velto-memory');
    await db.admin().ping();
    
    console.log('✅ MongoDB connection successful');
    
    // Test database operations
    const testCollection = db.collection('test-setup');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    await testCollection.deleteOne({ test: true });
    
    console.log('✅ Database operations working');
    
    await client.close();
  } catch (error) {
    console.log(`❌ MongoDB connection failed: ${error.message}`);
    return false;
  }

  // Test 3: Package Dependencies
  console.log('\n3. Checking package dependencies...');
  try {
    const express = require('express');
    const cors = require('cors');
    const helmet = require('helmet');
    const compression = require('compression');
    const { RateLimiterMemory } = require('rate-limiter-flexible');
    const winston = require('winston');
    const { z } = require('zod');
    
    console.log('✅ All core dependencies available');
  } catch (error) {
    console.log(`❌ Missing dependencies: ${error.message}`);
    console.log('   Run: npm install');
    return false;
  }

  // Test 4: TypeScript Compilation
  console.log('\n4. Testing TypeScript compilation...');
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
  } catch (error) {
    console.log('❌ TypeScript compilation failed');
    console.log('   Check for type errors in the source code');
    return false;
  }

  console.log('\n🎉 All tests passed! Your Velto Memory Backend is ready to use.');
  console.log('\nNext steps:');
  console.log('1. Add your AI provider API keys to .env');
  console.log('2. Run: npm run dev (for development)');
  console.log('3. Run: npm run mcp:dev (for MCP server)');
  console.log('4. Test the API at: http://localhost:3001/health');
  
  return true;
}

testSetup().catch(console.error);
