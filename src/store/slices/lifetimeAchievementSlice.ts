import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {LifetimeAchievement, AchievementDefinition} from '@/types';
import {lifetimeAchievementService} from '@/services/lifetimeAchievementService';

interface LifetimeAchievementState {
  achievements: LifetimeAchievement | null;
  loading: boolean;
  error: string | null;
  newlyUnlocked: AchievementDefinition[];
  dailyBonusClaimed: boolean;
}

const initialState: LifetimeAchievementState = {
  achievements: null,
  loading: false,
  error: null,
  newlyUnlocked: [],
  dailyBonusClaimed: false,
};

// Async thunks
export const fetchAchievements = createAsyncThunk(
  'lifetimeAchievement/fetch',
  async () => {
    const achievements = await lifetimeAchievementService.getAchievements();
    return achievements;
  }
);

export const updateAchievements = createAsyncThunk(
  'lifetimeAchievement/update',
  async (totalSteps: number) => {
    const result = await lifetimeAchievementService.updateAchievements(totalSteps);
    return result;
  }
);

export const claimDailyBonus = createAsyncThunk(
  'lifetimeAchievement/claimDaily',
  async () => {
    const result = await lifetimeAchievementService.claimDailyBonus();
    return result;
  }
);

const lifetimeAchievementSlice = createSlice({
  name: 'lifetimeAchievement',
  initialState,
  reducers: {
    clearNewlyUnlocked: (state) => {
      state.newlyUnlocked = [];
    },
    setDailyBonusClaimed: (state, action: PayloadAction<boolean>) => {
      state.dailyBonusClaimed = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch achievements
      .addCase(fetchAchievements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAchievements.fulfilled, (state, action) => {
        state.loading = false;
        state.achievements = action.payload;
      })
      .addCase(fetchAchievements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch achievements';
      })

      // Update achievements
      .addCase(updateAchievements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAchievements.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.achievements = action.payload.updatedBonuses;
          state.newlyUnlocked = action.payload.newAchievements;
        }
      })
      .addCase(updateAchievements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update achievements';
      })

      // Claim daily bonus
      .addCase(claimDailyBonus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(claimDailyBonus.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload && action.payload.claimed) {
          state.dailyBonusClaimed = true;
        }
      })
      .addCase(claimDailyBonus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to claim daily bonus';
      });
  },
});

export const {clearNewlyUnlocked, setDailyBonusClaimed} = lifetimeAchievementSlice.actions;
export default lifetimeAchievementSlice.reducer;
