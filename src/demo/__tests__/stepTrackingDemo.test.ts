import { runStepTrackingDemo } from '../stepTrackingDemo';

// Mock React Native modules for the demo
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    request: jest.fn(),
    requestMultiple: jest.fn().mockResolvedValue({
      'android.permission.ACTIVITY_RECOGNITION': 'granted',
    }),
    PERMISSIONS: {
      ACTIVITY_RECOGNITION: 'android.permission.ACTIVITY_RECOGNITION',
    },
    RESULTS: {
      GRANTED: 'granted',
    },
  },
  NativeModules: {},
}));

// Mock AsyncStorage
const mockStorage: { [key: string]: string } = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
}));

describe('Step Tracking Demo', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    jest.clearAllMocks();
  });

  it('should run the complete step tracking demo successfully', async () => {
    // Capture console output
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      await runStepTrackingDemo();

      // Verify demo completed successfully
      const demoOutput = consoleLogs.join('\n');
      expect(demoOutput).toContain('Step Tracking and Sync Demo');
      expect(demoOutput).toContain('Demo completed successfully');
      
      // Verify key functionality was tested
      expect(demoOutput).toContain('Testing Step Data Validation');
      expect(demoOutput).toContain('Testing Conflict Resolution');
      expect(demoOutput).toContain('Testing Offline Data Validation');
      expect(demoOutput).toContain('Testing Operation Queuing');
      expect(demoOutput).toContain('Testing Step History Generation');
      expect(demoOutput).toContain('Testing Suspicious Activity Detection');

      // Verify validation results
      expect(demoOutput).toContain('Valid step data: true');
      expect(demoOutput).toContain('Invalid step data: false');
      expect(demoOutput).toContain('Valid offline data: true');
      expect(demoOutput).toContain('Old offline data: false');

      // Verify conflict resolution
      expect(demoOutput).toContain('Step count conflict resolved');
      expect(demoOutput).toContain('Resource conflict resolved');

      // Verify operation processing
      expect(demoOutput).toContain('Operation queued successfully');
      expect(demoOutput).toContain('Queue processed');

      // Verify step history generation
      expect(demoOutput).toContain('Generated step history for 7 days');

      // Verify suspicious activity detection
      expect(demoOutput).toContain('Suspicious activity detected');

    } finally {
      // Restore console.log
      console.log = originalLog;
    }
  }, 10000); // 10 second timeout for the demo

  it('should handle validation errors correctly', async () => {
    // This test specifically focuses on validation functionality
    const { stepCounterService } = await import('../stepTrackingDemo');

    // Test negative steps validation
    const negativeStepData = [
      { date: new Date(), steps: -500, source: 'google_fit', validated: false },
    ];

    const result = stepCounterService.validateStepData(negativeStepData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('NEGATIVE_STEPS');
  });

  it('should handle conflict resolution correctly', async () => {
    const { syncManager } = await import('../stepTrackingDemo');

    // Test step count conflict resolution
    const conflict = {
      field: 'stepCount',
      localValue: 9000,
      serverValue: 8500,
      lastSyncTimestamp: new Date(),
      conflictTimestamp: new Date(),
    };

    const resolution = await syncManager.resolveConflict(conflict);
    expect(resolution.strategy).toBeDefined();
    expect(resolution.resolvedValue).toBeDefined();
    expect(resolution.timestamp).toBeInstanceOf(Date);
  });

  it('should validate offline data limits correctly', async () => {
    const { syncManager } = await import('../stepTrackingDemo');

    // Test 7-day offline limit
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8); // 8 days ago

    const offlineData = {
      playerId: 'test-player',
      stepData: {
        totalSteps: 10000,
        dailySteps: 5000,
        lastUpdated: new Date(),
        source: 'google_fit',
        validated: true,
      },
      operations: [],
      lastSync: oldDate,
    };

    const result = syncManager.validateOfflineData(offlineData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('OFFLINE_LIMIT_EXCEEDED');
  });
});