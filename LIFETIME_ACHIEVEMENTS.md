# 🏆 Lifetime Achievement System

## Overview

The Lifetime Achievement system rewards long-term dedication to Step Scientists with permanent upgrades that enhance gameplay without breaking core mechanics. Achievements are based on **total lifetime steps only** (clicks don't count), ensuring fitness remains the primary focus.

---

## Design Philosophy

1. **Fitness First**: Only real steps count toward achievements
2. **Balanced Progression**: Walking always matters, even at high levels
3. **Frequent Rewards**: Something to earn every ~100-600K steps
4. **Infinite Scaling**: No artificial cap on dedication
5. **Meaningful Upgrades**: Each reward improves quality of life

---

## Achievement Tiers

### **Tier 1: Early Journey (10K - 300K steps)**
*~1-30 days for active players (10K steps/day)*

| Steps | Name | Rewards |
|-------|------|---------|
| 10,000 | First Steps | XP Bank +50 (→150) |
| 50,000 | Getting Active | Click power +1 (→2), XP Bank +50 (→200) |
| 100,000 | Dedicated Walker | **+1 cell/day**, Discovery +2% (980/cell), XP Bank +100 (→300) |
| 200,000 | Consistent Mover | Training +5% (9.5/XP), XP Bank +100 (→400) |
| 300,000 | Fitness Enthusiast | Roster +2 (→12), XP Bank +100 (→500) |

---

### **Tier 2: Building Momentum (600K - 2M steps)**
*~2-6 months for active players*

| Steps | Name | Rewards |
|-------|------|---------|
| 600,000 | Marathon Mindset | **+1 cell/day (→2)**, Discovery +2% (960/cell, 4% total), XP Bank +150 (→650) |
| 900,000 | Endurance Expert | Click +1 (→3), Training +5% (9/XP, 10% total), XP Bank +150 (→800) |
| 1,200,000 | Distance Devotee | **+1 cell/day (→3)**, Discovery +2% (940/cell, 6% total), XP Bank +200 (→1,000) |
| 1,800,000 | Fitness Warrior | Roster +2 (→14), Training +5% (8.5/XP, 15% total), XP Bank +500 (→1,500) |

---

### **Tier 3: Mastery Path (2.4M - 3.5M steps)**
*~7-12 months for active players*

| Steps | Name | Rewards |
|-------|------|---------|
| 2,400,000 | Walking Legend | **+1 cell/day (→4)**, Discovery +2% (920/cell, 8% total), Click +1 (→4), XP Bank +500 (→2,000) |
| 3,000,000 | Fitness Master | Training +5% (8/XP, 20% total), Release XP +50%, XP Bank +1,000 (→3,000) |
| 3,500,000 | **Ultimate Step Scientist** 🎉👑 | **+1 cell/day (→5)**, Discovery +12% (800/cell, 20% total), Roster +2 (→16), Click +3 (→7), XP Bank UNLIMITED ♾️ |

---

### **Tier 4: Infinite Progression (4M+ steps)**
*Every 600,000 steps after 3.5M*

**Rewards per milestone:**
- **+1 bonus cell per day** (capped at 10 total at 6.5M steps)
- **+2% discovery efficiency** (capped at 50% total at 12.5M steps)
- **+2% training efficiency** (capped at 50% total at 12.5M steps)

**Key Milestones:**
- **6,500,000 steps** (~21 months): Bonus cells capped at 10/day
- **12,500,000 steps** (~3.5 years): Efficiency capped at 50%
- **13M+ steps**: Bonus cells continue infinitely (no cap!)

---

## Reward Types Explained

### 🎁 Bonus Cells Per Day
- Free cells awarded at daily reset (midnight)
- Stacks with cells earned from walking
- Allows discoveries even on rest days
- **Cap**: 10 cells/day at 6.5M steps

### ⚡ Discovery Efficiency
- Reduces steps required per cell
- Base: 1000 steps = 1 cell
- At 20%: 800 steps = 1 cell
- At 50%: 500 steps = 1 cell (MAX)
- **Cap**: 50% at 12.5M steps

### 💪 Training Efficiency
- Reduces steps required per XP
- Base: 10 steps = 1 XP
- At 20%: 8 steps = 1 XP
- At 50%: 5 steps = 1 XP (MAX)
- **Cap**: 50% at 12.5M steps

### 🖱️ Click Power
- Multiplies idle click progress
- Base: 1 click = 1 progress
- At level 7: 1 click = 7 progress
- Applies to both discovery and training modes
- **Max**: 7x at 3.5M steps

### 🏦 XP Bank Cap
- Maximum XP that can be stored
- Starts at 100 XP
- Grows to UNLIMITED at 3.5M steps
- Prevents XP waste when roster is full

### 👥 Training Roster Slots
- Number of steplings that can train simultaneously
- Starts at 10 slots
- Grows to 16 slots at 3.5M steps
- **Max**: 16 slots

### 💎 Release XP Bonus
- Extra XP when releasing steplings
- Unlocked at 3M steps
- +50% bonus (e.g., 100 XP → 150 XP)
- Helps with late-game progression

---

## Balance Analysis

### At 1 Year (3.5M steps)
- **Bonus cells**: 5/day
- **From 10K steps**: 12.5 cells (with 20% efficiency)
- **Total**: ~17.5 cells/day
- **Balance**: ✅ Walking is primary source (71%)

### At 2 Years (7M steps)
- **Bonus cells**: 11/day
- **From 10K steps**: 17 cells (with 36% efficiency)
- **Total**: ~28 cells/day
- **Balance**: ✅ Walking still significant (61%)

### At 3.5 Years (12.5M steps) - Efficiency Cap
- **Bonus cells**: 20/day
- **From 10K steps**: 20 cells (with 50% efficiency MAX)
- **Total**: 40 cells/day
- **Balance**: ✅ Perfect 50/50 split

### At 5+ Years (18M+ steps)
- **Bonus cells**: 29+/day (continues growing)
- **From 10K steps**: 20 cells (capped at 50% efficiency)
- **Total**: 49+ cells/day
- **Balance**: ⚠️ Bonus growing but walking still matters

---

## Implementation Notes

### Data Structure
```javascript
game.lifetimeAchievements = {
  bonusCellsPerDay: 0,        // 0-10+ (capped at 10 until 6.5M, then infinite)
  discoveryEfficiency: 0,      // 0-50 (percentage)
  trainingEfficiency: 0,       // 0-50 (percentage)
  clickPower: 1,               // 1-7
  experienceBankCap: 100,      // 100-Infinity
  trainingRosterSlots: 10,     // 10-16
  releaseXpBonus: 0,           // 0 or 50 (percentage)
  unlockedAchievements: []     // Array of achievement IDs
};
```

### Calculation Functions
- `calculateLifetimeAchievements(totalSteps)` - Determines current bonuses
- `checkNewAchievements(totalSteps)` - Detects newly unlocked achievements
- `applyDailyBonusCells()` - Awards bonus cells at midnight
- `getDiscoveryStepsRequired()` - Returns steps/cell with efficiency
- `getTrainingStepsRequired()` - Returns steps/XP with efficiency

### Display
- Achievement progress bar showing next milestone
- Current bonuses displayed in stats panel
- Notification popup when achievement unlocked
- Achievement history/badge collection view

---

## Testing Checklist

- [ ] Achievements unlock at correct step thresholds
- [ ] Bonuses apply correctly to gameplay
- [ ] Caps enforce properly (10 cells, 50% efficiency)
- [ ] Daily bonus cells awarded at midnight
- [ ] Infinite scaling works beyond 3.5M steps
- [ ] Achievements persist across sessions
- [ ] Balance maintained (walking always matters)
- [ ] UI displays current bonuses accurately

---

## Future Considerations

- Achievement badges/icons for collection
- Social sharing of major milestones
- Seasonal/event achievements
- Retroactive achievement unlocks for existing players
- Achievement-based leaderboards
