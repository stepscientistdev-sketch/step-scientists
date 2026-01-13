import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {Player, AuthResponse} from '@/types';
import {authService} from '@/services/authService';

interface AuthState {
  isAuthenticated: boolean;
  player: Player | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  player: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
};

// Async thunks
export const loginPlayer = createAsyncThunk(
  'auth/login',
  async (credentials: {username: string; password: string}) => {
    const response = await authService.login(credentials);
    return response;
  }
);

export const registerPlayer = createAsyncThunk(
  'auth/register',
  async (userData: {username: string; password: string; email: string}) => {
    const response = await authService.register(userData);
    return response;
  }
);

export const refreshAuthToken = createAsyncThunk(
  'auth/refresh',
  async (refreshToken: string) => {
    const response = await authService.refreshToken(refreshToken);
    return response;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.player = null;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setTokens: (state, action: PayloadAction<{token: string; refreshToken: string}>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginPlayer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginPlayer.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.player = action.payload.player;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(loginPlayer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(registerPlayer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerPlayer.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.player = action.payload.player;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(registerPlayer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Refresh token
      .addCase(refreshAuthToken.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      });
  },
});

export const {logout, clearError, setTokens} = authSlice.actions;
export default authSlice.reducer;