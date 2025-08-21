# Velto Memory Backend - Test Suite

This directory contains comprehensive test scripts for the Velto Memory Backend API.

## Test Scripts

### `test-all-apis.js`

A comprehensive test script that:

- ✅ Tests all API endpoints
- 🗄️ Populates the database with realistic test data
- 🔄 Generates unique data for each test run
- 📊 Provides detailed test results and summaries
- 🧪 Tests AI features including semantic search and RAG

## Running Tests

### Prerequisites

1. **Server Running**: Ensure the Velto Memory Backend server is running on `http://localhost:3001`
2. **Database**: MongoDB should be connected and accessible
3. **Environment**: API keys should be properly configured in `.env`

### Quick Start

```bash
# Run all API tests once
npm run test:api

# Run tests in watch mode (re-runs when files change)
npm run test:api:watch

# Run directly with Node
node test/test-all-apis.js
```

### Test Coverage

The test script covers:

#### 🔐 **Authentication & Users**
- User creation with preferences
- User profile management
- API key generation

#### 📁 **Projects**
- Project creation with settings
- Collaboration management
- Project metadata

#### 📝 **Contexts**
- Context creation with AI analysis
- Content chunking and embeddings
- Context relationships

#### 🔍 **Search & AI**
- Semantic search using embeddings
- RAG (Retrieval Augmented Generation)
- Hybrid search (text + semantic)
- Search suggestions and autocomplete
- Search filters

#### 🔗 **Webhooks**
- Webhook creation and management
- Webhook testing with external services
- Event handling

#### 📊 **Analytics**
- Basic analytics endpoint testing
- Data aggregation

## Test Data

Each test run generates unique, realistic data:

- **Projects**: AI research, code review systems, knowledge management
- **Contexts**: Meeting notes, code reviews, research findings, documentation
- **Content**: Realistic software development scenarios and technical content
- **Tags**: Relevant technical categories and labels

## Output

The test script provides:

- ✅ **Success indicators** for each test
- 📊 **Detailed logs** with timestamps
- 🔍 **Response data** for verification
- 📈 **Test summaries** with counts and IDs
- ❌ **Error details** for debugging

## Example Output

```
🚀 Starting comprehensive API tests for Velto Memory Backend
============================================================
[2025-08-15T03:30:00.000Z] Testing health check endpoint...
[2025-08-15T03:30:00.100Z] Health check passed
[2025-08-15T03:30:00.200Z] Testing user creation...
[2025-08-15T03:30:00.500Z] User created successfully
[2025-08-15T03:30:00.600Z] Test user ID: 689e5a217224da39efe7a47f
...
============================================================
✅ All tests completed successfully!
📊 Test Summary:
   - User created: 689e5a217224da39efe7a47f
   - Projects created: 5
   - Contexts created: 10
   - Webhook created: 689e5a4b7224da39efe7a482
   - Test email: test-1734201000000@velto.ai
```

## Customization

### Modify Test Data

Edit the `generateUniqueData()` function in `test-all-apis.js` to:

- Change project types and descriptions
- Modify context content and categories
- Adjust tag lists and categories
- Customize test scenarios

### Add New Tests

1. Create a new test function following the existing pattern
2. Add it to the `runAllTests()` function
3. Include proper error handling and logging

### Environment Variables

The test script uses these environment variables:

- `GOOGLE_API_KEY` or `GEMINI_API_KEY`: For AI features
- `MONGODB_URI`: Database connection (handled by server)

## Troubleshooting

### Common Issues

1. **Server Not Running**: Ensure `npm run dev` is running
2. **Database Connection**: Check MongoDB connection in server logs
3. **API Key Issues**: Verify Google Gemini API key in `.env`
4. **Rate Limiting**: Tests include delays to avoid overwhelming APIs

### Debug Mode

For detailed debugging, modify the `makeRequest` function to log:

- Full request/response data
- Headers and authentication
- Error stack traces

## Integration

### CI/CD Pipeline

The test script can be integrated into CI/CD:

```yaml
# Example GitHub Actions
- name: Test APIs
  run: npm run test:api
  env:
    GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
```

### Automated Testing

Run tests automatically:

```bash
# Run every hour
0 * * * * cd /path/to/velto/memory && npm run test:api

# Run on file changes
nodemon --exec 'npm run test:api' --watch src/
```

## Contributing

When adding new tests:

1. Follow the existing naming convention
2. Include proper error handling
3. Add comprehensive logging
4. Test edge cases and error conditions
5. Update this README with new test descriptions
