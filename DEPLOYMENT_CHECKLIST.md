# Deployment Checklist - Mobile Testing Setup

## Pre-Deployment Steps

### 1. Environment Configuration
- [ ] Update API base URL for network access
- [ ] Verify database is running and accessible
- [ ] Check all environment variables are set
- [ ] Ensure backend server can accept external connections

### 2. Database Setup
- [ ] Run all migrations
- [ ] Seed initial species data
- [ ] Verify database connectivity from backend
- [ ] Test API endpoints with Postman/curl

### 3. Build Configuration
- [ ] Update React Native bundle for release testing
- [ ] Configure Android permissions for Google Fit
- [ ] Set up proper signing keys (if needed)
- [ ] Test build process locally

## Deployment Steps

### Backend Deployment
1. Start PostgreSQL database
2. Run migrations: `npm run migrate`
3. Seed data: `npm run seed`
4. Start server: `npm run dev`
5. Test API health endpoint

### Mobile App Deployment
1. Update network configuration
2. Build Android APK: `npx react-native run-android --variant=release`
3. Install on test device
4. Grant Google Fit permissions
5. Test basic functionality

## Post-Deployment Verification

### API Connectivity
- [ ] Health endpoint responds: `GET /health`
- [ ] Auth endpoints work: `POST /api/auth/register`
- [ ] Species data loads: `GET /api/species`
- [ ] Stepling endpoints respond: `GET /api/steplings`

### Mobile App Functionality
- [ ] App launches without crashes
- [ ] Google Fit permissions granted
- [ ] Step counter shows current steps
- [ ] Can switch game modes
- [ ] API calls succeed (check network logs)

## Network Configuration Details

### Find Your IP Address
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

### Update API Client
File: `src/services/apiClient.ts`
```typescript
// Change from localhost to your IP
private readonly baseURL = 'http://YOUR_IP_ADDRESS:3000/api';
```

### Backend CORS Configuration
Ensure backend accepts connections from mobile devices in `backend/src/server.ts`

## Testing Priorities

### Week 1 Focus Areas
1. **Step Tracking Accuracy** - Most critical
2. **Game Mode Switching** - Core mechanic
3. **Species Discovery** - Engagement factor
4. **Data Persistence** - User trust

### Success Metrics
- Step count matches device counter within 5%
- No crashes during 30-minute usage session
- Game modes work reliably
- Data syncs properly between sessions

## Troubleshooting Common Issues

### Connection Issues
- Verify mobile and computer on same WiFi
- Check firewall settings
- Test API URL in mobile browser first

### Permission Issues
- Ensure Google Fit permissions granted
- Check Android app permissions in settings
- Verify Google Play Services installed

### Performance Issues
- Monitor battery usage in device settings
- Check for memory leaks in long sessions
- Verify background processing works

## Ready for Testing Checklist
- [ ] Backend running and accessible
- [ ] Mobile app installed on device
- [ ] Network connectivity verified
- [ ] Google Fit permissions granted
- [ ] Initial user account created
- [ ] Basic functionality tested