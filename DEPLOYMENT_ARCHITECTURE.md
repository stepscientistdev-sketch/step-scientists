# Step Scientists - Deployment Architecture

## Overview

Step Scientists has **two separate frontends** and **one backend**:

1. **Web App** (`public/` folder) - ✅ DEPLOYED to Vercel
2. **Mobile App** (`src/` folder) - ⚠️ IN DEVELOPMENT (not deployed)
3. **Backend API** (`backend/` folder) - ✅ DEPLOYED to Render.com

## Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   WEB FRONTEND   │         │  MOBILE FRONTEND │         │
│  │   (Vercel)       │         │  (Not Deployed)  │         │
│  │                  │         │                  │         │
│  │  public/         │         │  src/            │         │
│  │  - index.html    │         │  - React Native  │         │
│  │  - app.js        │         │  - TypeScript    │         │
│  │  - Google Fit    │         │  - Redux         │         │
│  │                  │         │                  │         │
│  │  step-scientists │         │  (Future)        │         │
│  │  .vercel.app     │         │                  │         │
│  └────────┬─────────┘         └──────────────────┘         │
│           │                                                  │
│           │ HTTPS API Calls                                 │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │         BACKEND API (Render.com)             │          │
│  │                                               │          │
│  │  backend/                                     │          │
│  │  - Express.js + TypeScript                   │          │
│  │  - RESTful API                                │          │
│  │  - JWT Auth (planned)                        │          │
│  │                                               │          │
│  │  step-scientists-backend.onrender.com        │          │
│  └────────────────────┬──────────────────────────┘          │
│                       │                                      │
│                       │ SQL Queries                          │
│                       │                                      │
│                       ▼                                      │
│  ┌──────────────────────────────────────────────┐          │
│  │      PostgreSQL Database (Render)            │          │
│  │                                               │          │
│  │  Tables:                                      │          │
│  │  - players                                    │          │
│  │  - species                                    │          │
│  │  - steplings                                  │          │
│  │  - lifetime_achievements                      │          │
│  │                                               │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Details

### 1. Backend API (Render.com)

**URL**: https://step-scientists-backend.onrender.com

**Technology Stack**:
- Node.js with Express.js
- TypeScript
- PostgreSQL database (managed by Render)
- Knex.js for migrations and queries

**Deployment Process**:
1. Push code to GitHub `main` branch
2. Render automatically detects changes
3. Runs `npm install`
4. Runs `npm run build` (compiles TypeScript)
5. Runs database migrations automatically
6. Starts server with `npm start`

**Environment Variables** (set in Render dashboard):
- `NODE_ENV=production`
- `PORT=3000` (auto-set by Render)
- `DATABASE_URL` (auto-set by Render for PostgreSQL)
- `JWT_SECRET` (for future auth)

**Health Check**: `GET /health`
```json
{
  "status": "OK",
  "timestamp": "2024-01-14T...",
  "uptime": 12345
}
```

**Key Endpoints**:
- `GET /api/species/all` - Get all species
- `POST /api/species/discover` - Discover new species (creates Stepling)
- `GET /api/steplings` - Get player's Steplings
- `PUT /api/steplings/:id/levelup` - Level up Stepling
- `POST /api/steplings/fuse` - Fuse two Steplings
- `GET /api/lifetime-achievements` - Get achievements
- `POST /api/lifetime-achievements/sync` - Sync achievement progress

**Database Migrations**:
- `001_create_players_table.js`
- `002_create_species_table.js`
- `003_create_sync_conflicts_table.js`
- `004_create_lifetime_achievements_table.js`

**Seeded Data**:
- 5 species: Grasshopper, Turtle, Butterfly, Beetle, Dragonfly
- Each with rarity, stats, and emoji

### 2. Web Frontend (Vercel)

**URL**: https://step-scientists.vercel.app

**Technology Stack**:
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- Google Fit Web API
- Service Worker for PWA features

**Deployment Process**:
```bash
# Navigate to public folder
cd public

# Deploy to production
vercel --prod
```

**Key Files**:
- `index.html` - Main HTML structure
- `app.js` - Game logic (2600+ lines)
- `sw.js` - Service worker for offline support
- `manifest.json` - PWA manifest

**Features**:
- Google Fit integration (OAuth 2.0)
- Step tracking with daily reset
- Discovery Mode (cells) and Training Mode (XP)
- Species discovery with magnifying glass tiers
- Stepling collection and management
- Training roster (10-16 slots based on achievements)
- Fusion system
- Lifetime achievements (12 named + infinite)
- XP banking system
- Milestone tracking (magnifying glass rewards)

**API Detection**:
```javascript
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://192.168.1.111:3000'  // Local development
    : 'https://step-scientists-backend.onrender.com'; // Production
```

**Google Fit Configuration**:
- Client ID: `570511343860-48hgn66bnn5vjdsvb3m62m4qpinbfl9n.apps.googleusercontent.com`
- Scopes: `fitness.activity.read`
- Token persistence in localStorage
- Automatic token refresh

### 3. Mobile App (React Native) - NOT DEPLOYED

**Location**: `src/` folder

**Technology Stack**:
- React Native with TypeScript
- Redux Toolkit for state management
- React Navigation
- AsyncStorage for local persistence

**Status**: In development, not yet deployed to app stores

**Future Deployment**:
- Android: Google Play Store
- iOS: Apple App Store
- Or Firebase App Distribution for testing

## Deployment Workflows

### Backend Deployment

```bash
# 1. Make changes to backend code
cd backend

# 2. Test locally
npm run dev

# 3. Commit and push
git add .
git commit -m "feat: your changes"
git push origin main

# 4. Render automatically deploys
# Monitor at: https://dashboard.render.com
```

### Web App Deployment

```bash
# 1. Make changes to web app
cd public

# 2. Test locally
npx http-server -p 8080
# Open http://localhost:8080

# 3. Commit changes
git add .
git commit -m "feat: your changes"
git push origin main

# 4. Deploy to Vercel
vercel --prod

# 5. Verify deployment
# Open https://step-scientists.vercel.app
# Check browser console for errors
# Test backend connection
# Test Google Fit connection
```

### Database Migrations

**Creating a new migration**:
```bash
cd backend
npm run migrate:make migration_name
# Edit the new file in backend/migrations/
npm run migrate
```

**Running migrations on Render**:
- Automatic on deployment
- Or manually via Render Shell: `npm run migrate`

**Rolling back**:
```bash
npm run migrate:rollback
```

## Environment-Specific Configuration

### Local Development

**Backend**:
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=step_scientists
DB_USER=postgres
DB_PASSWORD=your_password
```

**Web App**:
- Detects localhost and uses local backend
- Or manually set API_BASE in app.js

### Production

**Backend** (Render):
- Environment variables set in Render dashboard
- DATABASE_URL automatically configured
- Migrations run automatically

**Web App** (Vercel):
- No environment variables needed
- Automatically detects production hostname
- Uses production backend URL

## Monitoring & Debugging

### Backend Logs
- View in Render dashboard
- Real-time log streaming
- Error tracking

### Web App Debugging
- Browser DevTools console
- Network tab for API calls
- Application tab for localStorage/service worker

### Database Access
- Render dashboard provides psql shell
- Or use external tools with connection string

## Security Considerations

### Backend
- CORS configured for Vercel domain
- Rate limiting on API endpoints
- JWT authentication (planned)
- Environment variables for secrets

### Web App
- HTTPS only (enforced by Vercel)
- Google OAuth for Fit access
- No sensitive data in localStorage
- Service worker for secure offline access

### Database
- Managed by Render (automatic backups)
- SSL connections enforced
- No direct public access

## Scaling Considerations

### Backend
- Render free tier: 512MB RAM, sleeps after 15min inactivity
- Upgrade to paid tier for:
  - No sleep
  - More RAM/CPU
  - Horizontal scaling

### Database
- Render free tier: 1GB storage
- Upgrade for:
  - More storage
  - Better performance
  - Automatic backups

### Web App
- Vercel free tier: Unlimited bandwidth
- Automatic CDN distribution
- Edge caching

## Troubleshooting

### Backend Issues

**"Backend is waking up"**:
- Free tier sleeps after 15min inactivity
- First request takes 30-60 seconds
- Subsequent requests are fast

**Database connection errors**:
- Check Render dashboard for database status
- Verify DATABASE_URL is set
- Check migration status

### Web App Issues

**"❌ Offline" status**:
- Backend may be sleeping (wait 60s)
- Check browser console for errors
- Verify API_BASE URL is correct

**Google Fit not connecting**:
- Check OAuth client ID is correct
- Verify Google Fit permissions granted
- Clear localStorage and reconnect

**JavaScript errors**:
- Check browser console
- Verify app.js has no syntax errors
- Clear cache and hard reload

## Rollback Procedures

### Backend Rollback
1. Go to Render dashboard
2. Select deployment history
3. Click "Rollback" on previous working version

### Web App Rollback
```bash
cd public
vercel rollback
# Or redeploy previous commit
git checkout <previous-commit>
vercel --prod
```

### Database Rollback
```bash
cd backend
npm run migrate:rollback
# Then redeploy backend to run correct migrations
```

## Future Improvements

### Backend
- [ ] Implement JWT authentication
- [ ] Add Redis for caching
- [ ] Implement WebSocket for real-time features
- [ ] Add comprehensive logging (Winston/Pino)
- [ ] Set up CI/CD pipeline

### Web App
- [ ] Add offline mode with service worker sync
- [ ] Implement push notifications
- [ ] Add analytics tracking
- [ ] Optimize bundle size
- [ ] Add error boundary and crash reporting

### Mobile App
- [ ] Complete React Native implementation
- [ ] Deploy to TestFlight/Firebase
- [ ] Submit to app stores
- [ ] Implement deep linking
- [ ] Add native step counter fallback

## Support & Maintenance

### Regular Tasks
- Monitor Render logs for errors
- Check database size and performance
- Review API usage patterns
- Update dependencies monthly
- Test Google Fit integration after API changes

### Emergency Contacts
- Render Support: https://render.com/support
- Vercel Support: https://vercel.com/support
- Google Fit API: https://developers.google.com/fit

---

**Last Updated**: January 14, 2025
**Maintained By**: Development Team
