# Frontend Deployment Guide

## 🌐 Hosting Options

### 1. Vercel (Recommended - Free)
```bash
# Install Vercel CLI
npm install -g vercel

# Build the frontend
cd frontend
npm run build

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# REACT_APP_API_URL=https://your-api-server.com/api
# REACT_APP_SOCKET_URL=https://your-api-server.com
```

### 2. Netlify (Free)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the frontend
cd frontend
npm run build

# Deploy
netlify deploy --prod --dir=build

# Set environment variables in Netlify dashboard
```

### 3. GitHub Pages (Free)
```bash
# Add to frontend/package.json:
{
  "homepage": "https://yourusername.github.io/your-repo-name",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}

# Install gh-pages
cd frontend
npm install --save-dev gh-pages

# Deploy
npm run deploy
```

### 4. Firebase Hosting (Free)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Build and deploy
cd frontend
npm run build
firebase deploy
```

## 🔧 Environment Configuration

### Create Environment Files

**frontend/.env.local (for local development):**
```
REACT_APP_API_URL=http://localhost:3002/api
REACT_APP_SOCKET_URL=http://localhost:3002
```

**frontend/.env.production (for production):**
```
REACT_APP_API_URL=https://your-api-server.com/api
REACT_APP_SOCKET_URL=https://your-api-server.com
```

### Set Environment Variables in Hosting Platforms

**Vercel:**
- Go to Project Settings → Environment Variables
- Add `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL`

**Netlify:**
- Go to Site Settings → Environment Variables
- Add the variables

**Firebase:**
- Use `.env.production` file or set in Firebase Console

## 🚀 Deployment Steps

1. **Build the Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Set Environment Variables** in your hosting platform

3. **Deploy** using your chosen platform

4. **Test** the deployed frontend

## 🔒 CORS Configuration

Make sure your API server allows requests from your frontend domain:

```javascript
// In api/server.js
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-domain.com'
  ],
  credentials: true
}));
```

## 📱 Architecture

```
┌─────────────────┐    HTTP/WebSocket    ┌─────────────────┐
│   Frontend      │ ◄──────────────────► │   API Server    │
│   (Hosted)      │                      │   (Your Server) │
└─────────────────┘                      └─────────────────┘
                                                │
                                                ▼
                                        ┌─────────────────┐
                                        │   Bot Process   │
                                        │   (Your Server) │
                                        └─────────────────┘
```

## 🎯 Benefits of Separate Hosting

- ✅ **Scalability**: Frontend can scale independently
- ✅ **Performance**: CDN distribution for static files
- ✅ **Cost**: Free hosting for frontend
- ✅ **Security**: API server can be in private network
- ✅ **Maintenance**: Update frontend without touching bot

## 🔧 Troubleshooting

**CORS Errors:**
- Check API server CORS configuration
- Verify environment variables are set correctly

**Socket Connection Issues:**
- Ensure WebSocket URL is correct
- Check if your hosting platform supports WebSockets

**Build Errors:**
- Run `npm run build` locally first
- Check for missing dependencies