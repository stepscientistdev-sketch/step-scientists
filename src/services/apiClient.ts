import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiClient {
  private client: AxiosInstance;
  private readonly baseURL = this.getBaseURL();

  private getBaseURL(): string {
    // Configuration for mobile testing
    // You need to replace 'YOUR_COMPUTER_IP' with your actual IP address
    // Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
    
    const DEVELOPMENT_IP = '192.168.1.111'; // Replace with your actual IP
    const PORT = '3000';
    
    // For development/testing, use your computer's IP address
    // For production, this would be your server's domain
    const baseURL = `http://${DEVELOPMENT_IP}:${PORT}/api`;
    
    console.log('API Base URL:', baseURL);
    return baseURL;
  }

  constructor() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error retrieving auth token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${this.baseURL}/auth/refresh`, {
                refreshToken,
              });

              if (response.data.success) {
                const {token, refreshToken: newRefreshToken} = response.data.data;
                await AsyncStorage.multiSet([
                  ['auth_token', token],
                  ['refresh_token', newRefreshToken],
                ]);

                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear stored tokens and redirect to login
            await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  setBaseURL(url: string): void {
    this.client.defaults.baseURL = url;
  }
}

export const apiClient = new ApiClient();
