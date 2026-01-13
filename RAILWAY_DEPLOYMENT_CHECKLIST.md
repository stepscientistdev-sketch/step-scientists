# 🚂 Railway Deployment Checklist

## ✅ Pre-Deployment (Ready!)
- [x] Git repository created and code pushed
- [x] Backend package.json with correct scripts
- [x] Railway.json configuration file
- [x] Database migrations and seeds ready
- [x] Environment variables documented
- [x] CORS configured for production

## 🚀 Railway Deployment Steps

### 1. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select: `stepscientistdev-sketch/step-scientists`
5. Choose root directory: `backend`

### 2. Add PostgreSQL Database
1. In Railway dashboard, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will auto-generate DATABASE_URL

### 3. Set Environment Variables
In your backend service → Variables tab:
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://step-scientists.vercel.app
DATABASE_URL=[Auto-populated by Railway]
```

### 4. Deploy & Test
1. Railway will automatically build and deploy
2. Copy your Railway URL (e.g., `https://your-app.railway.app`)
3. Test: Visit `https://your-app.railway.app/health`
4. Should return: `{"status":"OK","timestamp":"...","uptime":...}`

### 5. Update Frontend
1. Edit `public/app.js` line 2:
   ```javascript
   const API_BASE = 'https://your-railway-url-here';
   ```
2. Deploy to Vercel: `vercel --prod --cwd public`

## 🎯 Expected Results
- ✅ Backend running on Railway with PostgreSQL
- ✅ Database tables created and seeded
- ✅ Frontend connecting to Railway backend
- ✅ All game features working globally

## 🔧 Troubleshooting
- **Build fails**: Check Railway deploy logs
- **Database errors**: Verify DATABASE_URL is set
- **CORS errors**: Check CORS_ORIGIN matches Vercel URL
- **Connection issues**: Test `/health` endpoint first

Your Step Scientists game will be fully deployed and accessible worldwide!