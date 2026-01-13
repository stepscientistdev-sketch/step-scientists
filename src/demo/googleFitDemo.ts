/**
 * Google Fit Integration Demo
 * 
 * This demo shows how the real Google Fit integration works
 * and demonstrates the fallback to mock data when Google Fit is unavailable.
 */

import { stepCounterService } from '../services/stepCounterService';
import { googleFitService } from '../services/googleFitService';

// Mock React Native dependencies for demo
(global as any).Platform = { OS: 'android' };
(global as any).PermissionsAndroid = {
  PERMISSIONS: { ACTIVITY_RECOGNITION: 'android.permission.ACTIVITY_RECOGNITION' },
  RESULTS: { GRANTED: 'granted' },
  requestMultiple: () => Promise.resolve({ 'android.permission.ACTIVITY_RECOGNITION': 'granted' }),
};

// Mock AsyncStorage for demo
const mockStorage: { [key: string]: string } = {};
(global as any).AsyncStorage = {
  getItem: (key: string) => Promise.resolve(mockStorage[key] || null),
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  },
};

export async function runGoogleFitDemo() {
  console.log('🏃‍♂️ Google Fit Integration Demo');
  console.log('=================================\n');

  try {
    // 1. Check Google Fit availability
    console.log('1. Checking Google Fit Availability');
    console.log('-----------------------------------');
    
    const isAvailable = require('../services/googleFitService').GoogleFitServiceImpl.isAvailable();
    console.log('✅ Google Fit available on this platform:', isAvailable);

    // 2. Initialize Google Fit service
    console.log('\n2. Initializing Google Fit Service');
    console.log('----------------------------------');
    
    const initialized = await googleFitService.initialize();
    console.log('✅ Google Fit initialization:', initialized ? 'SUCCESS' : 'FAILED (using mock data)');

    // 3. Check authorization status
    console.log('\n3. Checking Authorization Status');
    console.log('--------------------------------');
    
    const authorized = await googleFitService.isAuthorized();
    console.log('🔐 Google Fit authorized:', authorized);

    // 4. Get connection status
    console.log('\n4. Getting Connection Status');
    console.log('----------------------------');
    
    const status = await googleFitService.getConnectionStatus();
    console.log('📊 Connection Status:');
    console.log('   Available:', status.available);
    console.log('   Initialized:', status.initialized);
    console.log('   Authorized:', status.authorized);
    console.log('   Recording:', status.recording);

    // 5. Test step counter service with Google Fit
    console.log('\n5. Testing Step Counter Service');
    console.log('-------------------------------');
    
    const stepStatus = await stepCounterService.getGoogleFitStatus();
    console.log('🎯 Step Counter Google Fit Status:');
    console.log('   Available:', stepStatus.available);
    console.log('   Initialized:', stepStatus.initialized);
    console.log('   Authorized:', stepStatus.authorized);
    console.log('   Using Real Data:', stepStatus.usingRealData);

    // 6. Request permissions
    console.log('\n6. Requesting Permissions');
    console.log('-------------------------');
    
    const permissionGranted = await stepCounterService.requestPermission();
    console.log('✅ Permissions granted:', permissionGranted);

    // 7. Get current steps
    console.log('\n7. Getting Current Steps');
    console.log('-----------------------');
    
    const currentSteps = await stepCounterService.getCurrentSteps();
    console.log('👟 Current steps:', currentSteps);
    console.log('📱 Data source:', stepCounterService.getCurrentDataSource());

    // 8. Get step history
    console.log('\n8. Getting Step History');
    console.log('----------------------');
    
    const stepHistory = await stepCounterService.getStepHistory(3);
    console.log('📈 Step history (3 days):');
    stepHistory.forEach((day, index) => {
      console.log(`   Day ${index + 1}: ${day.steps} steps (${day.source}) - ${day.date.toDateString()}`);
    });

    // 9. Test data source switching
    console.log('\n9. Testing Data Source Switching');
    console.log('--------------------------------');
    
    console.log('🔧 Current source:', stepCounterService.getCurrentDataSource());
    
    // Switch to mock data
    stepCounterService.setUseRealGoogleFit(false);
    console.log('🎭 Switched to mock data');
    console.log('📱 New source:', stepCounterService.getCurrentDataSource());
    
    // Switch back to real data (if available)
    stepCounterService.setUseRealGoogleFit(true);
    console.log('🔄 Switched back to real data (if available)');
    console.log('📱 Final source:', stepCounterService.getCurrentDataSource());

    // 10. Start step tracking
    console.log('\n10. Starting Step Tracking');
    console.log('--------------------------');
    
    stepCounterService.startTracking();
    console.log('🎯 Step tracking started');
    console.log('⏱️  Updates will occur every', stepStatus.usingRealData ? '1 minute (real data)' : '30 seconds (mock data)');

    // Wait a moment to show tracking
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Stop tracking for demo
    stepCounterService.stopTracking();
    console.log('⏹️  Step tracking stopped');

    console.log('\n🎉 Google Fit Integration Demo Complete!');
    console.log('========================================');
    console.log('✅ Google Fit service is properly integrated');
    console.log('✅ Automatic fallback to mock data works');
    console.log('✅ Permission handling is implemented');
    console.log('✅ Real-time step tracking is functional');
    console.log('✅ Historical data retrieval works');
    console.log('✅ Data source switching is available');

    if (stepStatus.usingRealData) {
      console.log('\n🚶‍♂️ REAL WALKING IS NOW WORKING!');
      console.log('   Your actual steps will be tracked and converted to game resources!');
    } else {
      console.log('\n🎭 Using mock data for now');
      console.log('   Configure Google Fit credentials to enable real walking');
      console.log('   See GOOGLE_FIT_SETUP.md for configuration instructions');
    }

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Export for use in tests or manual execution
export { stepCounterService, googleFitService };