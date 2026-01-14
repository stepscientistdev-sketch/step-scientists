# 🏆 Lifetime Achievement System - Integration Checklist

## Quick Start Integration Guide

Follow these steps to integrate the Lifetime Achievement System into Step Scientists.

---

## 1. Redux Store Setup

### Add Reducer to Store
```typescript
// src/store/index.ts
import lifetimeAchievementReducer from './slices/lifetimeAchievementSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    stepCounter: stepCounterReducer,
    game: gameReducer,
    lifetimeAchievement: lifetimeAchievementReducer, // ADD THIS
    // ... other reducers
  },
});
```

---

## 2. Initialize on App Start

### Load Achievements When Player Logs In
```typescript
// src/components/screens/HomeScreen.tsx or App.tsx
import {fetchAchievements} from '@/store/slices/lifetimeAchievementSlice';

useEffect(() => {
  if (isAuthenticated) {
    dispatch(fetchAchievements());
  }
}, [isAuthenticated]);
```

---

## 3. Update Achievements on Step Changes

### Hook into Step Counter Updates
```typescript
// src/services/stepCounterService.ts or wherever steps are updated
import {updateAchievements} from '@/store/slices/lifetimeAchievementSlice';

// After updating total steps
const newTotalSteps = currentTotalSteps + newSteps;
dispatch(updateAchievements(newTotalSteps));
```

---

## 4. Display Achievement UI

### Add Components to Home Screen
```typescript
// src/components/screens/HomeScreen.tsx
import {AchievementBonuses} from '@/components/AchievementBonuses';
import {AchievementProgress} from '@/components/AchievementProgress';
import {AchievementUnlockModal} from '@/components/AchievementUnlockModal';
import {useSelector} from 'react-redux';

const HomeScreen = () => {
  const achievements = useSelector((state) => state.lifetimeAchievement.achievements);
  const newlyUnlocked = useSelector((state) => state.lifetimeAchievement.newlyUnlocked);
  const totalSteps = useSelector((state) => state.stepCounter.totalSteps);

  return (
    <ScrollView>
      {/* Existing content */}
      
      {achievements && (
        <>
          <AchievementBonuses achievements={achievements} />
          <AchievementProgress totalSteps={totalSteps} />
        </>
      )}

      <AchievementUnlockModal
        visible={newlyUnlocked.length > 0}
        achievements={newlyUnlocked}
        onClose={() => dispatch(clearNewlyUnlocked())}
      />
    </ScrollView>
  );
};
```

---

## 5. Implement Daily Bonus Claim

### Add Daily Reset Logic
```typescript
// src/services/dailyResetService.ts (create if doesn't exist)
import {claimDailyBonus} from '@/store/slices/lifetimeAchievementSlice';
import {addResources} from '@/store/slices/gameSlice';

export const performDailyReset = async (dispatch) => {
  // Claim daily bonus cells
  const result = await dispatch(claimDailyBonus()).unwrap();
  
  if (result && result.claimed && result.bonusCells > 0) {
    // Add bonus cells to player resources
    dispatch(addResources({
      cells: result.bonusCells,
      experiencePoints: 0,
    }));
    
    // Show notification
    Alert.alert(
      '🎁 Daily Bonus!',
      `You received ${result.bonusCells} bonus cells!`,
      [{text: 'Awesome!'}]
    );
  }
};

// Call this at midnight or when app opens after midnight
```

### Schedule Daily Reset
```typescript
// In App.tsx or main component
useEffect(() => {
  const checkDailyReset = () => {
    const lastResetDate = localStorage.getItem('lastDailyReset');
    const today = new Date().toDateString();
    
    if (lastResetDate !== today) {
      performDailyReset(dispatch);
      localStorage.setItem('lastDailyReset', today);
    }
  };
  
  checkDailyReset();
  
  // Check every hour
  const interval = setInterval(checkDailyReset, 60 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## 6. Apply Bonuses to Game Mechanics

### Discovery Mode - Apply Efficiency Bonus
```typescript
// src/services/gameService.ts
const calculateCellsFromSteps = (steps, achievements) => {
  const stepsPerCell = lifetimeAchievementService.getDiscoveryStepsRequired(
    achievements?.discoveryEfficiency || 0
  );
  return Math.floor(steps / stepsPerCell);
};
```

### Training Mode - Apply Efficiency Bonus
```typescript
// src/services/gameService.ts
const calculateXPFromSteps = (steps, achievements) => {
  const stepsPerXP = lifetimeAchievementService.getTrainingStepsRequired(
    achievements?.trainingEfficiency || 0
  );
  return Math.floor(steps / stepsPerXP);
};
```

### Click Power - Apply to Idle Clicks
```typescript
// In discovery/training click handlers
const handleClick = () => {
  const clickPower = achievements?.clickPower || 1;
  const progress = 1 * clickPower;
  // Apply progress...
};
```

### XP Bank Cap - Enforce Limit
```typescript
// When adding XP
const addXP = (amount) => {
  const cap = achievements?.experienceBankCap || 100;
  const newTotal = Math.min(currentXP + amount, cap === Infinity ? Number.MAX_SAFE_INTEGER : cap);
  // Update XP...
};
```

### Roster Slots - Enforce Limit
```typescript
// When checking if can add to roster
const canAddToRoster = () => {
  const maxSlots = achievements?.trainingRosterSlots || 10;
  return currentRosterSize < maxSlots;
};
```

### Release XP Bonus - Apply When Releasing
```typescript
// When releasing a stepling
const releaseSteplingWithBonus = (stepling) => {
  const baseXP = calculateReleaseXP(stepling);
  const bonusMultiplier = 1 + ((achievements?.releaseXpBonus || 0) / 100);
  const totalXP = Math.floor(baseXP * bonusMultiplier);
  return totalXP;
};
```

---

## 7. Testing Checklist

### Manual Testing
- [ ] Achievements load on app start
- [ ] Progress bar updates when steps increase
- [ ] Unlock modal appears when reaching milestone
- [ ] Daily bonus can be claimed once per day
- [ ] Bonuses display correctly in UI
- [ ] Discovery efficiency reduces steps/cell
- [ ] Training efficiency reduces steps/XP
- [ ] Click power multiplies click progress
- [ ] XP bank cap enforces limit
- [ ] Roster slots limit enforced
- [ ] Release XP bonus applies correctly

### Edge Cases
- [ ] Works with 0 steps (new player)
- [ ] Works at 3.5M steps (Ultimate achievement)
- [ ] Works beyond 12.5M steps (infinite progression)
- [ ] Daily bonus doesn't double-claim
- [ ] Achievements persist across sessions
- [ ] Handles offline step sync correctly

---

## 8. Database Migration

### Run Migration on Production
```bash
# Backend
cd backend
npm run migrate

# Verify table created
# Check that lifetime_achievements table exists with correct schema
```

### Initialize Existing Players
```typescript
// One-time script to initialize achievements for existing players
// backend/scripts/initialize-achievements.ts
import {db} from '../src/db';
import {lifetimeAchievementService} from '../src/services/lifetimeAchievementService';

const initializeExistingPlayers = async () => {
  const players = await db('players').select('id', 'step_data');
  
  for (const player of players) {
    const stepData = JSON.parse(player.step_data);
    const totalSteps = stepData.totalSteps || 0;
    
    // Initialize achievements
    await lifetimeAchievementService.initializeForPlayer(player.id);
    
    // Update based on current steps
    await lifetimeAchievementService.updateAchievements(player.id, totalSteps);
    
    console.log(`Initialized achievements for player ${player.id} with ${totalSteps} steps`);
  }
};

initializeExistingPlayers();
```

---

## 9. Optional Enhancements

### Achievement History View
- Create a dedicated screen showing all unlocked achievements
- Display achievement badges/icons
- Show progress toward next milestone

### Social Sharing
- Add share button for major milestones
- Generate shareable achievement images
- Post to social media

### Notifications
- Push notification when achievement unlocked
- Daily reminder to claim bonus cells
- Milestone approaching notifications

---

## 10. Monitoring & Analytics

### Track Achievement Events
```typescript
// Analytics events to track
analytics.logEvent('achievement_unlocked', {
  achievement_name: achievement.name,
  steps_required: achievement.steps,
  player_total_steps: totalSteps,
});

analytics.logEvent('daily_bonus_claimed', {
  bonus_cells: bonusCells,
  player_total_steps: totalSteps,
});
```

### Monitor Balance
- Track average cells/day per player
- Monitor walking vs bonus cell ratio
- Adjust caps if needed based on data

---

## ✅ Integration Complete!

Once all items are checked off, the Lifetime Achievement System will be fully integrated and operational.

For questions or issues, refer to:
- `LIFETIME_ACHIEVEMENTS.md` - Design document
- `LIFETIME_ACHIEVEMENTS_IMPLEMENTATION.md` - Implementation details
- Backend service: `backend/src/services/lifetimeAchievementService.ts`
- Frontend service: `src/services/lifetimeAchievementService.ts`
