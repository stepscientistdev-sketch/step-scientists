# Step Scientists Mobile Build Setup

## Prerequisites Checklist

### ✅ Required Software
- [ ] **Java JDK 17** - Download from https://adoptium.net/temurin/releases/
- [ ] **Android Studio** - Download from https://developer.android.com/studio
- [ ] **Node.js** - Already installed ✅
- [ ] **React Native CLI** - Run `install-react-native-cli.bat`

### ✅ Environment Setup
- [ ] Run `setup-android-environment.bat` after installing Java/Android Studio
- [ ] Verify Java works: `java -version`
- [ ] Verify Android SDK works: `adb version`

## Build Process

### Option 1: Quick Build (Recommended)
```bash
# Run this script - it handles everything
build-android-app.bat
```

### Option 2: Manual Steps
```bash
# 1. Install dependencies
npm install

# 2. Start Metro bundler (in separate terminal)
npx react-native start

# 3. Build and run (in another terminal)
npx react-native run-android
```

## Testing Your App

### Device Requirements
- **Android device** with USB debugging enabled, OR
- **Android emulator** running from Android Studio

### What to Test
1. **App launches** successfully
2. **Google Fit authorization** works
3. **Step counting** from Google Fit
4. **Backend connection** to your Step Scientists server

## Troubleshooting

### Common Issues

#### "JAVA_HOME not set"
- Run `setup-android-environment.bat`
- Restart command prompt

#### "Android SDK not found"
- Install Android Studio
- Run `setup-android-environment.bat`
- Adjust paths in the script if needed

#### "No connected devices"
- Connect Android device with USB debugging
- OR start Android emulator from Android Studio

#### "Metro bundler not running"
- Run `npx react-native start` in separate terminal
- Wait for "Metro waiting on port 8081"

### Getting SHA-1 Fingerprint (Now that you have Java)
```bash
cd android
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## Next Steps After Build

1. **Test Google Fit integration** on real device
2. **Replace debug SHA-1** with real fingerprint in Google Cloud Console
3. **Test step counting** while walking
4. **Verify backend sync** works on mobile

## Current Configuration

- **Package Name**: `com.stepscientist`
- **OAuth Client ID**: `570511343860-bjrh86v7rmqvchn9qmodb6r7bhq8g2j7.apps.googleusercontent.com`
- **Debug SHA-1**: `DA:39:A3:EE:5E:6B:4B:0D:32:55:BF:EF:95:60:18:90:AF:D8:07:09`

Your Google Fit integration is ready to test once the app builds successfully! 🚀📱