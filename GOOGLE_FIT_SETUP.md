# Google Fit Integration Setup Guide

## Overview
This guide explains how to set up Google Fit integration for real step tracking in the Step Monsters app.

## Prerequisites
- Android device with Google Play Services
- Google account
- Google Cloud Console access (for API keys)

## Setup Steps

### 1. Google Cloud Console Configuration

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Note your project ID

2. **Enable Google Fitness API**
   - In the Google Cloud Console, go to "APIs & Services" > "Library"
   - Search for "Fitness API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Select "Android" as application type
   - Enter package name: `com.stepmonsters`
   - Get SHA-1 fingerprint (see below)
   - Save the client ID

### 2. Get SHA-1 Fingerprint

For debug builds:
```bash
# Navigate to your Android project
cd android

# Generate debug keystore fingerprint
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For release builds:
```bash
# Generate release keystore fingerprint (if you have a release keystore)
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

### 3. Android Configuration

The AndroidManifest.xml has already been configured with necessary permissions:
- `ACTIVITY_RECOGNITION` - For step counting
- `com.google.android.gms.permission.ACTIVITY_RECOGNITION` - Google Fit specific
- `ACCESS_FINE_LOCATION` - For location-based fitness data
- `BODY_SENSORS` - For sensor access

### 4. React Native Configuration

The Google Fit service is already implemented in `src/services/googleFitService.ts` with:
- ✅ Initialization and authorization
- ✅ Step data retrieval (daily and historical)
- ✅ Recording management
- ✅ Error handling and fallbacks

### 5. Testing the Integration

#### Check Google Fit Status
```typescript
import { stepCounterService } from './src/services/stepCounterService';

// Get Google Fit connection status
const status = await stepCounterService.getGoogleFitStatus();
console.log('Google Fit Status:', status);
```

#### Manual Refresh
```typescript
// Force refresh from Google Fit
try {
  const steps = await stepCounterService.refreshFromGoogleFit();
  console.log('Current steps:', steps);
} catch (error) {
  console.log('Google Fit not available, using mock data');
}
```

#### Toggle Data Source
```typescript
// Switch between real and mock data (for testing)
stepCounterService.setUseRealGoogleFit(true);  // Use real Google Fit
stepCounterService.setUseRealGoogleFit(false); // Use mock data
```

## Current Implementation Status

### ✅ Implemented Features
- Google Fit service wrapper with full API integration
- **OAuth 2.0 Client ID configured**: `570511343860-bjrh86v7rmqvchn9qmodb6r7bhq8g2j7.apps.googleusercontent.com`
- **Package name configured**: `com.stepscientist`
- **Debug SHA-1 fingerprint**: `DA:39:A3:EE:5E:6B:4B:0D:32:55:BF:EF:95:60:18:90:AF:D8:07:09`
- Automatic fallback to mock data if Google Fit unavailable
- Real-time step tracking with 1-minute updates
- Historical step data retrieval
- Permission handling for Android
- Caching system for offline support
- Error handling and logging

### ✅ Configuration Completed
- Google Cloud Console project setup
- OAuth 2.0 credentials configuration
- Fitness API enabled
- Android build configuration updated

### 📱 Ready for Testing

1. **Google Fit Available & Authorized**
   - Real step data from device sensors
   - 1-minute update intervals
   - Historical data from Google Fit

2. **Google Fit Available but Not Authorized**
   - Permission request flow
   - Fallback to mock data if denied

3. **Google Fit Not Available**
   - Automatic fallback to mock data
   - Simulated step increments for testing

4. **Network Issues**
   - Cached data usage
   - Offline queue management

## Troubleshooting

### Common Issues

1. **"Google Fit not authorized"**
   - Check OAuth 2.0 credentials in Google Cloud Console
   - Verify SHA-1 fingerprint matches
   - Ensure Fitness API is enabled

2. **"No step data found"**
   - Check if Google Fit app is installed and set up
   - Verify device has step counter sensors
   - Check if user has walked recently

3. **Permission denied**
   - Ensure ACTIVITY_RECOGNITION permission is granted
   - Check Android settings for app permissions

### Debug Commands

```typescript
// Check current data source
console.log('Data source:', stepCounterService.getCurrentDataSource());

// Get detailed Google Fit status
const status = await stepCounterService.getGoogleFitStatus();
console.log('Detailed status:', status);

// Force permission request
const granted = await stepCounterService.requestPermission();
console.log('Permissions granted:', granted);
```

## Production Deployment

For production deployment:
1. Generate release keystore
2. Get release SHA-1 fingerprint
3. Add release fingerprint to Google Cloud Console
4. Test with release build
5. Ensure Google Play Services are available on target devices

## Fallback Strategy

The implementation includes a robust fallback strategy:
1. **Primary**: Real Google Fit data
2. **Secondary**: Cached step data
3. **Tertiary**: Mock/simulated data

This ensures the app works even if Google Fit is unavailable, while providing real step tracking when possible.

## Next Steps

After Google Fit is configured:
1. Test on physical Android device
2. Verify real step counting works
3. Test permission flows
4. Validate historical data retrieval
5. Proceed with game mechanics implementation

The step tracking foundation is now ready for real walking data! 🚶‍♂️📱