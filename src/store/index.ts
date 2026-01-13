import {configureStore} from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import gameSlice from './slices/gameSlice';
import stepCounterSlice from './slices/stepCounterSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    game: gameSlice,
    stepCounter: stepCounterSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;