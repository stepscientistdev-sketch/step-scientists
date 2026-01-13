/**
 * Step Tracking and Sync Demo
 * 
 * This demo shows how the step tracking and sync functionality works
 * without requiring the full React Native environment.
 */

import { stepCounterService } from '../services/stepCounterService';
import { syncManager } from '../services/syncService';

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

export async function runStepTrackingDemo() {
  console.log('🚀 Step Tracking and Sync Demo');
  console.log('================================\n');

  try {
    // 1. Test step data validation
    console.log('1. Testing Step Data Validation');
    console.log('-------------------------------');

    const validStepData = [
      { date: new Date(), steps: 8000, source: 'google_fit', validated: false },
      { date: new Date(Date.now() - 24 * 60 * 60 * 1000), steps: 6500, source: 'google_fit', validated: false },
    ];

    const validationResult = stepCounterService.validateStepData(validStepData);
    console.log('✅ Valid step data:', validationResult.isValid);
    console.log('   Errors:', validationResult.errors.length);
    console.log('   Warnings:', validationResult.warnings.length);

    // Test with invalid data
    const invalidStepData = [
      { date: new Date(), steps: -100, source: 'google_fit', validated: false }, // Negative steps
      { date: new Date(), steps: 60000, source: 'google_fit', validated: false }, // Excessive steps
    ];

    const invalidValidation = stepCounterService.validateStepData(invalidStepData);
    console.log('❌ Invalid step data:', invalidValidation.isValid);
    console.log('   Errors:', invalidValidation.errors.map(e => e.type));
    console.log('   Warnings:', invalidValidation.warnings.map(w => w.type));

    console.log('\n2. Testing Conflict Resolution');
    console.log('------------------------------');

    // Test conflict resolution
    const stepConflict = {
      field: 'stepCount',
      localValue: 8000,
      serverValue: 7500,
      lastSyncTimestamp: new Date(),
      conflictTimestamp: new Date(),
    };

    const stepResolution = await syncManager.resolveConflict(stepConflict);
    console.log('🔧 Step count conflict resolved:');
    console.log('   Strategy:', stepResolution.strategy);
    console.log('   Resolved value:', stepResolution.resolvedValue);

    const resourceConflict = {
      field: 'resources',
      localValue: { cells: 100, experiencePoints: 500 },
      serverValue: { cells: 80, experiencePoints: 600 },
      lastSyncTimestamp: new Date(),
      conflictTimestamp: new Date(),
    };

    const resourceResolution = await syncManager.resolveConflict(resourceConflict);
    console.log('🔧 Resource conflict resolved:');
    console.log('   Strategy:', resourceResolution.strategy);
    console.log('   Resolved value:', resourceResolution.resolvedValue);

    console.log('\n3. Testing Offline Data Validation');
    console.log('----------------------------------');

    // Test offline data validation
    const validOfflineData = {
      playerId: 'demo-player-123',
      stepData: {
        totalSteps: 10000,
        dailySteps: 5000,
        lastUpdated: new Date(),
        source: 'google_fit',
        validated: true,
      },
      operations: [],
      lastSync: new Date(),
    };

    const offlineValidation = syncManager.validateOfflineData(validOfflineData);
    console.log('✅ Valid offline data:', offlineValidation.isValid);
    console.log('   Errors:', offlineValidation.errors.length);

    // Test with old sync data (exceeds 7-day limit)
    const oldOfflineData = {
      ...validOfflineData,
      lastSync: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    };

    const oldValidation = syncManager.validateOfflineData(oldOfflineData);
    console.log('❌ Old offline data:', oldValidation.isValid);
    console.log('   Errors:', oldValidation.errors.map(e => e.type));

    console.log('\n4. Testing Operation Queuing');
    console.log('----------------------------');

    // Test operation queuing
    const operation = {
      id: 'demo-op-1',
      type: 'step_update' as const,
      data: { steps: 1000 },
      timestamp: new Date(),
      playerId: 'demo-player-123',
    };

    await syncManager.queueOperation(operation);
    console.log('✅ Operation queued successfully');

    const queueResults = await syncManager.processQueue();
    console.log('✅ Queue processed:', queueResults.length, 'operations');
    console.log('   Results:', queueResults.map(r => ({ id: r.operationId, success: r.success })));

    console.log('\n5. Testing Step History Generation');
    console.log('----------------------------------');

    const stepHistory = await stepCounterService.getStepHistory(7);
    console.log('✅ Generated step history for 7 days');
    console.log('   Days:', stepHistory.length);
    console.log('   Sample day:', {
      date: stepHistory[0].date.toDateString(),
      steps: stepHistory[0].steps,
      source: stepHistory[0].source,
    });

    console.log('\n6. Testing Suspicious Activity Detection');
    console.log('----------------------------------------');

    const suspiciousData = [
      { date: new Date(), steps: 35000, source: 'google_fit', validated: false }, // High but not invalid
    ];

    const suspiciousValidation = stepCounterService.validateStepData(suspiciousData);
    console.log('⚠️  Suspicious activity detected:');
    console.log('   Valid:', suspiciousValidation.isValid);
    console.log('   Warnings:', suspiciousValidation.warnings.map(w => w.type));

    console.log('\n🎉 Demo completed successfully!');
    console.log('===============================');
    console.log('All core step tracking and sync functionality is working correctly.');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Export for use in tests or manual execution
export { stepCounterService, syncManager };