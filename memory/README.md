# Velto Memory Backend

A serverless backend for Velto - your AI brain that remembers everything you do across every app, AI, and device. This backend provides a comprehensive memory system with MCP (Model Context Protocol) server integration for AI agents.

## 🚀 Features

### Core Memory System
- **Context Storage**: Store and manage context from various AI agents
- **AI Analysis**: Automatic categorization, tagging, and insights generation
- **Semantic Search**: Find related contexts using embeddings
- **Project Organization**: Group contexts by projects and categories
- **Real-time Processing**: Instant context analysis and storage

### MCP Server Integration
- **AI Agent Connectivity**: Connect with Claude, Cursor, Copilot, Windsurf, and more
- **Tool Integration**: 7 powerful MCP tools for context management
- **Universal Memory**: Shared memory layer across all AI agents
- **Prompt Generation**: Convert contexts into actionable prompts

### Advanced Features
- **Embeddings Generation**: Vector embeddings for semantic search
- **Context Chunking**: Intelligent content splitting for better processing
- **Related Context Discovery**: Find similar contexts automatically
- **Analytics & Insights**: Usage statistics and AI-generated insights
- **Webhook Support**: Real-time notifications and integrations

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agents     │    │   MCP Server    │    │   API Server    │
│                 │    │                 │    │                 │
│ • Claude        │◄──►│ • Save Context  │◄──►│ • REST API      │
│ • Cursor        │    │ • Search        │    │ • Authentication│
│ • Copilot       │    │ • Get Context   │    │ • Rate Limiting │
│ • Windsurf      │    │ • Analyze       │    │ • Validation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   AI Processor  │
                       │                 │
                       │ • Embeddings    │
                       │ • Analysis      │
                       │ • Chunking      │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   MongoDB       │
                       │                 │
                       │ • Contexts      │
                       │ • Projects      │
                       │ • Users         │
                       │ • Analytics     │
                       └─────────────────┘
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Atlas
- **AI Providers**: Anthropic Claude, OpenAI GPT, Google Gemini
- **Protocol**: Model Context Protocol (MCP)
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting
- **TypeScript**: Full type safety

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- AI provider API keys (Anthropic, OpenAI, Google)

### Setup

1. **Clone and Install**
   ```bash
   cd memory
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file based on `.env.example`:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/velto-memory?retryWrites=true&w=majority
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # AI Provider API Keys
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_API_KEY=your_google_api_key_here
   
   # Default AI Provider
   DEFAULT_AI_PROVIDER=anthropic
   
   # Security
   JWT_SECRET=your_jwt_secret_here
   ADMIN_API_KEY=your_admin_api_key_here
   
   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
   ```

3. **Database Setup**
   - Create a MongoDB Atlas cluster
   - Get your connection string
   - Update `MONGODB_URI` in your `.env` file

4. **AI Provider Setup**
   - Get API keys from Anthropic, OpenAI, and/or Google
   - Add them to your `.env` file
   - Choose your default provider

## 🚀 Usage

### Development
```bash
# Start development server
npm run dev

# Start MCP server
npm run mcp:dev
```

### Production
```bash
# Build the project
npm run build

# Start production server
npm start

# Start MCP server
npm run mcp:start
```

### API Endpoints

#### Contexts
- `GET /api/v1/contexts` - List contexts
- `GET /api/v1/contexts/:id` - Get specific context
- `POST /api/v1/contexts` - Create new context
- `PUT /api/v1/contexts/:id` - Update context
- `DELETE /api/v1/contexts/:id` - Delete context
- `POST /api/v1/contexts/:id/analyze` - Re-analyze context
- `POST /api/v1/contexts/:id/prompt-version` - Generate prompt version

#### Health & Documentation
- `GET /health` - Health check
- `GET /api/v1/docs` - API documentation

### MCP Tools

The MCP server provides 7 tools for AI agents:

1. **save_context** - Save new context to memory
2. **search_contexts** - Search for contexts
3. **get_context** - Retrieve specific context
4. **generate_prompt_version** - Convert context to prompt
5. **find_related_contexts** - Find similar contexts
6. **get_project_contexts** - Get project contexts
7. **analyze_context** - Analyze context with AI

## 🔧 Configuration

### AI Providers

The system supports multiple AI providers:

- **Anthropic Claude**: Best for analysis and reasoning
- **OpenAI GPT**: Good for general tasks
- **Google Gemini**: Fast and cost-effective

Configure your preferred provider in `.env`:
```env
DEFAULT_AI_PROVIDER=anthropic
```

### Database Indexes

The system automatically creates optimized indexes for:
- User queries
- Project filtering
- Context type filtering
- Tag-based searches
- Text search
- Date range queries

### Rate Limiting

Configure rate limiting in `.env`:
```env
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
```

## 🔒 Security

- **Authentication**: JWT-based authentication (to be implemented)
- **Authorization**: Role-based access control
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Configurable request limits
- **CORS**: Configurable cross-origin requests
- **Helmet**: Security headers
- **Input Sanitization**: XSS protection

## 📊 Monitoring

### Logging
- Structured logging with Winston
- Different log levels for development/production
- File and console output
- Request/response logging

### Health Checks
- Database connectivity
- AI provider availability
- System uptime
- Memory usage

### Analytics
- Context creation metrics
- Search patterns
- AI usage statistics
- User activity tracking

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- contexts.test.ts
```

## 📈 Performance

### Optimizations
- Database connection pooling
- Embedding caching
- Request compression
- Efficient indexing
- Background processing

### Scaling
- Horizontal scaling ready
- Stateless design
- Database sharding support
- CDN integration ready

## 🔄 Deployment

### Docker
```bash
# Build image
docker build -t velto-memory-backend .

# Run container
docker run -p 3001:3001 velto-memory-backend
```

### Cloud Platforms
- **Vercel**: Serverless deployment
- **Railway**: Easy deployment
- **Heroku**: Traditional hosting
- **AWS**: ECS/Fargate
- **Google Cloud**: Cloud Run

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is proprietary to Velto. All rights reserved.

## 🆘 Support

- **Documentation**: [docs.velto.ai](https://docs.velto.ai)
- **Issues**: GitHub Issues
- **Discord**: [Velto Community](https://discord.gg/velto)

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Core memory system
- ✅ MCP server integration
- ✅ Basic API endpoints
- ✅ AI analysis

### Phase 2 (Next)
- 🔄 Advanced search
- 🔄 Project management
- 🔄 User authentication
- 🔄 Webhook system

### Phase 3 (Future)
- 📋 Real-time collaboration
- 📋 Advanced analytics
- 📋 Mobile API
- 📋 Enterprise features

---

**Built with ❤️ by the Velto Team**
