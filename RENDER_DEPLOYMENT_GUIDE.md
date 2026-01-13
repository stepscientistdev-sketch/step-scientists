# 🚀 Render.com Deployment Guide

Since Railway requires a paid plan, let's use Render.com which has a generous free tier!

## Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (use stepscientist.dev@gmail.com)
3. Connect your GitHub account

## Step 2: Deploy Backend
1. **Click "New +"** → **"Web Service"**
2. **Connect Repository**: `stepscientistdev-sketch/step-scientists`
3. **Configure Service**:
   - **Name**: `step-scientists-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run migrate && npm run seed && npm start`

## Step 3: Add PostgreSQL Database
1. **Click "New +"** → **"PostgreSQL"**
2. **Name**: `step-scientists-db`
3. **Plan**: Free
4. **Copy the Internal Database URL** (starts with `postgresql://`)

## Step 4: Set Environment Variables
In your web service → Environment tab:
```
NODE_ENV=production
DATABASE_URL=[paste the PostgreSQL URL from step 3]
CORS_ORIGIN=https://step-scientists.vercel.app
```

## Step 5: Deploy & Test
1. Render will automatically build and deploy
2. Get your service URL (e.g., `https://step-scientists-backend.onrender.com`)
3. Test: Visit `https://your-url/health`

## Step 6: Update Frontend
Update `public/app.js` line 2:
```javascript
const API_BASE = 'https://step-scientists-backend.onrender.com';
```

Then redeploy: `vercel --prod --cwd public`

## Benefits of Render:
- ✅ **Free tier** with 750 hours/month
- ✅ **PostgreSQL included** 
- ✅ **Auto-deploys** from GitHub
- ✅ **HTTPS** by default
- ✅ **No credit card required**

Your Step Scientists game will be fully deployed and accessible worldwide!