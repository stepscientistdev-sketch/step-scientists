# 🚂 Railway Deployment Guide

## Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended)
3. Verify your account

## Step 2: Deploy Backend
1. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose this repository
   - Select the `backend` folder as root

2. **Add Database**
   - In your project dashboard, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will create a database and provide connection URL

3. **Set Environment Variables**
   - Go to your backend service → "Variables" tab
   - Add these variables:
     ```
     NODE_ENV=production
     PORT=3000
     DATABASE_URL=[Railway will auto-populate this]
     CORS_ORIGIN=https://step-scientists.vercel.app
     ```

4. **Deploy**
   - Railway will automatically build and deploy
   - Wait for deployment to complete
   - Copy your Railway app URL (e.g., `https://your-app.railway.app`)

## Step 3: Run Database Migrations
1. In Railway dashboard, go to your backend service
2. Click "Deploy Logs" to see if build succeeded
3. Go to "Settings" → "Environment" 
4. Add a deploy command: `npm run migrate && npm run seed && npm start`

## Step 4: Update Frontend
Update your frontend `app.js` to use the Railway URL:
```javascript
const API_BASE = 'https://your-app.railway.app';
```

## Step 5: Test
1. Visit your Railway URL + `/health` to test
2. Check that your Vercel frontend can connect
3. Test all game functionality

## Troubleshooting
- Check "Deploy Logs" for build errors
- Check "App Logs" for runtime errors
- Ensure DATABASE_URL is set correctly
- Verify CORS_ORIGIN matches your Vercel URL