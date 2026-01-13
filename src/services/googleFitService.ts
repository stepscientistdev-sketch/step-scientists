import GoogleFit, { Scopes } from 'react-native-google-fit';
import { Platform } from 'react-native';
import { StepHistoryData } from './stepCounterService';

export interface GoogleFitService {
  initialize(): Promise<boolean>;
  isAuthorized(): Promise<boolean>;
  authorize(): Promise<boolean>;
  getStepsToday(): Promise<number>;
  getStepsForDate(date: Date): Promise<number>;
  getStepsForDateRange(startDate: Date, endDate: Date): Promise<StepHistoryData[]>;
  startRecording(): Promise<boolean>;
  stopRecording(): void;
}

class GoogleFitServiceImpl implements GoogleFitService {
  private isInitialized: boolean = false;
  private isRecording: boolean = false;

  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.log('Google Fit is only available on Android');
        return false;
      }

      if (this.isInitialized) {
        return true;
      }

      // Configure Google Fit options
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_ACTIVITY_WRITE,
          Scopes.FITNESS_BODY_READ,
          Scopes.FITNESS_BODY_WRITE,
        ],
        // OAuth 2.0 Client ID from Google Cloud Console
        clientId: '570511343860-bjrh86v7rmqvchn9qmodb6r7bhq8g2j7.apps.googleusercontent.com',
      };

      // Initialize Google Fit
      GoogleFit.checkIsAuthorized().then(() => {
        console.log('Google Fit authorization check completed');
      });

      await GoogleFit.initializeIfNeeded(options);
      this.isInitialized = true;
      
      console.log('Google Fit initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Fit:', error);
      return false;
    }
  }

  async isAuthorized(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      return new Promise((resolve) => {
        GoogleFit.checkIsAuthorized().then(() => {
          const authorized = GoogleFit.isAuthorized;
          console.log('Google Fit authorization status:', authorized);
          resolve(authorized);
        }).catch((error) => {
          console.error('Error checking Google Fit authorization:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Error checking authorization:', error);
      return false;
    }
  }

  async authorize(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return false;
        }
      }

      return new Promise((resolve) => {
        GoogleFit.authorize({
          scopes: [
            Scopes.FITNESS_ACTIVITY_READ,
            Scopes.FITNESS_ACTIVITY_WRITE,
          ],
          // OAuth 2.0 Client ID from Google Cloud Console
          clientId: '570511343860-bjrh86v7rmqvchn9qmodb6r7bhq8g2j7.apps.googleusercontent.com',
        }).then((authResult) => {
          if (authResult.success) {
            console.log('Google Fit authorization successful');
            resolve(true);
          } else {
            console.log('Google Fit authorization failed:', authResult.message);
            resolve(false);
          }
        }).catch((error) => {
          console.error('Google Fit authorization error:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Error during authorization:', error);
      return false;
    }
  }

  async getStepsToday(): Promise<number> {
    try {
      const today = new Date();
      return await this.getStepsForDate(today);
    } catch (error) {
      console.error('Error getting today\'s steps:', error);
      return 0;
    }
  }

  async getStepsForDate(date: Date): Promise<number> {
    try {
      if (!await this.isAuthorized()) {
        console.log('Google Fit not authorized, cannot get steps');
        return 0;
      }

      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      return new Promise((resolve) => {
        GoogleFit.getDailyStepCountSamples(options).then((steps) => {
          if (steps && steps.length > 0) {
            // Sum up all step counts for the day
            const totalSteps = steps.reduce((total, sample) => {
              return total + (sample.steps || 0);
            }, 0);
            
            console.log(`Steps for ${date.toDateString()}: ${totalSteps}`);
            resolve(totalSteps);
          } else {
            console.log(`No step data found for ${date.toDateString()}`);
            resolve(0);
          }
        }).catch((error) => {
          console.error('Error getting daily steps:', error);
          resolve(0);
        });
      });
    } catch (error) {
      console.error('Error in getStepsForDate:', error);
      return 0;
    }
  }

  async getStepsForDateRange(startDate: Date, endDate: Date): Promise<StepHistoryData[]> {
    try {
      if (!await this.isAuthorized()) {
        console.log('Google Fit not authorized, cannot get step history');
        return [];
      }

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      return new Promise((resolve) => {
        GoogleFit.getDailyStepCountSamples(options).then((steps) => {
          if (steps && steps.length > 0) {
            // Group steps by date and sum them up
            const stepsByDate: { [key: string]: number } = {};
            
            steps.forEach((sample) => {
              const sampleDate = new Date(sample.startDate);
              const dateKey = sampleDate.toDateString();
              
              if (!stepsByDate[dateKey]) {
                stepsByDate[dateKey] = 0;
              }
              stepsByDate[dateKey] += sample.steps || 0;
            });

            // Convert to StepHistoryData array
            const stepHistory: StepHistoryData[] = Object.entries(stepsByDate).map(([dateStr, steps]) => ({
              date: new Date(dateStr),
              steps,
              source: 'google_fit',
              validated: true,
            }));

            // Sort by date (oldest first)
            stepHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
            
            console.log(`Retrieved ${stepHistory.length} days of step data from Google Fit`);
            resolve(stepHistory);
          } else {
            console.log('No step data found in date range');
            resolve([]);
          }
        }).catch((error) => {
          console.error('Error getting step history:', error);
          resolve([]);
        });
      });
    } catch (error) {
      console.error('Error in getStepsForDateRange:', error);
      return [];
    }
  }

  async startRecording(): Promise<boolean> {
    try {
      if (!await this.isAuthorized()) {
        console.log('Google Fit not authorized, cannot start recording');
        return false;
      }

      if (this.isRecording) {
        console.log('Google Fit recording already started');
        return true;
      }

      return new Promise((resolve) => {
        GoogleFit.startRecording((callback) => {
          console.log('Google Fit recording callback:', callback);
        }).then((success) => {
          if (success) {
            this.isRecording = true;
            console.log('Google Fit recording started successfully');
            resolve(true);
          } else {
            console.log('Failed to start Google Fit recording');
            resolve(false);
          }
        }).catch((error) => {
          console.error('Error starting Google Fit recording:', error);
          resolve(false);
        });
      });
    } catch (error) {
      console.error('Error in startRecording:', error);
      return false;
    }
  }

  stopRecording(): void {
    try {
      if (this.isRecording) {
        // Note: Google Fit doesn't have a direct stop recording method
        // Recording continues in the background as part of Google Fit's normal operation
        this.isRecording = false;
        console.log('Google Fit recording stopped (background recording continues)');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  // Utility method to check if Google Fit is available
  static isAvailable(): boolean {
    return Platform.OS === 'android';
  }

  // Method to get Google Fit connection status
  async getConnectionStatus(): Promise<{
    available: boolean;
    initialized: boolean;
    authorized: boolean;
    recording: boolean;
  }> {
    return {
      available: GoogleFitServiceImpl.isAvailable(),
      initialized: this.isInitialized,
      authorized: await this.isAuthorized(),
      recording: this.isRecording,
    };
  }
}

export const googleFitService = new GoogleFitServiceImpl();
export { GoogleFitServiceImpl };