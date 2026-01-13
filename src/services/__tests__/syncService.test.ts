import { syncManager } from '../syncService';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock API client
const mockApiClient = {
  post: jest.fn(),
};

jest.mock('../apiClient', () => ({
  apiClient: mockApiClient,
}));

describe('SyncManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateOfflineData', () => {
    it('should validate normal offline data', () => {
      const offlineData = {
        playerId: 'test-player-id',
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

      const result = syncManager.validateOfflineData(offlineData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect negative steps', () => {
      const offlineData = {
        playerId: 'test-player-id',
        stepData: {
          totalSteps: -1000,
          dailySteps: 5000,
          lastUpdated: new Date(),
          source: 'google_fit',
          validated: false,
        },
        operations: [],
        lastSync: new Date(),
      };

      const result = syncManager.validateOfflineData(offlineData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('NEGATIVE_STEPS');
    });

    it('should detect offline limit exceeded', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const offlineData = {
        playerId: 'test-player-id',
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

    it('should warn about suspicious daily steps', () => {
      const offlineData = {
        playerId: 'test-player-id',
        stepData: {
          totalSteps: 60000,
          dailySteps: 60000, // Very high daily steps
          lastUpdated: new Date(),
          source: 'google_fit',
          validated: false,
        },
        operations: [],
        lastSync: new Date(),
      };

      const result = syncManager.validateOfflineData(offlineData);

      expect(result.isValid).toBe(true); // Still valid, just suspicious
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('SUSPICIOUS_ACTIVITY');
    });
  });

  describe('resolveConflict', () => {
    it('should resolve step count conflict with client wins strategy', async () => {
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
      expect(resolution.timestamp).toBeInstanceOf(Date);
    });

    it('should resolve resource conflict with merge strategy', async () => {
      const conflict = {
        field: 'resources',
        localValue: { cells: 100, experiencePoints: 500 },
        serverValue: { cells: 80, experiencePoints: 600 },
        lastSyncTimestamp: new Date(),
        conflictTimestamp: new Date(),
      };

      const resolution = await syncManager.resolveConflict(conflict);

      expect(resolution.strategy).toBeDefined();
      expect(resolution.resolvedValue).toBeDefined();
      if (resolution.resolvedValue.cells !== undefined) {
        expect(resolution.resolvedValue.cells).toBe(100); // Higher value
      }
      if (resolution.resolvedValue.experiencePoints !== undefined) {
        expect(resolution.resolvedValue.experiencePoints).toBe(600); // Higher value
      }
    });
  });

  describe('queueOperation', () => {
    it('should queue sync operations', async () => {
      const operation = {
        id: 'test-op-1',
        type: 'step_update' as const,
        data: { steps: 1000 },
        timestamp: new Date(),
        playerId: 'test-player-id',
      };

      mockAsyncStorage.getItem.mockResolvedValue('[]');
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      await syncManager.queueOperation(operation);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'sync_operation_queue',
        expect.stringContaining(operation.id)
      );
    });
  });
});