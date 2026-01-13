# Step Monsters - Mobile Deployment Guide

## Overview
This guide covers deploying the Step Monsters app to Android devices for testing, including both development builds and production-ready APKs.

## Prerequisites

### Development Environment
- Node.js (v16 or higher)
- React Native CLI
- Android Studio with SDK
- Java Development Kit (JDK 11 or higher)
- PostgreSQL database

### Android Device Requirements
- Android 6.0 (API level 23) or higher
- Google Play Services installed
- Developer options enabled (for development builds)

## Backend Deployment

### Option 1: Local Development Server

#### 1. Database Setup
```bash
# Start PostgreSQL service
# Windows (if using PostgreSQL service)
net start postgresql-x64-14

# Or start manually if installed locally
pg_ctl -D "C:\Program Files\PostgreSQL\14\data" start

# Create database
createdb step_monsters

# Run migrations
cd backend
npm run migrate
npm run seed
```

#### 2. Environment Configuration
Create `backend/.env`:
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=step_monsters
DB_USER=postgres
DB_PASSWORD=your_password

# JWT secrets
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 3. Start Backend Server
```bash
cd backend
npm install
npm run dev
```

#### 4. Find Your Network IP
```bash
# Windows
ipconfig

# Look for your local network IP (usually 192.168.x.x or 10.0.x.x)
# Example: 192.168.1.100
```

### Option 2: Cloud Deployment (Recommended for Team Testing)

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy backend
cd backend
railway init
railway up

# Set environment variables in Railway dashboard
# Get the deployed URL (e.g., https://your-app.railway.app)
```

#### Alternative: Heroku, DigitalOcean, or AWS
- Follow similar process for your preferred cloud provider
- Ensure PostgreSQL database is configured
- Set all environment variables
- Note the deployed API URL

## Mobile App Configuration

### 1. Update API Configuration
Edit `src/services/apiClient.ts`:

```typescript
class ApiClient {
  private client: AxiosInstance;
  // For local testing - replace with your computer's IP
  private readonly baseURL = 'http://192.168.1.100:3000/api';
  
  // For cloud deployment
  // private readonly baseURL = 'https://your-app.railway.app/api';
```

### 2. Google Fit Configuration
Ensure `android/app/src/main/AndroidManifest.xml` has:
```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="com.google.android.gms.permission.ACTIVITY_RECOGNITION" />
```

## Development Build Deployment

### 1. Connect Android Device
```bash
# Enable Developer Options on your Android device:
# Settings > About Phone > Tap "Build Number" 7 times
# Settings > Developer Options > Enable "USB Debugging"

# Connect device via USB and verify
adb devices
```

### 2. Build and Install
```bash
# Install dependencies
npm install

# For first-time setup
npx react-native doctor

# Build and install on connected device
npx react-native run-android

# Or build release version for testing
npx react-native run-android --variant=release
```

## Production APK Build

### 1. Generate Signing Key
```bash
# Navigate to android/app directory
cd android/app

# Generate keystore (do this once)
keytool -genkeypair -v -storetype PKCS12 -keystore step-monsters-release-key.keystore -alias step-monsters-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Remember the passwords you set!
```

### 2. Configure Gradle
Edit `android/gradle.properties`:
```properties
STEP_MONSTERS_UPLOAD_STORE_FILE=step-monsters-release-key.keystore
STEP_MONSTERS_UPLOAD_KEY_ALIAS=step-monsters-key-alias
STEP_MONSTERS_UPLOAD_STORE_PASSWORD=your_keystore_password
STEP_MONSTERS_UPLOAD_KEY_PASSWORD=your_key_password
```

Edit `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('STEP_MONSTERS_UPLOAD_STORE_FILE')) {
                storeFile file(STEP_MONSTERS_UPLOAD_STORE_FILE)
                storePassword STEP_MONSTERS_UPLOAD_STORE_PASSWORD
                keyAlias STEP_MONSTERS_UPLOAD_KEY_ALIAS
                keyPassword STEP_MONSTERS_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
        }
    }
}
```

### 3. Build Release APK
```bash
# Clean previous builds
cd android
./gradlew clean

# Build release APK
./gradlew assembleRelease

# APK will be generated at:
# android/app/build/outputs/apk/release/app-release.apk
```

## Distribution Methods

### Method 1: Direct APK Installation
```bash
# Install APK on connected device
adb install android/app/build/outputs/apk/release/app-release.apk

# Or copy APK to device and install manually
# (Enable "Install from Unknown Sources" in device settings)
```

### Method 2: Firebase App Distribution
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Upload APK to Firebase App Distribution
firebase appdistribution:distribute android/app/build/outputs/apk/release/app-release.apk \
  --app your-firebase-app-id \
  --groups testers \
  --release-notes "Core features testing build"
```

### Method 3: Google Play Console (Internal Testing)
1. Create Google Play Console account
2. Create new app
3. Upload APK to Internal Testing track
4. Add testers via email addresses
5. Share testing link with testers

## Testing Device Setup

### For Testers Receiving APK

#### 1. Enable Unknown Sources
- Android 8.0+: Settings > Apps > Special Access > Install Unknown Apps > Enable for your file manager
- Android 7.0 and below: Settings > Security > Unknown Sources

#### 2. Install APK
- Download APK file
- Tap to install
- Grant permissions when prompted

#### 3. Google Fit Setup
- Ensure Google Fit app is installed and set up
- Grant Step Monsters permission to access fitness data
- Walk a few steps to verify step tracking works

### Required Permissions
The app will request:
- **Physical Activity**: For step counting
- **Internet**: For syncing data
- **Network State**: For checking connectivity

## Network Configuration

### Local Development Testing
```bash
# Ensure firewall allows connections on port 3000
# Windows Firewall: Add inbound rule for port 3000

# Test API connectivity from mobile browser
# Visit: http://YOUR_IP:3000/health
# Should return: {"status":"OK","timestamp":"...","uptime":...}
```

### Troubleshooting Network Issues
```bash
# Check if backend is accessible
curl http://YOUR_IP:3000/health

# Test from mobile device browser
# If this fails, check:
# 1. Firewall settings
# 2. Network connectivity
# 3. IP address correctness
```

## Environment-Specific Builds

### Development Build
```bash
# Fast builds, debugging enabled
npx react-native run-android
```

### Staging Build
```bash
# Production-like but with staging API
npx react-native run-android --variant=stagingRelease
```

### Production Build
```bash
# Optimized, signed APK
cd android && ./gradlew assembleRelease
```

## Deployment Checklist

### Pre-Deployment
- [ ] Backend server is running and accessible
- [ ] Database migrations completed
- [ ] API endpoints tested
- [ ] Google Fit permissions configured
- [ ] Network connectivity verified

### Build Process
- [ ] Dependencies installed
- [ ] API URLs updated for target environment
- [ ] Signing keys configured (for release builds)
- [ ] Build completed without errors
- [ ] APK size is reasonable (< 50MB)

### Post-Deployment
- [ ] App installs successfully
- [ ] Permissions granted correctly
- [ ] Step tracking works
- [ ] API connectivity confirmed
- [ ] Core features functional

## Monitoring & Debugging

### Log Collection
```bash
# View device logs
adb logcat | grep StepMonsters

# Filter React Native logs
adb logcat | grep ReactNativeJS
```

### Performance Monitoring
- Monitor battery usage in device settings
- Check memory usage during extended testing
- Verify step counting accuracy against device pedometer

### Common Issues & Solutions

#### "Network Request Failed"
- Check API URL in apiClient.ts
- Verify backend server is running
- Test network connectivity

#### "Google Fit Permission Denied"
- Ensure Google Play Services installed
- Check app permissions in device settings
- Reinstall Google Fit if necessary

#### APK Installation Failed
- Enable "Install from Unknown Sources"
- Check available storage space
- Verify APK is not corrupted

## Security Considerations

### Development Builds
- Use HTTPS for production APIs
- Don't commit sensitive keys to version control
- Use environment-specific configurations

### Production Builds
- Enable ProGuard/R8 code obfuscation
- Use certificate pinning for API calls
- Implement proper authentication token handling

## Scaling for Team Testing

### Multiple Testers
1. Use Firebase App Distribution or TestFlight
2. Create tester groups (internal, beta, etc.)
3. Automate build distribution with CI/CD
4. Collect feedback through integrated tools

### Continuous Deployment
```yaml
# Example GitHub Actions workflow
name: Build and Distribute
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build APK
        run: |
          cd android
          ./gradlew assembleRelease
      - name: Distribute to Firebase
        run: |
          firebase appdistribution:distribute app-release.apk
```

This deployment guide should get your Step Monsters app running on real devices for comprehensive testing. Start with the development build approach for quick iteration, then move to signed APKs for broader testing.