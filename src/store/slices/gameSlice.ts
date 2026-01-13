import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {GameMode, Resources, Stepling, MagnifyingGlass} from '@/types';
import {gameService, GameModeData, MilestoneProgress} from '../../services/gameService';

interface GameState {
  currentMode: GameMode;
  resources: Resources;
  steplings: Stepling[];
  loading: boolean;
  error: string | null;
  modeData: GameModeData | null;
  milestoneProgress: MilestoneProgress | null;
  magnifyingGlasses: MagnifyingGlass[];
  pendingMilestones: MagnifyingGlass[];
}

const initialState: GameState = {
  currentMode: GameMode.DISCOVERY,
  resources: {
    cells: 0,
    experiencePoints: 0,
  },
  steplings: [],
  loading: false,
  error: null,
  modeData: null,
  milestoneProgress: null,
  magnifyingGlasses: [],
  pendingMilestones: [],
};

// Async thunks
export const initializeGameData = createAsyncThunk(
  'game/initializeGameData',
  async () => {
    await gameService.initializeGameData();
    const modeData = gameService.getCurrentModeData();
    const milestoneProgress = gameService.getMilestoneProgress();
    const magnifyingGlasses = await gameService.getMagnifyingGlassInventory();
    
    return {
      modeData,
      milestoneProgress,
      magnifyingGlasses,
    };
  }
);

export const switchGameMode = createAsyncThunk(
  'game/switchGameMode',
  async (newMode: GameMode) => {
    const modeData = await gameService.switchGameMode(newMode);
    return { mode: newMode, modeData };
  }
);

export const updateStepsInMode = createAsyncThunk(
  'game/updateStepsInMode',
  async (newSteps: number) => {
    const result = await gameService.updateStepsInMode(newSteps);
    const modeData = gameService.getCurrentModeData();
    const milestoneProgress = gameService.getMilestoneProgress();
    
    return {
      resources: result.resources,
      newMilestones: result.newMilestones,
      modeData,
      milestoneProgress,
    };
  }
);

export const claimMilestoneReward = createAsyncThunk(
  'game/claimMilestoneReward',
  async (threshold: number) => {
    const magnifyingGlass = await gameService.claimMilestoneReward(threshold);
    const milestoneProgress = gameService.getMilestoneProgress();
    const magnifyingGlasses = await gameService.getMagnifyingGlassInventory();
    
    return {
      magnifyingGlass,
      milestoneProgress,
      magnifyingGlasses,
    };
  }
);

export const useMagnifyingGlass = createAsyncThunk(
  'game/useMagnifyingGlass',
  async (tier: string) => {
    const success = await gameService.useMagnifyingGlass(tier as any);
    if (success) {
      const magnifyingGlasses = await gameService.getMagnifyingGlassInventory();
      return { success: true, magnifyingGlasses };
    }
    return { success: false, magnifyingGlasses: [] };
  }
);

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameMode: (state, action: PayloadAction<GameMode>) => {
      state.currentMode = action.payload;
    },
    updateResources: (state, action: PayloadAction<Partial<Resources>>) => {
      state.resources = {...state.resources, ...action.payload};
    },
    addResources: (state, action: PayloadAction<Resources>) => {
      state.resources.cells += action.payload.cells;
      state.resources.experiencePoints += action.payload.experiencePoints;
    },
    addStepling: (state, action: PayloadAction<Stepling>) => {
      state.steplings.push(action.payload);
    },
    updateStepling: (state, action: PayloadAction<Stepling>) => {
      const index = state.steplings.findIndex(s => s.id === action.payload.id);
      if (index !== -1) {
        state.steplings[index] = action.payload;
      }
    },
    setSteplings: (state, action: PayloadAction<Stepling[]>) => {
      state.steplings = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearPendingMilestones: (state) => {
      state.pendingMilestones = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize game data
      .addCase(initializeGameData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeGameData.fulfilled, (state, action) => {
        state.loading = false;
        state.modeData = action.payload.modeData;
        state.milestoneProgress = action.payload.milestoneProgress;
        state.magnifyingGlasses = action.payload.magnifyingGlasses;
        if (state.modeData) {
          state.currentMode = state.modeData.mode;
        }
      })
      .addCase(initializeGameData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to initialize game data';
      })

      // Switch game mode
      .addCase(switchGameMode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(switchGameMode.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMode = action.payload.mode;
        state.modeData = action.payload.modeData;
      })
      .addCase(switchGameMode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to switch game mode';
      })

      // Update steps in mode
      .addCase(updateStepsInMode.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateStepsInMode.fulfilled, (state, action) => {
        state.loading = false;
        
        // Add earned resources
        state.resources.cells += action.payload.resources.cells;
        state.resources.experiencePoints += action.payload.resources.experiencePoints;
        
        // Update mode data and milestone progress
        state.modeData = action.payload.modeData;
        state.milestoneProgress = action.payload.milestoneProgress;
        
        // Add new milestones to pending list for UI notification
        if (action.payload.newMilestones.length > 0) {
          state.pendingMilestones.push(...action.payload.newMilestones);
        }
      })
      .addCase(updateStepsInMode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update steps';
      })

      // Claim milestone reward
      .addCase(claimMilestoneReward.fulfilled, (state, action) => {
        state.milestoneProgress = action.payload.milestoneProgress;
        state.magnifyingGlasses = action.payload.magnifyingGlasses;
      })

      // Use magnifying glass
      .addCase(useMagnifyingGlass.fulfilled, (state, action) => {
        if (action.payload.success) {
          state.magnifyingGlasses = action.payload.magnifyingGlasses;
        }
      });
  },
});

export const {
  setGameMode,
  updateResources,
  addResources,
  addStepling,
  updateStepling,
  setSteplings,
  setLoading,
  setError,
  clearPendingMilestones,
} = gameSlice.actions;

export default gameSlice.reducer;