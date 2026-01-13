import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {StepData, ValidationResult, SyncResult, OfflineStepData} from '../../types';
import {stepCounterService, StepHistoryData} from '../../services/stepCounterService';
import {syncManager} from '../../services/syncService';

interface StepCounterState {
  stepData: StepData;
  isTracking: boolean;
  permissionGranted: boolean;
  loading: boolean;
  error: string | null;
  validationResult: ValidationResult | null;
  syncResult: SyncResult | null;
  offlineData: OfflineStepData[];
  lastSyncDate: Date | null;
}

const initialState: StepCounterState = {
  stepData: {
    totalSteps: 0,
    dailySteps: 0,
    lastUpdated: new Date(),
    source: 'manual',
    validated: false,
  },
  isTracking: false,
  permissionGranted: false,
  loading: false,
  error: null,
  validationResult: null,
  syncResult: null,
  offlineData: [],
  lastSyncDate: null,
};

// Async thunks
export const requestStepPermission = createAsyncThunk(
  'stepCounter/requestPermission',
  async () => {
    const granted = await stepCounterService.requestPermission();
    return granted;
  }
);

export const getCurrentSteps = createAsyncThunk(
  'stepCounter/getCurrentSteps',
  async () => {
    const steps = await stepCounterService.getCurrentSteps();
    return steps;
  }
);

export const getStepHistory = createAsyncThunk(
  'stepCounter/getStepHistory',
  async (days: number) => {
    const history = await stepCounterService.getStepHistory(days);
    return history;
  }
);

export const validateStepData = createAsyncThunk(
  'stepCounter/validateStepData',
  async (stepData: StepHistoryData[]) => {
    const result = stepCounterService.validateStepData(stepData);
    return result;
  }
);

export const syncStepData = createAsyncThunk(
  'stepCounter/syncStepData',
  async () => {
    const result = await stepCounterService.syncStepData();
    return result;
  }
);

export const getOfflineStepData = createAsyncThunk(
  'stepCounter/getOfflineStepData',
  async () => {
    const offlineData = await stepCounterService.getOfflineStepData();
    return offlineData;
  }
);

export const syncPlayerData = createAsyncThunk(
  'stepCounter/syncPlayerData',
  async (playerId: string) => {
    const result = await syncManager.syncPlayerData(playerId);
    return result;
  }
);

export const startStepTracking = createAsyncThunk(
  'stepCounter/startTracking',
  async () => {
    stepCounterService.startTracking();
    return true;
  }
);

export const stopStepTracking = createAsyncThunk(
  'stepCounter/stopTracking',
  async () => {
    stepCounterService.stopTracking();
    return true;
  }
);

const stepCounterSlice = createSlice({
  name: 'stepCounter',
  initialState,
  reducers: {
    updateStepData: (state, action: PayloadAction<StepData>) => {
      state.stepData = action.payload;
    },
    setTracking: (state, action: PayloadAction<boolean>) => {
      state.isTracking = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearValidationResult: (state) => {
      state.validationResult = null;
    },
    clearSyncResult: (state) => {
      state.syncResult = null;
    },
    updateCurrentSteps: (state, action: PayloadAction<number>) => {
      state.stepData.totalSteps = action.payload;
      state.stepData.lastUpdated = new Date();
    },
  },
  extraReducers: (builder) => {
    builder
      // Request permission
      .addCase(requestStepPermission.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestStepPermission.fulfilled, (state, action: PayloadAction<boolean>) => {
        state.loading = false;
        state.permissionGranted = action.payload;
      })
      .addCase(requestStepPermission.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Permission request failed';
      })
      
      // Get current steps
      .addCase(getCurrentSteps.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentSteps.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false;
        state.stepData.totalSteps = action.payload;
        state.stepData.lastUpdated = new Date();
      })
      .addCase(getCurrentSteps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get current steps';
      })

      // Get step history
      .addCase(getStepHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(getStepHistory.fulfilled, (state, action: PayloadAction<StepHistoryData[]>) => {
        state.loading = false;
        // Update with most recent day's data
        if (action.payload.length > 0) {
          const latestData = action.payload[action.payload.length - 1];
          state.stepData = {
            totalSteps: latestData.steps,
            dailySteps: latestData.steps,
            lastUpdated: latestData.date,
            source: latestData.source,
            validated: latestData.validated,
          };
        }
      })
      .addCase(getStepHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get step history';
      })

      // Validate step data
      .addCase(validateStepData.fulfilled, (state, action: PayloadAction<ValidationResult>) => {
        state.validationResult = action.payload;
        state.stepData.validated = action.payload.isValid;
      })
      .addCase(validateStepData.rejected, (state, action) => {
        state.error = action.error.message || 'Validation failed';
      })

      // Sync step data
      .addCase(syncStepData.pending, (state) => {
        state.loading = true;
      })
      .addCase(syncStepData.fulfilled, (state, action: PayloadAction<SyncResult>) => {
        state.loading = false;
        state.syncResult = action.payload;
        state.lastSyncDate = action.payload.lastSyncDate;
      })
      .addCase(syncStepData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Sync failed';
      })

      // Get offline step data
      .addCase(getOfflineStepData.fulfilled, (state, action: PayloadAction<OfflineStepData[]>) => {
        state.offlineData = action.payload;
      })

      // Sync player data
      .addCase(syncPlayerData.pending, (state) => {
        state.loading = true;
      })
      .addCase(syncPlayerData.fulfilled, (state, action: PayloadAction<SyncResult>) => {
        state.loading = false;
        state.syncResult = action.payload;
        state.lastSyncDate = action.payload.lastSyncDate;
      })
      .addCase(syncPlayerData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Player data sync failed';
      })

      // Start tracking
      .addCase(startStepTracking.fulfilled, (state) => {
        state.isTracking = true;
      })
      .addCase(startStepTracking.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to start tracking';
      })

      // Stop tracking
      .addCase(stopStepTracking.fulfilled, (state) => {
        state.isTracking = false;
      })
      .addCase(stopStepTracking.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to stop tracking';
      });
  },
});

export const {
  updateStepData,
  setTracking,
  clearError,
  clearValidationResult,
  clearSyncResult,
  updateCurrentSteps,
} = stepCounterSlice.actions;

export default stepCounterSlice.reducer;