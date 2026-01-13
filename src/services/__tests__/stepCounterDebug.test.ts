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

describe('StepCounterService Debug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should debug permission request', async () => {
    const { PermissionsAndroid } = require('react-native');
    
    console.log('PERMISSIONS constant:', PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
    console.log('RESULTS constant:', PermissionsAndroid.RESULTS.GRANTED);
    
    const mockResult = {
      [PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION]: PermissionsAndroid.RESULTS.GRANTED,
    };
    
    console.log('Mock result:', mockResult);
    
    PermissionsAndroid.requestMultiple.mockResolvedValue(mockResult);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    try {
      const result = await stepCounterService.requestPermission();
      console.log('Permission result:', result);
      
      // Check what was actually called
      console.log('requestMultiple called with:', PermissionsAndroid.requestMultiple.mock.calls);
      console.log('setItem called with:', mockAsyncStorage.setItem.mock.calls);

      expect(result).toBe(true);
    } catch (error) {
      console.error('Error during permission request:', error);
      throw error;
    }
  });
});