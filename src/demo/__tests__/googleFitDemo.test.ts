import { runGoogleFitDemo } from '../googleFitDemo';

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

describe('Google Fit Integration Demo', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    jest.clearAllMocks();
  });

  it('should run the complete Google Fit integration demo successfully', async () => {
    // Capture console output
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(' '));
      originalLog(...args);
    };

    try {
      await runGoogleFitDemo();

      // Verify demo completed successfully
      const demoOutput = consoleLogs.join('\n');
      expect(demoOutput).toContain('Google Fit Integration Demo');
      expect(demoOutput).toContain('Google Fit Integration Demo Complete');
      
      // Verify key functionality was tested
      expect(demoOutput).toContain('Checking Google Fit Availability');
      expect(demoOutput).toContain('Initializing Google Fit Service');
      expect(demoOutput).toContain('Checking Authorization Status');
      expect(demoOutput).toContain('Getting Connection Status');
      expect(demoOutput).toContain('Testing Step Counter Service');
      expect(demoOutput).toContain('Requesting Permissions');
      expect(demoOutput).toContain('Getting Current Steps');
      expect(demoOutput).toContain('Getting Step History');
      expect(demoOutput).toContain('Testing Data Source Switching');
      expect(demoOutput).toContain('Starting Step Tracking');

      // Verify Google Fit integration results
      expect(demoOutput).toContain('Google Fit available on this platform: true');
      expect(demoOutput).toContain('Permissions granted: true');
      expect(demoOutput).toContain('Current steps:');
      expect(demoOutput).toContain('Step history (3 days):');

      // Verify data source functionality
      expect(demoOutput).toContain('Data source:');
      expect(demoOutput).toContain('Switched to mock data');
      expect(demoOutput).toContain('Switched back to real data');

      // Verify tracking functionality
      expect(demoOutput).toContain('Step tracking started');
      expect(demoOutput).toContain('Step tracking stopped');

      // Verify completion messages
      expect(demoOutput).toContain('Google Fit service is properly integrated');
      expect(demoOutput).toContain('Automatic fallback to mock data works');
      expect(demoOutput).toContain('Permission handling is implemented');
      expect(demoOutput).toContain('Real-time step tracking is functional');

    } finally {
      // Restore console.log
      console.log = originalLog;
    }
  }, 15000); // 15 second timeout for the demo

  it('should handle Google Fit service functionality correctly', async () => {
    // This test specifically focuses on Google Fit service functionality
    const { googleFitService } = await import('../googleFitDemo');

    // Test availability check
    const { GoogleFitServiceImpl } = require('../../services/googleFitService');
    expect(GoogleFitServiceImpl.isAvailable()).toBe(true);

    // Test initialization
    const initialized = await googleFitService.initialize();
    expect(typeof initialized).toBe('boolean');

    // Test connection status
    const status = await googleFitService.getConnectionStatus();
    expect(status).toHaveProperty('available');
    expect(status).toHaveProperty('initialized');
    expect(status).toHaveProperty('authorized');
    expect(status).toHaveProperty('recording');
  });

  it('should handle step counter service integration correctly', async () => {
    const { stepCounterService } = await import('../googleFitDemo');

    // Test Google Fit status
    const status = await stepCounterService.getGoogleFitStatus();
    expect(status).toHaveProperty('available');
    expect(status).toHaveProperty('usingRealData');

    // Test data source methods
    const currentSource = stepCounterService.getCurrentDataSource();
    expect(typeof currentSource).toBe('string');

    // Test data source switching
    stepCounterService.setUseRealGoogleFit(false);
    expect(stepCounterService.getCurrentDataSource()).toBe('mock');

    stepCounterService.setUseRealGoogleFit(true);
    // Should be 'mock' since Google Fit isn't actually configured in tests
    expect(['google_fit', 'mock']).toContain(stepCounterService.getCurrentDataSource());
  });
});