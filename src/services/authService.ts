import AsyncStorage from '@react-native-async-storage/async-storage';
import {ApiResponse, AuthResponse} from '@/types';
import {apiClient} from './apiClient';

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  async login(credentials: {username: string; password: string}): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
      
      if (response.data.success && response.data.data) {
        await this.storeTokens(response.data.data.token, response.data.data.refreshToken);
        return response.data.data;
      }
      
      throw new Error(response.data.error?.message || 'Login failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Network error during login');
    }
  }

  async register(userData: {username: string; password: string; email: string}): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', userData);
      
      if (response.data.success && response.data.data) {
        await this.storeTokens(response.data.data.token, response.data.data.refreshToken);
        return response.data.data;
      }
      
      throw new Error(response.data.error?.message || 'Registration failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Network error during registration');
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', {
        refreshToken,
      });
      
      if (response.data.success && response.data.data) {
        await this.storeTokens(response.data.data.token, response.data.data.refreshToken);
        return response.data.data;
      }
      
      throw new Error(response.data.error?.message || 'Token refresh failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Network error during token refresh');
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.TOKEN_KEY, this.REFRESH_TOKEN_KEY]);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  }

  async getStoredRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  private async storeTokens(token: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [this.TOKEN_KEY, token],
        [this.REFRESH_TOKEN_KEY, refreshToken],
      ]);
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }
}

export const authService = new AuthService();