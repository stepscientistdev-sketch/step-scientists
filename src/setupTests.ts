// Setup file for Jest tests
import 'react-native-gesture-handler/jestSetup';

// Mock react-native modules
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => 
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

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

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific log levels
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup global test timeout
jest.setTimeout(10000);