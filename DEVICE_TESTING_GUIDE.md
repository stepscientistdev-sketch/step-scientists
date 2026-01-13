# Device Testing Guide

## Prerequisites
- Android device or emulator
- React Native development environment set up
- USB debugging enabled (for physical device)

## Quick Test Setup

### 1. Install Dependencies
```bash
npm install
cd ios && pod install && cd .. # If testing on iOS
```

### 2. Start Metro Bundler
```bash
npm start
```

### 3. Run on Device
```bash
# Android
npm run android

# iOS (if configured)
npm run ios
```

## What to Test

### ✅ Basic Functionality Tests

1. **App Launch**
   - App opens without crashes
   - Initial screen loads (Auth screen)
   - No immediate JavaScript errors

2. **Permission Flow**
   - Navigate to Home screen
   - Trigger step counter permission request
   - Verify permission dialog appears
   - Test both grant/deny scenarios

3. **Step Counter Service**
   - Open developer menu (shake device or Cmd+D)
   - Check console logs for step counter initialization
   - Verify AsyncStorage operations work

4. **Redux Integration**
   - Use React Native Debugger or Flipper
   - Verify Redux store initializes
   - Check step counter slice state updates

### 🧪 Manual Testing Steps

1. **Launch App**
   ```
   Expected: Auth screen appears with login/register options
   ```

2. **Navigate to Home**
   ```
   Expected: Home screen loads, step counter initializes
   ```

3. **Trigger Permission Request**
   ```
   Expected: Android permission dialog for ACTIVITY_RECOGNITION
   ```

4. **Check Step Data**
   ```
   Expected: Mock step data appears (since no real Google Fit yet)
   ```

5. **Test Validation**
   ```
   Expected: Step validation logic works with mock data
   ```

## Debugging Tools

### React Native Debugger
```bash
# Install if not already installed
npm install -g react-native-debugger

# Open debugger
react-native-debugger
```

### Flipper (Recommended)
- Install Flipper desktop app
- Enable React Native plugin
- View Redux state, AsyncStorage, and network requests

### Console Logging
Add temporary logs to see what's working:
```typescript
console.log('Step counter initialized:', stepCounterService);
console.log('Permission granted:', permissionResult);
console.log('Step data:', stepData);
```

## Expected Results

### ✅ Should Work
- App launches successfully
- Basic navigation works
- Permission requests appear
- AsyncStorage operations succeed
- Redux state management works
- Mock step data generation works
- Validation logic executes correctly

### ❌ Expected Limitations
- No real step data (Google Fit not integrated)
- No backend sync (server not running)
- Limited game functionality (species/steplings not implemented)
- Mock data only for step history

## Troubleshooting

### Common Issues
1. **Metro bundler errors**: Clear cache with `npx react-native start --reset-cache`
2. **Permission errors**: Check Android manifest has ACTIVITY_RECOGNITION permission
3. **AsyncStorage errors**: Verify @react-native-async-storage/async-storage is properly linked
4. **Redux errors**: Check store configuration and slice imports

### Useful Commands
```bash
# Clear all caches
npx react-native start --reset-cache
rm -rf node_modules && npm install

# Check device connection
adb devices

# View device logs
npx react-native log-android
npx react-native log-ios
```

## Next Steps After Device Testing

If basic device testing works well, the next logical steps would be:

1. **Add Real Google Fit Integration**
   - Install react-native-google-fit
   - Configure Google Fit API credentials
   - Replace mock implementations

2. **Set Up Backend**
   - Configure PostgreSQL database
   - Run database migrations
   - Start backend server

3. **Test Full Sync Flow**
   - Real step data → validation → sync → conflict resolution

## Is It Worth It Right Now?

**Yes, but with limited scope:**
- Good for catching basic integration issues
- Validates React Native setup is working
- Tests permission flow and AsyncStorage
- Verifies Redux integration
- Helps identify any obvious bugs in the app structure

**Not worth it if:**
- You want to test actual step counting (need Google Fit integration first)
- You want to test sync functionality (need backend running first)
- You're looking for full game experience (need more features implemented)

The sweet spot is testing the **foundation** to make sure everything builds and runs correctly before adding the more complex integrations.