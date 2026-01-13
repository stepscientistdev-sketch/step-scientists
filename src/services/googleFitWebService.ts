// Web-compatible Google Fit service using Google Identity Services
import { StepHistoryData } from './stepCounterService';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export interface GoogleFitWebService {
  initialize(): Promise<boolean>;
  isAuthorized(): boolean;
  authorize(): Promise<boolean>;
  getStepsToday(): Promise<number>;
  getStepsForDate(date: Date): Promise<number>;
  getStepsForDateRange(startDate: Date, endDate: Date): Promise<StepHistoryData[]>;
  signOut(): void;
}

class GoogleFitWebServiceImpl implements GoogleFitWebService {
  private CLIENT_ID = '570511343860-48hgn66bnn5vjdsvb3m62m4qpinbfl9n.apps.googleusercontent.com';
  private DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/fitness/v1/rest';
  private SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read';
  
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private gisInited = false;
  private gapiInited = false;

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing Google Fit Web Service...');
      
      // Load Google Identity Services if not already loaded
      if (!window.google?.accounts) {
        await this.loadGoogleIdentityServices();
      }

      // Load Google API client if not already loaded
      if (!window.gapi) {
        await this.loadGoogleAPI();
      }

      // Initialize Google Identity Services
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: (tokenResponse: any) => {
          this.accessToken = tokenResponse.access_token;
          console.log('Google Fit access token received');
        },
      });
      
      this.gisInited = true;
      
      // Initialize Google API client
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: [this.DISCOVERY_DOC],
            });
            this.gapiInited = true;
            console.log('Google API client initialized');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      console.log('Google Fit Web Service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Fit Web Service:', error);
      return false;
    }
  }

  private async loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  private async loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  isAuthorized(): boolean {
    return this.accessToken !== null;
  }

  async authorize(): Promise<boolean> {
    try {
      if (!this.gisInited) {
        const initialized = await this.initialize();
        if (!initialized) {
          return false;
        }
      }

      return new Promise((resolve) => {
        // Set up callback for this specific authorization request
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (tokenResponse: any) => {
          this.accessToken = tokenResponse.access_token;
          console.log('Google Fit authorization successful');
          // Restore original callback
          this.tokenClient.callback = originalCallback;
          resolve(true);
        };

        // Request access token
        this.tokenClient.requestAccessToken();
      });
    } catch (error) {
      console.error('Google Fit authorization failed:', error);
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
      if (!this.isAuthorized()) {
        console.log('Google Fit not authorized, cannot get steps');
        return 0;
      }

      if (!this.gapiInited) {
        console.log('Google API not initialized');
        return 0;
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Try multiple data source approaches
      const approaches = [
        {
          name: 'Estimated steps',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
        },
        {
          name: 'All step sources',
          dataSourceId: null
        }
      ];

      for (const approach of approaches) {
        try {
          const request = {
            aggregateBy: [{
              dataTypeName: 'com.google.step_count.delta',
              ...(approach.dataSourceId && { dataSourceId: approach.dataSourceId })
            }],
            bucketByTime: { durationMillis: 86400000 }, // 1 day
            startTimeMillis: startOfDay.getTime(),
            endTimeMillis: endOfDay.getTime()
          };

          const response = await window.gapi.client.request({
            path: 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
            method: 'POST',
            body: request,
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          let totalSteps = 0;
          if (response.result.bucket && response.result.bucket.length > 0) {
            response.result.bucket.forEach((bucket: any) => {
              if (bucket.dataset && bucket.dataset.length > 0) {
                bucket.dataset.forEach((dataset: any) => {
                  if (dataset.point && dataset.point.length > 0) {
                    dataset.point.forEach((point: any) => {
                      if (point.value && point.value.length > 0) {
                        totalSteps += point.value[0].intVal || 0;
                      }
                    });
                  }
                });
              }
            });
          }

          if (totalSteps > 0) {
            console.log(`Steps for ${date.toDateString()}: ${totalSteps} (${approach.name})`);
            return totalSteps;
          }
        } catch (error) {
          console.log(`${approach.name} failed:`, error);
        }
      }

      console.log(`No step data found for ${date.toDateString()}`);
      return 0;
    } catch (error) {
      console.error('Error getting steps for date:', error);
      return 0;
    }
  }

  async getStepsForDateRange(startDate: Date, endDate: Date): Promise<StepHistoryData[]> {
    try {
      if (!this.isAuthorized()) {
        console.log('Google Fit not authorized, cannot get step history');
        return [];
      }

      if (!this.gapiInited) {
        console.log('Google API not initialized');
        return [];
      }

      const request = {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta'
        }],
        bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 }, // 1 day buckets
        startTimeMillis: startDate.getTime(),
        endTimeMillis: endDate.getTime()
      };

      const response = await window.gapi.client.request({
        path: 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
        method: 'POST',
        body: request,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const stepHistory: StepHistoryData[] = [];
      
      if (response.result.bucket) {
        response.result.bucket.forEach((bucket: any, index: number) => {
          let daySteps = 0;
          if (bucket.dataset && bucket.dataset.length > 0) {
            bucket.dataset.forEach((dataset: any) => {
              if (dataset.point && dataset.point.length > 0) {
                dataset.point.forEach((point: any) => {
                  if (point.value && point.value.length > 0) {
                    daySteps += point.value[0].intVal || 0;
                  }
                });
              }
            });
          }

          if (daySteps > 0) {
            const date = new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000);
            stepHistory.push({
              date,
              steps: daySteps,
              source: 'google_fit_web',
              validated: true,
            });
          }
        });
      }

      console.log(`Retrieved ${stepHistory.length} days of step data from Google Fit`);
      return stepHistory;
    } catch (error) {
      console.error('Error getting step history:', error);
      return [];
    }
  }

  signOut(): void {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken);
      this.accessToken = null;
      console.log('Google Fit signed out');
    }
  }

  // Utility methods
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && window.location.protocol === 'https:';
  }

  getConnectionStatus(): {
    available: boolean;
    initialized: boolean;
    authorized: boolean;
  } {
    return {
      available: GoogleFitWebServiceImpl.isAvailable(),
      initialized: this.gisInited && this.gapiInited,
      authorized: this.isAuthorized(),
    };
  }
}

export const googleFitWebService = new GoogleFitWebServiceImpl();
export { GoogleFitWebServiceImpl };