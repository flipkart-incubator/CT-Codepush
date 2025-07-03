# 🔧 API Setup Guide - Fixing Swagger 404 Errors

This guide helps you resolve 404 errors when testing API endpoints in the Swagger UI.

## 🚨 Problem

When you try to test API endpoints in Swagger UI, you get 404 errors because:
1. The CodePush API server isn't running
2. Authentication is required for most endpoints
3. CORS configuration might need adjustment

## ✅ Solutions

### Step 0: Run Swagger Documentation Locally (Required First Step)

Before you can test the API endpoints, you need to serve the Swagger documentation locally:

**Method 1: Using Python HTTP Server (Recommended)**
```bash
# Navigate to the docs directory
cd docs

# Start the documentation server on port 3001
python3 -m http.server 3001
```

You should see output like:
```
Serving HTTP on :: port 3001 (http://[::]:3001/) ...
```

**Method 2: Using Node.js HTTP Server (Alternative)**
```bash
# Install http-server globally (if not already installed)
npm install -g http-server

# Navigate to docs directory and serve
cd docs
http-server -p 3001 --cors
```

**Method 3: Using Docker (if Docker is available)**
```bash
# Build and run the documentation container
docker compose -f docker-compose.docs.yml up -d codepush-docs
```

**Access Your Documentation:**
- **Main Documentation**: http://localhost:3001/
- **Interactive Swagger UI**: http://localhost:3001/swagger-ui.html
- **API Specification**: http://localhost:3001/swagger.yaml

**To Stop the Server:**
```bash
# For Python server: Press Ctrl+C in the terminal
# Or if running in background, find and kill the process:
lsof -i :3001
kill <PID>
```

---

### Option 1: Start Local API Server (Recommended for Development)

**Step 1: Build and Start the API Server**
```bash
# Navigate to API directory
cd api

# Install dependencies (if not already done)
npm install

# Build the TypeScript code
npm run build

# Start the API server
npm start
```

The server will start on `http://localhost:3000` and you'll see output like:
```
CodePush Server listening on port 3000
Redis connection established
```

**Step 2: Test API Server**
```bash
# Test if server is running
curl http://localhost:3000/api/account
# Should return 401 Unauthorized (server is running but needs auth)
```

**Step 3: Update Swagger UI**
1. Open `http://localhost:3001` (your docs server)
2. Click **"Swagger UI"**
3. In the top right, make sure **"Development server - http://localhost:3000/api"** is selected

### Option 2: Use Production Server with Authentication

**Step 1: Get Access Token**

If using the production server (`qa-codepush.cleartrip.com`), you need an access token:

```bash
# Option A: Use existing CodePush CLI
code-push access-key add "Swagger Testing"
# Copy the generated access key

# Option B: Get token via OAuth (open in browser)
open "${domain}auth/login/google?redirect_uri=http://localhost:3001&source=swagger"
```

**Step 2: Authenticate in Swagger UI**
1. Open Swagger UI: `http://localhost:3001/swagger-ui.html`
2. Click the **"Authorize"** button (🔒 icon)
3. Enter your access token in the **"Bearer"** field: `your-access-token-here`
4. Click **"Authorize"**
5. Close the authorization dialog

**Step 3: Test Endpoints**
1. Try the `/account` endpoint under **Authentication**
2. Click **"Try it out"**
3. Click **"Execute"**
4. You should get a 200 response with user data

## 🛠️ Environment Configuration

### Local Development Setup

**Create API Environment File:**
```bash
# Create .env file in api directory
cd api
cat > .env << EOF
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
SESSION_SECRET=your-session-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EOF
```

**Start with Environment:**
```bash
cd api
npm run start
```

### Production Environment

**Environment Variables:**
```bash
export NODE_ENV=production
export PORT=3000
export DATABASE_URL=your-database-url
export REDIS_URL=your-redis-url
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🚨 Troubleshooting

### API Server Won't Start

**Check Node.js Version:**
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

**Check Dependencies:**
```bash
cd api
npm install
npm run build
```

**Check Logs:**
```bash
cd api
DEBUG=* npm start
```

### CORS Errors

If you get CORS errors when testing API endpoints:

**Update API CORS Configuration:**
```javascript
// In api/script/server.ts, add:
app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));
```

### Authentication Issues

**For Local Development:**
```bash
# Create a test user access key
curl -X POST http://localhost:3000/api/accessKeys \
  -H "Content-Type: application/json" \
  -d '{"name": "swagger-test"}'
```

**For Production:**
```bash
# Use CodePush CLI
code-push login
code-push access-key add "API Testing"
```

## 📝 Quick Test Commands

**Test API Health:**
```bash
# Test server is running
curl http://localhost:3000/health

# Test with authentication
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     http://localhost:3000/api/account
```

**Test Swagger Docs:**
```bash
# Test documentation is accessible
curl http://localhost:3001/swagger-ui.html
curl http://localhost:3001/swagger.yaml
```

## 🎯 Complete Setup Script

Create this script to automate the setup:

```bash
#!/bin/bash
# setup-codepush-dev.sh

echo "🚀 Setting up CodePush for development..."

# 1. Install API dependencies
echo "📦 Installing API dependencies..."
cd api
npm install
npm run build

# 2. Start API server in background
echo "🔧 Starting API server..."
npm start &
API_PID=$!

# 3. Wait for server to start
echo "⏳ Waiting for API server to start..."
sleep 5

# 4. Test API server
echo "🧪 Testing API server..."
if curl -s http://localhost:3000/api/account > /dev/null; then
    echo "✅ API server is running!"
else
    echo "❌ API server failed to start"
    kill $API_PID
    exit 1
fi

# 5. Start documentation server
echo "📚 Starting documentation server..."
cd ../docs
python3 -m http.server 3001 &
DOCS_PID=$!

echo "🎉 Setup complete!"
echo "📖 Swagger UI: http://localhost:3001/swagger-ui.html"
echo "🔗 API Server: http://localhost:3000/api"
echo ""
echo "To stop servers:"
echo "kill $API_PID $DOCS_PID"
```

## 🔍 Health Check URLs

- **API Health**: `http://localhost:3000/health`
- **API Account**: `http://localhost:3000/api/account` (requires auth)
- **Swagger UI**: `http://localhost:3001/swagger-ui.html`
- **API Spec**: `http://localhost:3001/swagger.yaml`

---

**Need help?** Check the troubleshooting section above or review the API server logs for specific error messages. 