# 🚂 Step Scientists - Railway Deployment

## Quick Setup (5 minutes)

### 1. Deploy Backend to Railway
1. **Go to [railway.app](https://railway.app)** and sign up with GitHub
2. **Click "New Project"** → "Deploy from GitHub repo"
3. **Select this repository** and choose the `backend` folder
4. **Add PostgreSQL database**: Click "New" → "Database" → "PostgreSQL"
5. **Set environment variables** in your backend service:
   ```
   NODE_ENV=production
   CORS_ORIGIN=https://step-scientists.vercel.app
   ```
6. **Wait for deployment** and copy your Railway URL

### 2. Update Frontend
1. **Edit `public/app.js`** line 2:
   ```javascript
   const API_BASE = 'https://YOUR-RAILWAY-URL-HERE';
   ```
2. **Deploy to Vercel**:
   ```bash
   vercel --prod --cwd public
   ```

### 3. Test
- Visit `https://your-railway-url/health` (should show "OK")
- Visit `https://step-scientists.vercel.app` (should connect)
- Test all game features!

## What You Get
- ✅ **Fully deployed backend** on Railway (free tier)
- ✅ **PostgreSQL database** with all your species/steplings data
- ✅ **Global access** - anyone can play your game
- ✅ **Auto-scaling** - handles traffic spikes
- ✅ **HTTPS** - secure connections
- ✅ **Persistent data** - steplings saved between sessions

## Railway Free Tier
- **$5 credit per month** (enough for small games)
- **Automatic scaling**
- **Built-in PostgreSQL**
- **GitHub integration**

Your Step Scientists game will be fully functional and accessible worldwide!