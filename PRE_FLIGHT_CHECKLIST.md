# Pre-Flight Checklist - Mobile Testing Setup

## ✅ Complete Setup Verification

Before starting mobile testing, ensure all these items are properly configured:

### 1. System Prerequisites
- [ ] **Node.js** installed (v16+ recommended)
- [ ] **npm** available and working
- [ ] **PostgreSQL** installed and running
- [ ] **Android Studio** installed (for React Native)
- [ ] **React Native CLI** installed globally: `npm install -g react-native-cli`

### 2. Network Configuration
- [ ] **IP Address** detected and configured in API client
- [ ] **Same WiFi Network** - Computer and mobile device connected
- [ ] **Firewall** allows connections on port 3000
- [ ] **CORS** properly configured in backend server

### 3. Database Setup
- [ ] **PostgreSQL** service running
- [ ] **Database** created (step_monsters)
- [ ] **Migrations** executed successfully
- [ ] **Seed data** loaded (species, initial data)
- [ ] **Environment variables** configured in backend/.env

### 4. Backend Configuration
- [ ] **Dependencies** installed (backend/node_modules exists)
- [ ] **Environment file** (.env) exists with correct database credentials
- [ ] **Server starts** without errors: `cd backend && npm run dev`
- [ ] **Health endpoint** responds: `http://YOUR_IP:3000/health`
- [ ] **API endpoints** accessible: `http://YOUR_IP:3000/api/species`

### 5. Frontend Configuration
- [ ] **Dependencies** installed (node_modules exists)
- [ ] **API client** configured with correct IP address
- [ ] **React Native** builds successfully: `npx react-native run-android`
- [ ] **Google Fit** permissions configured in AndroidManifest.xml

### 6. Mobile Device Preparation
- [ ] **Developer options** enabled on Android device
- [ ] **USB debugging** enabled
- [ ] **Google Play Services** installed and updated
- [ ] **Google Fit** app installed (optional but recommended)
- [ ] **Device connected** and recognized by ADB: `adb devices`

## 🚀 Quick Setup Commands

### Automated Setup (Recommended)
```bash
# Windows
setup-mobile-testing.bat

# Mac/Linux
chmod +x setup-mobile-testing.sh
./setup-mobile-testing.sh
```

### Manual Setup (If needed)
```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..

# 2. Setup database
cd backend
npm run migrate
npm run seed
cd ..

# 3. Find your IP address
# Windows: ipconfig
# Mac/Linux: ifconfig

# 4. Update src/services/apiClient.ts
# Replace 'YOUR_COMPUTER_IP' with your actual IP

# 5. Test connectivity
node test-connectivity.js
```

## 🧪 Verification Tests

### Backend Connectivity Test
```bash
node test-connectivity.js
```
Expected output: ✅ All critical tests should pass

### Mobile Browser Test
1. Open browser on mobile device
2. Visit: `http://YOUR_IP:3000/health`
3. Should see JSON response: `{"status":"OK","timestamp":"...","uptime":...}`

### React Native Build Test
```bash
npx react-native run-android
```
Expected: App installs and launches on connected device

## 🔧 Common Issues & Solutions

### Issue: "Could not detect IP address"
**Solution:** Manually find IP and update `src/services/apiClient.ts`
```bash
# Windows
ipconfig | findstr "IPv4"

# Mac/Linux  
ifconfig | grep "inet "
```

### Issue: "Database connection failed"
**Solutions:**
1. Start PostgreSQL service
2. Check credentials in `backend/.env`
3. Create database: `createdb step_monsters`

### Issue: "CORS error" on mobile
**Solution:** Verify backend CORS configuration includes your IP range

### Issue: "React Native build fails"
**Solutions:**
1. Clean build: `npx react-native clean`
2. Reset Metro cache: `npx react-native start --reset-cache`
3. Check Android SDK path in environment variables

### Issue: "Google Fit permissions denied"
**Solutions:**
1. Check AndroidManifest.xml has correct permissions
2. Manually grant permissions in device settings
3. Ensure Google Play Services is updated

## 📱 Mobile Testing Readiness Criteria

Before proceeding with mobile testing, ensure:

### ✅ Technical Readiness
- [ ] Backend server starts and responds to health checks
- [ ] Mobile device can access server via browser
- [ ] React Native app builds and installs successfully
- [ ] Google Fit permissions are properly configured

### ✅ Functional Readiness
- [ ] Step counter service initializes without errors
- [ ] Game modes can be switched
- [ ] Species discovery system works
- [ ] Stepling fusion mechanics function
- [ ] Data persistence works across app restarts

### ✅ Network Readiness
- [ ] Stable WiFi connection for both devices
- [ ] No firewall blocking port 3000
- [ ] API calls succeed from mobile app
- [ ] Data sync works between client and server

## 🎯 Success Indicators

You're ready for mobile testing when:
1. ✅ `node test-connectivity.js` shows all critical tests passing
2. ✅ Mobile browser can access `http://YOUR_IP:3000/health`
3. ✅ React Native app launches without crashes
4. ✅ Step counter requests Google Fit permissions
5. ✅ Basic game functionality works in app

## 📋 Final Checklist

Before starting comprehensive mobile testing:
- [ ] All setup scripts completed successfully
- [ ] Connectivity tests pass
- [ ] Mobile app installs and launches
- [ ] Google Fit permissions granted
- [ ] Basic functionality verified
- [ ] Testing plan reviewed (MOBILE_TESTING_GUIDE.md)

**Status: Ready for Mobile Testing! 🚀**