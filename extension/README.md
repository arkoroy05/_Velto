# 🧠 Velto Extension

A Chrome extension that provides shared memory for AI tools, allowing you to capture, store, and retrieve context across different AI platforms like ChatGPT, Claude, and Cursor.

## ✨ Features

- **Context Capture**: Select text from AI tools and save it to your personal knowledge base
- **Backend Integration**: Connects to Velto Memory backend for persistent storage and AI-powered features
- **Smart Search**: Find and retrieve stored contexts using semantic search
- **Analytics Dashboard**: View your context usage statistics and insights
- **Cross-Platform**: Works with ChatGPT, Claude, Cursor, and other AI tools
- **Offline Support**: Local storage fallback when backend is unavailable

## 🚀 Quick Start

### 1. Build the Extension

```bash
cd extension
npm install
npm run build
```

### 2. Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension/dist` folder
4. The Velto extension should now appear in your extensions list

### 3. Test Backend Connection

1. Open the extension by clicking the Velto icon in your Chrome toolbar
2. You'll be redirected to the login page
3. The backend status will automatically check connection to `https://velto.onrender.com`
4. Use any password to log in (authentication is simplified for testing)

## 🧪 Testing the Full Flow

### Test 1: Backend Connection
1. Open the extension and check the login page
2. Verify backend status shows "Connected" with green indicator
3. Check that version and database status are displayed

### Test 2: Context Capture
1. Go to [ChatGPT](https://chat.openai.com) or [Claude](https://claude.ai)
2. Select some text in a conversation
3. Open the Velto extension and go to the Capture tab
4. Click "Capture from current tab"
5. Verify the snippet is saved and shows in the preview
6. Check that it's synced to the backend (green status)

### Test 3: Search and Retrieval
1. Go to the Search tab in the extension
2. Search for contexts using keywords from your captured content
3. Click on search results to view full context details
4. Verify that contexts are being retrieved from the backend

### Test 4: Dashboard Analytics
1. Go to the Dashboard tab
2. Check that statistics are displayed (total contexts, snippets)
3. Verify recent contexts are shown
4. Test the sync functionality

### Test 5: Cross-Platform Testing
1. Test capture from different AI tools:
   - ChatGPT: `https://chat.openai.com/*`
   - Claude: `https://claude.ai/*`
   - Cursor: `https://cursor.sh/*` or `https://www.cursor.com/*`
2. Verify that contexts are properly tagged with source information

## 🔧 Configuration

### Backend URL
The extension is configured to connect to:
```
https://velto.onrender.com/api/v1
```

### Test User
For testing purposes, the extension uses a hardcoded user ID:
```
689e5a217224da39efe7a47f
```

### Environment Variables
If you need to change the backend URL, edit `src/lib/api.js`:
```javascript
const API_BASE_URL = 'your-backend-url-here'
```

## 📱 Extension Structure

```
extension/
├── src/
│   ├── pages/
│   │   ├── Login.jsx          # Authentication and backend status
│   │   ├── Dashboard.jsx      # Analytics and overview
│   │   ├── Capture.jsx        # Context capture interface
│   │   ├── Search.jsx         # Context search and retrieval
│   │   └── Settings.jsx       # Extension settings
│   ├── background/
│   │   └── service-worker.js  # Background processing and API calls
│   ├── lib/
│   │   ├── api.js            # Backend API service
│   │   └── constants.js      # Message types and configuration
│   └── App.jsx               # Main app with navigation
├── dist/                     # Built extension files
└── test-backend.html         # Standalone backend test page
```

## 🔌 API Integration

The extension integrates with the Velto Memory backend through these endpoints:

- `GET /api/v1/health` - Backend health check
- `GET /api/v1/contexts` - List user contexts
- `POST /api/v1/contexts` - Create new context
- `GET /api/v1/contexts/:id` - Get specific context
- `GET /api/v1/search` - Search contexts
- `GET /api/v1/analytics` - User analytics

## 🐛 Troubleshooting

### Backend Connection Issues
1. Check if the backend URL is accessible in your browser
2. Verify the test user ID is valid
3. Check browser console for CORS or network errors
4. Use the `test-backend.html` file to test API endpoints directly

### Extension Not Working
1. Ensure the extension is properly loaded in Chrome
2. Check the extension's background page console for errors
3. Verify content scripts are injected on supported sites
4. Check that the extension has necessary permissions

### Build Issues
1. Ensure Node.js and npm are installed
2. Run `npm install` to install dependencies
3. Check for any TypeScript or build errors
4. Verify Vite configuration is correct

## 🚀 Development

### Local Development
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Testing
Open `test-backend.html` in your browser to test backend connectivity without the extension.

## 📋 TODO

- [ ] Implement proper JWT authentication
- [ ] Add context editing and deletion
- [ ] Implement context injection back into AI tools
- [ ] Add user preferences and settings
- [ ] Implement real-time sync notifications
- [ ] Add context categorization and tagging
- [ ] Implement advanced search filters
- [ ] Add export/import functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Velto ecosystem. See the main repository for license information.
