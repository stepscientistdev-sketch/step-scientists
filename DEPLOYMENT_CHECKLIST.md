# Deployment Checklist - Step Scientists

## Current Production Status

### ✅ Backend (Render.com)
- **URL**: https://step-scientists-backend.onrender.com
- **Status**: DEPLOYED and LIVE
- **Database**: PostgreSQL (managed by Render)
- **Auto-Deploy**: Yes (from `main` branch)

### ✅ Web Frontend (Vercel)
- **URL**: https://step-scientists.vercel.app
- **Status**: DEPLOYED and LIVE
- **Deploy Method**: Manual from `public/` folder
- **Command**: `cd public && vercel --prod`

### ⚠️ Mobile App (React Native)
- **Location**: `src/` folder
- **Status**: IN DEVELOPMENT (not deployed)
- **Future**: Google Play Store + Apple App Store

---

## Backend Deployment Process

### Pre-Deployment Checklist
- [ ] All TypeScript compiles without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Database migrations are ready
- [ ] Environment variables are set in Render dashboard
- [ ] API endpoints tested locally

### Deployment Steps
1. **Commit changes**
   ```bash
   git add backend/
   git commit -m "feat: your backend changes"
   ```

2. **Push to GitHub**
   ```bash
   git push origin main
   ```

3. **Automatic Deployment**
   - Render detects push to `main`
   - Runs `npm install`
   - Runs `npm run build`
   - Runs migrations automatically
   - Starts server

4. **Verify Deployment**
   - [ ] Check Render dashboard for successful deployment
   - [ ] Test health endpoint: https://step-scientists-backend.onrender.com/health
   - [ ] Check logs for errors
   - [ ] Test key API endpoints

### Post-Deployment Verification
- [ ] `GET /health` returns 200 OK
- [ ] `GET /api/species/all` returns species list
- [ ] `GET /api/steplings` returns steplings (may be empty)
- [ ] Database migrations completed successfully
- [ ] No errors in Render logs

---

## Web App Deployment Process

### Pre-Deployment Checklist
- [ ] Test locally with `npx http-server -p 8080` in `public/` folder
- [ ] Check browser console for JavaScript errors
- [ ] Verify backend connection works
- [ ] Test Google Fit integration
- [ ] Check all game features work

### Deployment Steps
1. **Navigate to public folder**
   ```bash
   cd public
   ```

2. **Test locally first**
   ```bash
   npx http-server -p 8080
   # Open http://localhost:8080
   # Test all features
   ```

3. **Commit changes**
   ```bash
   git add public/
   git commit -m "feat: your web app changes"
   git push origin main
   ```

4. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

5. **Verify Deployment**
   - [ ] Open https://step-scientists.vercel.app
   - [ ] Check browser console for errors
   - [ ] Verify "✅ Connected" status for backend
   - [ ] Test Google Fit connection
   - [ ] Test discovery mode
   - [ ] Test training mode
   - [ ] Test fusion system
   - [ ] Check achievement display

### Post-Deployment Verification
- [ ] Backend connection status shows "✅ Connected"
- [ ] Google Fit can connect and sync steps
- [ ] Can inspect cells and discover species
- [ ] Can view steplings collection
- [ ] Training roster works
- [ ] Fusion lab works
- [ ] Achievements display correctly
- [ ] No JavaScript errors in console

---

## Common Deployment Issues

### Backend Issues

#### "Backend is waking up"
- **Cause**: Render free tier sleeps after 15min inactivity
- **Solution**: Wait 30-60 seconds for first request
- **Prevention**: Upgrade to paid tier or implement keep-alive ping

#### Database Migration Errors
- **Check**: Render logs for migration errors
- **Fix**: Access Render Shell and run `npm run migrate` manually
- **Rollback**: Run `npm run migrate:rollback` if needed

#### TypeScript Compilation Errors
- **Check**: Run `npm run build` locally first
- **Fix**: Fix TypeScript errors before pushing
- **Verify**: Check `backend/dist/` folder is generated

### Web App Issues

#### "❌ Offline" Status
- **Cause**: Backend sleeping or network issue
- **Solution**: Wait 60 seconds, refresh page
- **Check**: Test backend URL directly in browser

#### JavaScript Syntax Errors
- **Symptom**: Nothing works, console shows errors
- **Solution**: Check `public/app.js` for syntax errors
- **Tool**: Use `getDiagnostics` or ESLint
- **Recent Fix**: Removed corrupted code fragment (Jan 14, 2025)

#### Google Fit Not Connecting
- **Check**: OAuth client ID is correct
- **Check**: Permissions granted in Google account
- **Fix**: Clear localStorage, reconnect
- **Verify**: Token stored in localStorage

#### API Calls Failing
- **Check**: Network tab in DevTools
- **Check**: CORS errors in console
- **Fix**: Verify API_BASE URL in app.js
- **Fix**: Check backend CORS configuration

---

## Environment Variables

### Backend (Render Dashboard)

**Required**:
- `NODE_ENV=production`
- `DATABASE_URL` (auto-set by Render)

**Optional** (for future features):
- `JWT_SECRET` (for authentication)
- `JWT_REFRESH_SECRET` (for refresh tokens)
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX_REQUESTS=100`

### Web App (Vercel)

**No environment variables needed** - API URL is auto-detected:
```javascript
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://192.168.1.111:3000'  // Local dev
    : 'https://step-scientists-backend.onrender.com'; // Production
```

---

## Rollback Procedures

### Backend Rollback
1. Go to Render dashboard
2. Navigate to deployment history
3. Click "Rollback" on previous working deployment
4. Or redeploy specific commit:
   ```bash
   git revert <bad-commit>
   git push origin main
   ```

### Web App Rollback
```bash
cd public
vercel rollback
# Or manually redeploy previous version
git checkout <previous-commit> -- public/
vercel --prod
```

### Database Rollback
```bash
cd backend
npm run migrate:rollback
# Then redeploy backend to run correct migrations
```

---

## Testing Checklist

### Backend API Testing
- [ ] Health check: `curl https://step-scientists-backend.onrender.com/health`
- [ ] Species list: `curl https://step-scientists-backend.onrender.com/api/species/all`
- [ ] Discover species: `POST /api/species/discover`
- [ ] Get steplings: `GET /api/steplings`
- [ ] Level up: `PUT /api/steplings/:id/levelup`
- [ ] Fusion: `POST /api/steplings/fuse`
- [ ] Achievements: `GET /api/lifetime-achievements`

### Web App Testing
- [ ] Page loads without errors
- [ ] Backend connects (green status)
- [ ] Google Fit connects
- [ ] Step count displays
- [ ] Can switch modes
- [ ] Can inspect cells
- [ ] Species discovery works
- [ ] Steplings display correctly
- [ ] Training roster works
- [ ] Fusion lab works
- [ ] Achievements display
- [ ] Magnifying glass inventory works
- [ ] XP banking works

### Mobile App Testing (Future)
- [ ] App installs on Android
- [ ] App installs on iOS
- [ ] Step counter works
- [ ] API calls succeed
- [ ] Google Fit integration works
- [ ] Offline mode works

---

## Monitoring

### Backend Monitoring
- **Render Dashboard**: Real-time logs and metrics
- **Health Endpoint**: Automated uptime monitoring
- **Database**: Check size and performance in Render

### Web App Monitoring
- **Vercel Analytics**: Page views and performance
- **Browser Console**: User-reported errors
- **Google Fit API**: Check quota usage

### Alerts to Set Up
- [ ] Backend downtime alerts
- [ ] Database storage alerts
- [ ] API error rate alerts
- [ ] Deployment failure notifications

---

## Quick Reference

### Deployment Commands
```bash
# Backend (automatic on push)
git push origin main

# Web App
cd public && vercel --prod

# Database migrations
cd backend && npm run migrate
```

### Important URLs
- **Web App**: https://step-scientists.vercel.app
- **Backend**: https://step-scientists-backend.onrender.com
- **Health Check**: https://step-scientists-backend.onrender.com/health
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard

### Support Resources
- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Google Fit API**: https://developers.google.com/fit

---

**Last Updated**: January 14, 2025
**Status**: Both backend and web app are LIVE in production