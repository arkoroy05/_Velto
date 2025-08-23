# 🚨 CORS Issue Solution Guide

## Problem
The Velto extension is encountering CORS (Cross-Origin Resource Sharing) errors when trying to connect to the backend:

```
Access to fetch at 'https://velto.onrender.com/health' from origin 'chrome-extension://...' has been blocked by CORS policy
```

## Root Cause
Chrome extensions have a special origin format (`chrome-extension://...`) that's not included in the backend's CORS configuration.

## ✅ Solutions Implemented

### 1. Backend CORS Fix (Recommended)
I've updated the backend CORS configuration in `memory/src/index.ts` to allow Chrome extensions:

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://velto.onrender.com',
    // Allow Chrome extensions (chrome-extension://*)
    /^chrome-extension:\/\/.*$/,
    'https://velto.ai',
    'https://www.velto.ai'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User-ID', 'Authorization', 'X-Requested-With']
}))

// Handle preflight requests
app.options('*', cors())

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-User-ID, Authorization, X-Requested-With')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
})
```

**To deploy this fix:**
1. Commit and push the changes to your repository
2. Deploy to Render (should auto-deploy if connected to GitHub)
3. Test the extension again

### 2. Extension Background Script Solution (Current Implementation)
I've updated the extension to use the background script for API calls, avoiding CORS issues:

- **Background API Service**: `src/lib/api-background.js`
- **Updated Pages**: All pages now use background script messaging
- **Service Worker**: Handles API requests and forwards responses

**How it works:**
1. Extension pages send messages to background script
2. Background script makes API calls (no CORS restrictions)
3. Results are sent back to extension pages

### 3. CORS Proxy Solution (Temporary Testing)
I've created a CORS proxy service for testing purposes:

- **File**: `src/lib/api-cors-proxy.js`
- **Proxy**: Uses `https://cors-anywhere.herokuapp.com/`
- **Toggle**: Can enable/disable proxy usage

## 🔧 How to Test

### Option 1: Deploy Backend Fix (Recommended)
```bash
cd memory
git add .
git commit -m "Fix CORS for Chrome extensions"
git push
# Wait for Render auto-deploy
```

### Option 2: Use Current Background Script Solution
The extension is already updated to use this approach. Just reload the extension.

### Option 3: Use CORS Proxy for Testing
```javascript
// In any page, import and use:
import corsProxyApiService from '../lib/api-cors-proxy.js'

// Test connection
const result = await corsProxyApiService.testConnection()
```

## 📱 Current Extension Status

### ✅ Working
- Background script API calls
- Context capture and storage
- Local storage fallback
- User interface and navigation

### ⚠️ Needs Backend Deploy
- Direct API calls (CORS blocked)
- Real-time backend status
- Full backend integration

## 🚀 Next Steps

### Immediate (Choose One)
1. **Deploy backend CORS fix** (recommended)
2. **Continue using background script solution**
3. **Use CORS proxy for testing**

### After CORS is Fixed
1. Switch back to direct API calls
2. Remove background script workaround
3. Enable real-time backend status
4. Test full integration

## 🧪 Testing Commands

### Test Backend CORS (after deploy)
```bash
curl -H "Origin: chrome-extension://test" \
     -H "X-User-ID: 689e5a217224da39efe7a47f" \
     https://velto.onrender.com/health
```

### Test Extension
1. Load extension in Chrome
2. Check login page for backend status
3. Test context capture
4. Verify search and dashboard

## 🔍 Debugging

### Check Backend CORS
```bash
curl -X OPTIONS \
     -H "Origin: chrome-extension://test" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-User-ID" \
     https://velto.onrender.com/health
```

### Check Extension Console
- Open extension
- Right-click → Inspect
- Check Console for errors
- Check Network tab for failed requests

## 📋 Files Modified

### Backend
- `memory/src/index.ts` - CORS configuration

### Extension
- `src/background/service-worker.js` - Background API handling
- `src/pages/Login.jsx` - Background script usage
- `src/pages/Search.jsx` - Background script usage
- `src/pages/Dashboard.jsx` - Background script usage
- `src/lib/api-background.js` - Background API service
- `src/lib/api-cors-proxy.js` - CORS proxy service

## 🎯 Recommendation

1. **Deploy the backend CORS fix** - This is the proper solution
2. **Test the extension** - Should work without CORS issues
3. **Remove workarounds** - Clean up background script approach
4. **Enable full features** - Real-time status, direct API calls

The extension is fully functional with the background script approach, but deploying the backend CORS fix will provide the best user experience and performance.
