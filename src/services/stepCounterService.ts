import {Platform, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleFitService } from './googleFitService';
import { googleFitWebService } from './googleFitWebService';
import { 
  OfflineStepData, 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  SyncResult 
} from '../types';

export interface StepCounterService {
  getCurrentSteps(): Promise<number>;
  getStepHistory(days: number): Promise<StepHistoryData[]>;
  startTracking(): void;
  stopTracking(): void;
  requestPermission(): Promise<boolean>;
  validateStepData(stepData: StepHistoryData[]): ValidationResult;
  syncStepData(): Promise<SyncResult>;
  getOfflineStepData(): Promise<OfflineStepData[]>;
}

export interface StepHistoryData {
  date: Date;
  steps: number;
  source?: string; // 'google_fit', 'samsung_health', 'manual'
  validated?: boolean;
}

// Constants for validation and limits
const VALIDATION_CONSTANTS = {
  MAX_DAILY_STEPS: 50000,
  SUSPICIOUS_THRESHOLD: 30000,
  MAX_OFFLINE_DAYS: 7,
  MIN_STEPS_PER_MINUTE: 0,
  MAX_STEPS_PER_MINUTE: 200,
  SYNC_INTERVAL: 300000, // 5 minutes
};

const STORAGE_KEYS = {
  STEP_DATA: 'step_data',
  OFFLINE_QUEUE: 'offline_step_queue',
  LAST_SYNC: 'last_step_sync',
  PERMISSION_STATUS: 'step_permission_status',
};

class StepCounterServiceImpl implements StepCounterService {
  private subscription: any = null;
  private stepUpdateCallback?: (steps: number) => void;
  private currentSteps: number = 0;
  private syncTimer: any = null;
  private isGoogleFitAvailable: boolean = false;
  private useRealGoogleFit: boolean = true; // Toggle for real vs mock data
  private isWebEnvironment: boolean = false;

  constructor() {
    this.isWebEnvironment = this.detectWebEnvironment();
    this.initializeGoogleFit();
  }

  private detectWebEnvironment(): boolean {
    // Check if we're running in a web environment
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  private async initializeGoogleFit(): Promise<void> {
    try {
      if (this.isWebEnvironment) {
        // Web environment - use Google Fit Web Service
        console.log('🌐 Initializing Google Fit for web environment');
        const initialized = await googleFitWebService.initialize();
        this.isGoogleFitAvailable = initialized;
        
        if (initialized) {
          console.log('✅ Google Fit Web service initialized successfully');
        } else {
          console.log('⚠️ Google Fit Web service initialization failed, using mock data');
          this.useRealGoogleFit = false;
        }
      } else if (Platform.OS === 'android') {
        // Mobile Android environment - use React Native Google Fit
        console.log('📱 Initializing Google Fit for Android');
        const initialized = await googleFitService.initialize();
        this.isGoogleFitAvailable = initialized;
        
        if (initialized) {
          console.log('✅ Google Fit service initialized successfully');
        } else {
          console.log('⚠️ Google Fit service initialization failed, using mock data');
          this.useRealGoogleFit = false;
        }
      } else {
        console.log('ℹ️ Google Fit not available on this platform, using mock data');
        this.useRealGoogleFit = false;
      }
    } catch (error) {
      console.warn('Google Fit initialization error:', error);
      this.isGoogleFitAvailable = false;
      this.useRealGoogleFit = false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (this.isWebEnvironment) {
        // Web environment - request Google Fit authorization
        console.log('🔐 Requesting Google Fit web authorization...');
        
        if (this.useRealGoogleFit && this.isGoogleFitAvailable) {
          const googleFitAuthorized = await googleFitWebService.authorize();
          
          if (googleFitAuthorized) {
            console.log('✅ Google Fit web authorization successful');
            return true;
          } else {
            console.log('❌ Google Fit web authorization failed, falling back to mock data');
            this.useRealGoogleFit = false;
            return false;
          }
        }
        
        return true; // Mock data doesn't need permission
      } else if (Platform.OS === 'android') {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        ];

        // Request Android permissions first
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const androidPermissionsGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!androidPermissionsGranted) {
          console.log('❌ Android permissions not granted');
          return false;
        }

        // If using real Google Fit, request Google Fit authorization
        if (this.useRealGoogleFit && this.isGoogleFitAvailable) {
          console.log('🔐 Requesting Google Fit authorization...');
          const googleFitAuthorized = await googleFitService.authorize();
          
          if (googleFitAuthorized) {
            console.log('✅ Google Fit authorization successful');
            
            // Start Google Fit recording
            const recordingStarted = await googleFitService.startRecording();
            if (recordingStarted) {
              console.log('🎯 Google Fit recording started');
            }
          } else {
            console.log('❌ Google Fit authorization failed, falling back to mock data');
            this.useRealGoogleFit = false;
          }
        }

        // Store permission status
        await AsyncStorage.setItem(
          STORAGE_KEYS.PERMISSION_STATUS, 
          JSON.stringify({ 
            granted: androidPermissionsGranted, 
            googleFitAuthorized: this.useRealGoogleFit && this.isGoogleFitAvailable,
            timestamp: new Date() 
          })
        );

        return androidPermissionsGranted;
      }
      
      // iOS - For now, assume permission is granted
      // In a real implementation, you would check HealthKit availability
      return true;
    } catch (error) {
      console.error('Error requesting step counter permission:', error);
      return false;
    }
  }

  async getCurrentSteps(): Promise<number> {
    try {
      // Try to get real Google Fit data first
      if (this.useRealGoogleFit && this.isGoogleFitAvailable) {
        let realSteps = 0;
        
        if (this.isWebEnvironment) {
          // Use web Google Fit service
          realSteps = await googleFitWebService.getStepsToday();
        } else {
          // Use mobile Google Fit service
          realSteps = await googleFitService.getStepsToday();
        }
        
        if (realSteps > 0) {
          console.log(`📊 Real steps from Google Fit: ${realSteps}`);
          this.currentSteps = realSteps;
          return realSteps;
        }
      }

      // Fallback to cached data or mock data
      const today = new Date();
      const cachedData = await this.getCachedStepData(today);
      
      if (cachedData) {
        console.log(`💾 Using cached step data: ${cachedData.steps}`);
        return cachedData.steps;
      }

      // Return current mock steps if no cached data
      console.log(`🎭 Using mock step data: ${this.currentSteps}`);
      return this.currentSteps;
    } catch (error) {
      console.error('Error getting current steps:', error);
      throw new Error('Failed to retrieve step count');
    }
  }

  async getStepHistory(days: number): Promise<StepHistoryData[]> {
    try {
      // Try to get real Google Fit data first
      if (this.useRealGoogleFit && this.isGoogleFitAvailable) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days + 1);

        let realHistory: StepHistoryData[] = [];
        
        if (this.isWebEnvironment) {
          // Use web Google Fit service
          realHistory = await googleFitWebService.getStepsForDateRange(startDate, endDate);
        } else {
          // Use mobile Google Fit service
          realHistory = await googleFitService.getStepsForDateRange(startDate, endDate);
        }
        
        if (realHistory.length > 0) {
          console.log(`📊 Retrieved ${realHistory.length} days of real step data from Google Fit`);
          
          // Cache the real data
          for (const dayData of realHistory) {
            await this.cacheStepData(dayData);
          }
          
          return realHistory;
        }
      }

      // Fallback to cached data and mock generation
      const history: StepHistoryData[] = [];
      const now = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const cachedData = await this.getCachedStepData(date);
        
        if (cachedData) {
          history.push(cachedData);
        } else {
          // Generate mock data for development
          const steps = Math.floor(Math.random() * 10000) + 2000;
          const stepData: StepHistoryData = {
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            steps,
            source: this.useRealGoogleFit ? 'google_fit' : 'mock',
            validated: false,
          };
          
          history.push(stepData);
          // Cache the generated data
          await this.cacheStepData(stepData);
        }
      }

      console.log(`📈 Generated step history: ${history.length} days (${this.useRealGoogleFit ? 'with Google Fit fallback' : 'mock data'})`);
      return history.reverse(); // Return oldest to newest
    } catch (error) {
      console.error('Error getting step history:', error);
      throw new Error('Failed to retrieve step history');
    }
  }

  private async getCachedStepData(date: Date): Promise<StepHistoryData | null> {
    try {
      const dateKey = this.getDateKey(date);
      const cached = await AsyncStorage.getItem(`${STORAGE_KEYS.STEP_DATA}_${dateKey}`);
      
      if (cached) {
        const data = JSON.parse(cached);
        return {
          ...data,
          date: new Date(data.date),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached step data:', error);
      return null;
    }
  }

  private async cacheStepData(stepData: StepHistoryData): Promise<void> {
    try {
      const dateKey = this.getDateKey(stepData.date);
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.STEP_DATA}_${dateKey}`,
        JSON.stringify(stepData)
      );
    } catch (error) {
      console.error('Error caching step data:', error);
    }
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  validateStepData(stepData: StepHistoryData[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check offline limit
    const offlineDays = this.calculateOfflineDays(stepData);
    if (offlineDays > VALIDATION_CONSTANTS.MAX_OFFLINE_DAYS) {
      errors.push({
        type: 'OFFLINE_LIMIT_EXCEEDED',
        message: `Offline data exceeds ${VALIDATION_CONSTANTS.MAX_OFFLINE_DAYS} day limit`,
        data: { offlineDays },
      });
    }

    stepData.forEach((data, index) => {
      // Validate step count
      if (data.steps < 0) {
        errors.push({
          type: 'NEGATIVE_STEPS',
          message: 'Step count cannot be negative',
          data: { date: data.date, steps: data.steps },
        });
      }

      if (data.steps > VALIDATION_CONSTANTS.MAX_DAILY_STEPS) {
        errors.push({
          type: 'EXCESSIVE_STEPS',
          message: `Daily steps exceed maximum limit of ${VALIDATION_CONSTANTS.MAX_DAILY_STEPS}`,
          data: { date: data.date, steps: data.steps },
        });
      }

      // Check for suspicious activity
      if (data.steps > VALIDATION_CONSTANTS.SUSPICIOUS_THRESHOLD) {
        warnings.push({
          type: 'SUSPICIOUS_ACTIVITY',
          message: 'Unusually high step count detected',
          data: { date: data.date, steps: data.steps },
        });
      }

      // Check for data gaps
      if (index > 0) {
        const prevDate = stepData[index - 1].date;
        const currentDate = data.date;
        const dayDiff = Math.abs(currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dayDiff > 1.5) { // More than 1.5 days gap
          warnings.push({
            type: 'DATA_GAP',
            message: 'Gap detected in step data',
            data: { from: prevDate, to: currentDate, dayGap: dayDiff },
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private calculateOfflineDays(stepData: StepHistoryData[]): number {
    if (stepData.length === 0) return 0;
    
    const now = new Date();
    const oldestData = stepData.reduce((oldest, current) => 
      current.date < oldest.date ? current : oldest
    );
    
    const daysDiff = Math.ceil((now.getTime() - oldestData.date.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff);
  }

  async syncStepData(): Promise<SyncResult> {
    try {
      const offlineData = await this.getOfflineStepData();
      const validationResult = this.validateStepData(offlineData.map(d => ({
        date: d.date,
        steps: d.steps,
        source: 'offline',
      })));

      if (!validationResult.isValid) {
        return {
          success: false,
          syncedDays: 0,
          errors: validationResult.errors.map(e => e.message),
          lastSyncDate: new Date(),
        };
      }

      // In a real implementation, this would sync with the backend
      // For now, mark offline data as synced
      const syncedCount = await this.markOfflineDataAsSynced();
      
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      return {
        success: true,
        syncedDays: syncedCount,
        errors: [],
        lastSyncDate: new Date(),
      };
    } catch (error) {
      console.error('Error syncing step data:', error);
      return {
        success: false,
        syncedDays: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        lastSyncDate: new Date(),
      };
    }
  }

  async getOfflineStepData(): Promise<OfflineStepData[]> {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (!queueData) return [];

      const queue: OfflineStepData[] = JSON.parse(queueData);
      return queue.map(item => ({
        ...item,
        date: new Date(item.date),
        timestamp: new Date(item.timestamp),
      }));
    } catch (error) {
      console.error('Error getting offline step data:', error);
      return [];
    }
  }

  private async markOfflineDataAsSynced(): Promise<number> {
    try {
      const offlineData = await this.getOfflineStepData();
      const syncedData = offlineData.map(item => ({ ...item, synced: true }));
      
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(syncedData));
      return offlineData.length;
    } catch (error) {
      console.error('Error marking offline data as synced:', error);
      return 0;
    }
  }

  private async addToOfflineQueue(stepData: StepHistoryData): Promise<void> {
    try {
      const offlineData = await this.getOfflineStepData();
      const newOfflineData: OfflineStepData = {
        date: stepData.date,
        steps: stepData.steps,
        timestamp: new Date(),
        synced: false,
      };

      offlineData.push(newOfflineData);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  }

  startTracking(): void {
    try {
      if (this.subscription) {
        this.stopTracking();
      }

      // If using real Google Fit, set up periodic sync with Google Fit data
      if (this.useRealGoogleFit && this.isGoogleFitAvailable) {
        console.log('🎯 Starting real Google Fit step tracking...');
        
        this.subscription = setInterval(async () => {
          try {
            // Get real steps from Google Fit
            let realSteps = 0;
            
            if (this.isWebEnvironment) {
              realSteps = await googleFitWebService.getStepsToday();
            } else {
              realSteps = await googleFitService.getStepsToday();
            }
            
            this.currentSteps = realSteps;
            
            // Cache current step data
            const today = new Date();
            const stepData: StepHistoryData = {
              date: today,
              steps: realSteps,
              source: 'google_fit',
              validated: true,
            };

            await this.cacheStepData(stepData);
            await this.addToOfflineQueue(stepData);
            
            if (this.stepUpdateCallback) {
              this.stepUpdateCallback(realSteps);
            }
            
            console.log(`📊 Updated real steps: ${realSteps}`);
          } catch (error) {
            console.error('Error updating real steps:', error);
          }
        }, 60000); // Update every minute for real data
      } else {
        // Fallback to mock step simulation
        console.log('🎭 Starting mock step tracking...');
        
        this.subscription = setInterval(async () => {
          // Simulate step increments
          const increment = Math.floor(Math.random() * 10) + 1;
          this.currentSteps += increment;
          
          // Cache current step data
          const today = new Date();
          const stepData: StepHistoryData = {
            date: today,
            steps: this.currentSteps,
            source: 'mock',
            validated: false,
          };

          await this.cacheStepData(stepData);
          await this.addToOfflineQueue(stepData);
          
          if (this.stepUpdateCallback) {
            this.stepUpdateCallback(this.currentSteps);
          }
          
          console.log(`🎭 Simulated steps: ${this.currentSteps}`);
        }, 30000); // Update every 30 seconds for mock data
      }

      // Start periodic sync
      this.syncTimer = setInterval(() => {
        this.syncStepData();
      }, VALIDATION_CONSTANTS.SYNC_INTERVAL);

    } catch (error) {
      console.error('Error starting step tracking:', error);
      throw new Error('Failed to start step tracking');
    }
  }

  stopTracking(): void {
    if (this.subscription) {
      clearInterval(this.subscription);
      this.subscription = null;
    }

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  setStepUpdateCallback(callback: (steps: number) => void): void {
    this.stepUpdateCallback = callback;
  }

  // New methods for Google Fit integration
  async getGoogleFitStatus(): Promise<{
    available: boolean;
    initialized: boolean;
    authorized: boolean;
    recording?: boolean;
    usingRealData: boolean;
    environment: string;
  }> {
    if (!this.isGoogleFitAvailable) {
      return {
        available: false,
        initialized: false,
        authorized: false,
        recording: false,
        usingRealData: false,
        environment: this.isWebEnvironment ? 'web' : 'mobile',
      };
    }

    if (this.isWebEnvironment) {
      // Web environment status
      const status = googleFitWebService.getConnectionStatus();
      return {
        ...status,
        usingRealData: this.useRealGoogleFit,
        environment: 'web',
      };
    } else {
      // Mobile environment status
      const status = await googleFitService.getConnectionStatus();
      return {
        ...status,
        usingRealData: this.useRealGoogleFit,
        environment: 'mobile',
      };
    }
  }
    };
  }

  // Method to force refresh from Google Fit
  async refreshFromGoogleFit(): Promise<number> {
    if (!this.useRealGoogleFit || !this.isGoogleFitAvailable) {
      throw new Error('Google Fit not available or not using real data');
    }

    try {
      const realSteps = await googleFitService.getStepsToday();
      this.currentSteps = realSteps;
      
      // Cache the real data
      const today = new Date();
      const stepData: StepHistoryData = {
        date: today,
        steps: realSteps,
        source: 'google_fit',
        validated: true,
      };
      
      await this.cacheStepData(stepData);
      console.log(`🔄 Refreshed from Google Fit: ${realSteps} steps`);
      
      return realSteps;
    } catch (error) {
      console.error('Error refreshing from Google Fit:', error);
      throw error;
    }
  }

  // Method to toggle between real and mock data (for testing)
  setUseRealGoogleFit(useReal: boolean): void {
    this.useRealGoogleFit = useReal && this.isGoogleFitAvailable;
    console.log(`🔧 Switched to ${this.useRealGoogleFit ? 'real Google Fit' : 'mock'} data`);
  }

  // Method to get current data source
  getCurrentDataSource(): string {
    if (this.useRealGoogleFit && this.isGoogleFitAvailable) {
      return 'google_fit';
    }
    return 'mock';
  }
}

export const stepCounterService = new StepCounterServiceImpl();