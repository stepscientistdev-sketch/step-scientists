import { stepCounterService } from '../stepCounterService';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    request: jest.fn(),
    requestMultiple: jest.fn(),
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
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('StepCounterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermission', () => {
    it('should request Android permissions successfully', async () => {
      const { PermissionsAndroid } = require('react-native');
      PermissionsAndroid.requestMultiple.mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION]: PermissionsAndroid.RESULTS.GRANTED,
      });
      
      // Mock AsyncStorage.setItem to resolve successfully
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await stepCounterService.requestPermission();

      expect(result).toBe(true);
      expect(PermissionsAndroid.requestMultiple).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      const { PermissionsAndroid } = require('react-native');
      PermissionsAndroid.requestMultiple.mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION]: 'denied',
      });
      
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await stepCounterService.requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentSteps', () => {
    it('should return current step count', async () => {
      const mockStepData = {
        date: new Date().toISOString(),
        steps: 5000,
        source: 'google_fit',
        validated: false,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockStepData));

      const steps = await stepCounterService.getCurrentSteps();

      expect(typeof steps).toBe('number');
      expect(steps).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing cached data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const steps = await stepCounterService.getCurrentSteps();

      expect(typeof steps).toBe('number');
      expect(steps).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateStepData', () => {
    it('should validate normal step data successfully', () => {
      const stepData = [
        {
          date: new Date(),
          steps: 8000,
          source: 'google_fit',
          validated: false,
        },
        {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          steps: 6500,
          source: 'google_fit',
          validated: false,
        },
      ];

      const result = stepCounterService.validateStepData(stepData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect negative steps', () => {
      const stepData = [
        {
          date: new Date(),
          steps: -100,
          source: 'google_fit',
          validated: false,
        },
      ];

      const result = stepCounterService.validateStepData(stepData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('NEGATIVE_STEPS');
    });

    it('should detect excessive daily steps', () => {
      const stepData = [
        {
          date: new Date(),
          steps: 60000, // Exceeds 50,000 limit
          source: 'google_fit',
          validated: false,
        },
      ];

      const result = stepCounterService.validateStepData(stepData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('EXCESSIVE_STEPS');
    });

    it('should detect suspicious activity', () => {
      const stepData = [
        {
          date: new Date(),
          steps: 35000, // Above suspicious threshold
          source: 'google_fit',
          validated: false,
        },
      ];

      const result = stepCounterService.validateStepData(stepData);

      expect(result.isValid).toBe(true); // Still valid, just suspicious
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('SUSPICIOUS_ACTIVITY');
    });
  });

  describe('startTracking and stopTracking', () => {
    it('should start and stop tracking', () => {
      // Mock setInterval and clearInterval
      const mockSetInterval = jest.spyOn(global, 'setInterval');
      const mockClearInterval = jest.spyOn(global, 'clearInterval');

      stepCounterService.startTracking();
      expect(mockSetInterval).toHaveBeenCalled();

      stepCounterService.stopTracking();
      expect(mockClearInterval).toHaveBeenCalled();

      mockSetInterval.mockRestore();
      mockClearInterval.mockRestore();
    });
  });
});