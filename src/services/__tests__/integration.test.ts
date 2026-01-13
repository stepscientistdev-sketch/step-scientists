import AsyncStorage from '@react-native-async-storage/async-storage';
import { stepCounterService } from '../stepCounterService';
import { syncManager } from '../syncService';
import { apiClient } from '../apiClient';

// Mock all dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

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

jest.mock('../apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('Step Tracking and Sync Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should complete full step tracking and sync workflow', async () => {
    const playerId = 'test-player-123';
    
    // Step 1: Request permissions
    const permissionGranted = await stepCounterService.requestPermission();
    expect(permissionGranted).toBe(true);

    // Step 2: Start step tracking
    const mockSetInterval = jest.spyOn(global, 'setInterval');
    stepCounterService.startTracking();
    expect(mockSetInterval).toHaveBeenCalled();

    // Step 3: Simulate step data accumulation
    const mockStepData = {
      date: new Date().toISOString(),
      steps: 5000,
      source: 'google_fit',
      validated: false,
    };

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key.includes('step_data')) {
        return Promise.resolve(JSON.stringify(mockStepData));
      }
      if (key.includes('offline_step_queue')) {
        return Promise.resolve(JSON.stringify([
          {
            date: new Date(),
            steps: 5000,
            timestamp: new Date(),
            synced: false,
          },
        ]));
      }
      if (key.includes('sync_operation_queue')) {
        return Promise.resolve(JSON.stringify([
          {
            id: 'step-update-1',
            type: 'step_update',
            data: { steps: 5000 },
            timestamp: new Date(),
            playerId,
          },
        ]));
      }
      if (key.includes('last_successful_sync')) {
        return Promise.resolve(new Date().toISOString());
      }
      return Promise.resolve(null);
    });

    // Step 4: Get current steps
    const currentSteps = await stepCounterService.getCurrentSteps();
    expect(currentSteps).toBe(5000);

    // Step 5: Get step history
    const stepHistory = await stepCounterService.getStepHistory(7);
    expect(stepHistory).toHaveLength(7);
    expect(stepHistory[0]).toHaveProperty('steps');

    // Step 6: Validate step data
    const validationResult = stepCounterService.validateStepData(stepHistory);
    expect(validationResult.isValid).toBe(true);

    // Step 7: Queue some operations
    await syncManager.queueOperation({
      id: 'test-op-1',
      type: 'step_update',
      data: { steps: 5000 },
      timestamp: new Date(),
      playerId,
    });

    // Step 8: Process operation queue
    const queueResults = await syncManager.processQueue();
    expect(queueResults).toHaveLength(1);
    expect(queueResults[0].success).toBe(true);

    // Step 9: Mock successful server sync
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        syncedDays: 1,
        conflicts: [],
      },
    });

    // Step 10: Sync player data
    const syncResult = await syncManager.syncPlayerData(playerId);
    expect(syncResult.success).toBe(true);
    expect(syncResult.syncedDays).toBe(1);
    expect(syncResult.errors).toHaveLength(0);

    // Step 11: Verify API was called with correct data
    expect(apiClient.post).toHaveBeenCalledWith('/sync/player-data', expect.objectContaining({
      playerId,
      stepData: expect.any(Object),
      operations: expect.any(Array),
      lastSync: expect.any(Date),
    }));

    // Step 12: Stop tracking
    stepCounterService.stopTracking();
    const mockClearInterval = jest.spyOn(global, 'clearInterval');
    expect(mockClearInterval).toHaveBeenCalled();

    mockSetInterval.mockRestore();
    mockClearInterval.mockRestore();
  });

  it('should handle conflict resolution during sync', async () => {
    const playerId = 'test-player-456';
    
    // Mock server response with conflicts
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        success: false,
        syncedDays: 0,
        conflicts: [
          {
            field: 'stepCount',
            localValue: 8000,
            serverValue: 7500,
            lastSyncTimestamp: new Date(),
            conflictTimestamp: new Date(),
          },
        ],
        errors: ['Conflicts detected that require manual resolution'],
      },
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key.includes('sync_operation_queue')) {
        return Promise.resolve('[]');
      }
      if (key.includes('last_successful_sync')) {
        return Promise.resolve(new Date().toISOString());
      }
      return Promise.resolve(null);
    });

    // Attempt sync with conflicts
    const syncResult = await syncManager.syncPlayerData(playerId);
    expect(syncResult.success).toBe(false);
    expect(syncResult.errors).toContain('Conflicts detected that require manual resolution');

    // Resolve the conflict
    const conflict = {
      field: 'stepCount',
      localValue: 8000,
      serverValue: 7500,
      lastSyncTimestamp: new Date(),
      conflictTimestamp: new Date(),
    };

    const resolution = await syncManager.resolveConflict(conflict);
    expect(resolution.strategy).toBeDefined();
    expect(resolution.resolvedValue).toBeDefined();
  });

  it('should handle offline scenario with validation', async () => {
    const playerId = 'test-player-789';
    
    // Simulate offline data that exceeds limits
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key.includes('sync_operation_queue')) {
        return Promise.resolve('[]');
      }
      if (key.includes('player_stepData')) {
        return Promise.resolve(JSON.stringify({
          totalSteps: 10000,
          dailySteps: 5000,
          lastUpdated: new Date(),
          source: 'google_fit',
          validated: false,
        }));
      }
      if (key.includes('last_successful_sync')) {
        return Promise.resolve(oldDate.toISOString());
      }
      return Promise.resolve(null);
    });

    // Attempt sync with old data
    const syncResult = await syncManager.syncPlayerData(playerId);
    expect(syncResult.success).toBe(false);
    expect(syncResult.errors).toContain('Data is older than 7-day limit');
  });

  it('should handle network failures gracefully', async () => {
    const playerId = 'test-player-network-fail';
    
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key.includes('sync_operation_queue')) {
        return Promise.resolve('[]');
      }
      if (key.includes('last_successful_sync')) {
        return Promise.resolve(new Date().toISOString());
      }
      return Promise.resolve(null);
    });

    // Mock network failure
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network timeout'));

    const syncResult = await syncManager.syncPlayerData(playerId);
    expect(syncResult.success).toBe(false);
    expect(syncResult.errors).toContain('Network error during sync');
  });

  it('should validate step data with various scenarios', async () => {
    // Test normal data
    const normalData = [
      {
        date: new Date(),
        steps: 8000,
        source: 'google_fit',
        validated: false,
      },
    ];
    
    let result = stepCounterService.validateStepData(normalData);
    expect(result.isValid).toBe(true);

    // Test excessive steps
    const excessiveData = [
      {
        date: new Date(),
        steps: 60000,
        source: 'google_fit',
        validated: false,
      },
    ];
    
    result = stepCounterService.validateStepData(excessiveData);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].type).toBe('EXCESSIVE_STEPS');

    // Test negative steps
    const negativeData = [
      {
        date: new Date(),
        steps: -100,
        source: 'google_fit',
        validated: false,
      },
    ];
    
    result = stepCounterService.validateStepData(negativeData);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].type).toBe('NEGATIVE_STEPS');

    // Test suspicious activity (warning, not error)
    const suspiciousData = [
      {
        date: new Date(),
        steps: 35000,
        source: 'google_fit',
        validated: false,
      },
    ];
    
    result = stepCounterService.validateStepData(suspiciousData);
    expect(result.isValid).toBe(true);
    expect(result.warnings[0].type).toBe('SUSPICIOUS_ACTIVITY');
  });
});