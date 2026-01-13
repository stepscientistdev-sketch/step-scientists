import { googleFitService } from '../googleFitService';

// Mock react-native-google-fit
jest.mock('react-native-google-fit', () => ({
  checkIsAuthorized: jest.fn(),
  initializeIfNeeded: jest.fn(),
  authorize: jest.fn(),
  getDailyStepCountSamples: jest.fn(),
  startRecording: jest.fn(),
  isAuthorized: false,
  Scopes: {
    FITNESS_ACTIVITY_READ: 'https://www.googleapis.com/auth/fitness.activity.read',
    FITNESS_ACTIVITY_WRITE: 'https://www.googleapis.com/auth/fitness.activity.write',
    FITNESS_BODY_READ: 'https://www.googleapis.com/auth/fitness.body.read',
    FITNESS_BODY_WRITE: 'https://www.googleapis.com/auth/fitness.body.write',
  },
}));

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

describe('GoogleFitService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize Google Fit on Android', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.checkIsAuthorized.mockResolvedValue(undefined);
      GoogleFit.initializeIfNeeded.mockResolvedValue(true);

      const result = await googleFitService.initialize();

      expect(result).toBe(true);
      expect(GoogleFit.initializeIfNeeded).toHaveBeenCalled();
    });

    it('should return false on iOS', async () => {
      // Temporarily change platform
      const originalPlatform = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'ios';

      const result = await googleFitService.initialize();

      expect(result).toBe(false);

      // Restore platform
      require('react-native').Platform.OS = originalPlatform;
    });

    it('should handle initialization errors', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.initializeIfNeeded.mockRejectedValue(new Error('Init failed'));

      const result = await googleFitService.initialize();

      expect(result).toBe(false);
    });
  });

  describe('authorize', () => {
    it('should authorize Google Fit successfully', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.checkIsAuthorized.mockResolvedValue(undefined);
      GoogleFit.initializeIfNeeded.mockResolvedValue(true);
      GoogleFit.authorize.mockResolvedValue({ success: true });

      await googleFitService.initialize();
      const result = await googleFitService.authorize();

      expect(result).toBe(true);
      expect(GoogleFit.authorize).toHaveBeenCalled();
    });

    it('should handle authorization failure', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.checkIsAuthorized.mockResolvedValue(undefined);
      GoogleFit.initializeIfNeeded.mockResolvedValue(true);
      GoogleFit.authorize.mockResolvedValue({ success: false, message: 'User denied' });

      await googleFitService.initialize();
      const result = await googleFitService.authorize();

      expect(result).toBe(false);
    });
  });

  describe('getStepsToday', () => {
    it('should get today\'s steps', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.checkIsAuthorized.mockResolvedValue(undefined);
      GoogleFit.initializeIfNeeded.mockResolvedValue(true);
      GoogleFit.isAuthorized = true;
      GoogleFit.getDailyStepCountSamples.mockResolvedValue([
        { steps: 5000, startDate: new Date().toISOString() },
        { steps: 3000, startDate: new Date().toISOString() },
      ]);

      await googleFitService.initialize();
      const steps = await googleFitService.getStepsToday();

      expect(steps).toBe(8000); // 5000 + 3000
      expect(GoogleFit.getDailyStepCountSamples).toHaveBeenCalled();
    });

    it('should return 0 when not authorized', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.isAuthorized = false;

      const steps = await googleFitService.getStepsToday();

      expect(steps).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.checkIsAuthorized.mockResolvedValue(undefined);
      GoogleFit.initializeIfNeeded.mockResolvedValue(true);
      GoogleFit.isAuthorized = true;
      GoogleFit.getDailyStepCountSamples.mockRejectedValue(new Error('API Error'));

      await googleFitService.initialize();
      const steps = await googleFitService.getStepsToday();

      expect(steps).toBe(0);
    });
  });

  describe('getStepsForDateRange', () => {
    it('should get steps for date range', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.checkIsAuthorized.mockResolvedValue(undefined);
      GoogleFit.initializeIfNeeded.mockResolvedValue(true);
      GoogleFit.isAuthorized = true;
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      GoogleFit.getDailyStepCountSamples.mockResolvedValue([
        { steps: 5000, startDate: today.toISOString() },
        { steps: 7000, startDate: yesterday.toISOString() },
      ]);

      await googleFitService.initialize();
      const history = await googleFitService.getStepsForDateRange(yesterday, today);

      expect(history).toHaveLength(2);
      expect(history[0].steps).toBe(7000);
      expect(history[1].steps).toBe(5000);
      expect(history[0].source).toBe('google_fit');
      expect(history[0].validated).toBe(true);
    });

    it('should return empty array when not authorized', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.isAuthorized = false;

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const history = await googleFitService.getStepsForDateRange(yesterday, today);

      expect(history).toHaveLength(0);
    });
  });

  describe('startRecording', () => {
    it('should start recording successfully', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.checkIsAuthorized.mockResolvedValue(undefined);
      GoogleFit.initializeIfNeeded.mockResolvedValue(true);
      GoogleFit.isAuthorized = true;
      GoogleFit.startRecording.mockResolvedValue(true);

      await googleFitService.initialize();
      const result = await googleFitService.startRecording();

      expect(result).toBe(true);
      expect(GoogleFit.startRecording).toHaveBeenCalled();
    });

    it('should return false when not authorized', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.isAuthorized = false;

      const result = await googleFitService.startRecording();

      expect(result).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', async () => {
      const GoogleFit = require('react-native-google-fit');
      GoogleFit.checkIsAuthorized.mockResolvedValue(undefined);
      GoogleFit.initializeIfNeeded.mockResolvedValue(true);
      GoogleFit.isAuthorized = true;

      await googleFitService.initialize();
      const status = await googleFitService.getConnectionStatus();

      expect(status.available).toBe(true);
      expect(status.initialized).toBe(true);
      expect(status.authorized).toBe(true);
    });
  });

  describe('static methods', () => {
    it('should check availability correctly', () => {
      // Import the class directly
      const { GoogleFitServiceImpl } = require('../googleFitService');
      expect(GoogleFitServiceImpl.isAvailable()).toBe(true);
    });
  });
});