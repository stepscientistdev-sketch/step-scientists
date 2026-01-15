# PvE Boss Battle System - Specification Summary

## Overview
This specification defines a turn-based boss battle system where teams of 10 steplings fight against infinitely scaling bosses to earn points and gems.

---

## Quick Reference

### Energy System
- **Max Capacity:** 10 energy
- **Battle Cost:** 1 energy per battle
- **Passive Regen:** 1 energy every 30 minutes
- **Active Regen:** 1 energy per 1,000 steps walked
- **Cap:** Energy stops accumulating at max capacity

### Team Composition
- **10 steplings per team**
- **3-row formation:** Front (3), Middle (3), Back (4)
- Player manually arranges steplings (strategic positioning)

### Boss Tiers & Unlock Conditions

| Tier | Unlock Turn | Starting HP | Starting ATK | Starting SPD | Difficulty |
|------|-------------|-------------|--------------|--------------|------------|
| 1 | Always | 10,000 | 100 | 50 | 1x |
| 2 | Turn 10 | 30,000 | 300 | 150 | 3x |
| 3 | Turn 20 | 90,000 | 900 | 450 | 9x |
| 4 | Turn 30 | 270,000 | 2,700 | 1,350 | 27x |
| 5 | Turn 40 | 810,000 | 8,100 | 4,050 | 81x |

### Boss Scaling (Per Turn)
- HP: +10%
- Attack: +10%
- Speed: +5%

### Combat Flow
1. **Turn Order:** All combatants sorted by Speed (highest first)
2. **Stepling Turn:** Regen → Attack Boss → Lifesteal
3. **Boss Turn:** Target random stepling in frontmost active row → Deal damage
4. **Victory:** Boss HP reaches 0
5. **Defeat:** All steplings dead

### Damage Formulas

**Stepling Damage:**
```
damage = stepling.attack
```

**Boss Damage:**
```
damageReduction = defense / (defense + 100)
finalDamage = bossAttack × (1 - damageReduction)
```

**Regen:**
```
heal = maxHP × (regen% / 100)
```

**Lifesteal:**
```
heal = damageDealt × (lifesteal% / 100)
```

### Scoring & Rewards
- **Score:** Total damage dealt (1 damage = 1 point)
- **Gems:** Score ÷ 100 (100 points = 1 gem)
- **Leaderboards:** Global, Daily, Weekly per tier

---

## Strategic Depth

### Row-Based Targeting
- Boss always attacks **frontmost active row**
- Front row dies → Boss attacks middle row
- Middle row dies → Boss attacks back row
- **Strategy:** Place tanks in front to protect attackers

### Stat Value in Boss Battles

**HP:** Survivability, especially for front row
**Attack:** Direct damage output, determines score
**Defense:** Damage reduction (diminishing returns formula)
**Speed:** Turn frequency, more turns = more damage
**Regen:** Passive healing at turn start
**Lifesteal:** Offensive healing based on damage dealt

### Team Composition Strategies

**Tank Wall:**
- 3 high-defense steplings in front
- 7 high-attack steplings in back
- Maximizes damage while protecting attackers

**Speed Blitz:**
- All high-speed, high-attack steplings
- Attack multiple times before boss acts
- Risky but high damage potential

**Sustain:**
- High regen/lifesteal throughout team
- Survives longer battles
- Lower burst but consistent damage

**Balanced:**
- Mix of tanks, attackers, and sustain
- Adaptable to different situations

---

## Implementation Checklist

### Backend
- [ ] Energy system
  - [ ] Energy tracking in player data
  - [ ] Passive regeneration (30 min timer)
  - [ ] Active regeneration (step-based)
  - [ ] Energy consumption on battle start
  - [ ] Energy validation
- [ ] Battle simulation engine
- [ ] Turn order calculation
- [ ] Damage calculation formulas
- [ ] Boss scaling logic
- [ ] Scoring system
- [ ] Leaderboard system (global/daily/weekly)
- [ ] Gem currency tracking
- [ ] Battle result persistence
- [ ] API endpoints

### Frontend
- [ ] Energy display component
  - [ ] Current/max energy indicator
  - [ ] Time until next passive regen
  - [ ] Steps until next active regen
- [ ] Team selection interface
- [ ] Formation builder (3/3/4 layout)
- [ ] Boss tier selection screen
- [ ] Battle visualization
- [ ] Turn order indicator
- [ ] Battle log display
- [ ] Post-battle results screen
- [ ] Leaderboard display
- [ ] Gem balance display

### Database
- [ ] Add energy columns to `players` table
  - [ ] `energy_current` (0-10)
  - [ ] `energy_max` (default 10)
  - [ ] `energy_last_regen_time`
  - [ ] `energy_last_step_count`
- [ ] `battle_results` table
- [ ] `leaderboards` table
- [ ] `player_boss_progress` table
- [ ] `gem_transactions` table
- [ ] Add `gems` column to `players` table

---

## API Endpoints

```
GET /api/player/energy
  - Get current energy status
  - Returns current, max, time until next regen

POST /api/player/energy/update
  - Update energy based on steps and time
  - Called during step sync
  - Returns updated energy and regen amounts

POST /api/battle/start
  - Initialize battle with team and boss tier
  - Validates and consumes 1 energy
  - Returns battleId and initial state
  - Error: INSUFFICIENT_ENERGY if energy < 1

POST /api/battle/simulate
  - Run server-side battle simulation
  - Returns battle result and rewards

GET /api/battle/leaderboard/:tier/:type
  - Get leaderboard entries
  - Types: global, daily, weekly

GET /api/battle/progress
  - Get player's max tier unlocked and best scores

GET /api/player/gems
  - Get player's gem balance and transaction history
```

---

## Future Enhancements (v2.0+)

### Boss Types
- **Tank Boss:** High HP, low attack
- **Speed Boss:** High speed, high attack, low HP
- **Berserker Boss:** Gains attack as HP decreases

### Boss Abilities
- Special attacks every N turns
- Phase transitions at HP thresholds
- Status effects (poison, stun, etc.)

### Additional Features
- Battle replay system
- Team presets (save formations)
- Guild boss battles (cooperative)
- Seasonal bosses with exclusive rewards
- PvP arena (player vs player)

---

## Balance Notes

### Defense Value Examples
- 100 DEF = 50% damage reduction
- 200 DEF = 67% damage reduction
- 400 DEF = 80% damage reduction
- 900 DEF = 90% damage reduction

### Boss Scaling Examples
- Turn 10: Boss has 2.59x starting stats
- Turn 20: Boss has 6.73x starting stats
- Turn 30: Boss has 17.45x starting stats
- Turn 40: Boss has 45.26x starting stats

### Damage Requirements (Tier 1)
To defeat Tier 1 boss by turn 10:
- Boss HP at turn 10: ~25,900
- Team needs: ~2,590 damage/turn average
- With 10 steplings: ~259 attack/stepling average

---

## Related Documents

- **Full Design:** `PVE_BOSS_BATTLE_SYSTEM.md`
- **Requirements:** `.kiro/specs/step-monsters-game/requirements.md` (Requirement 6)
- **Tasks:** `.kiro/specs/step-monsters-game/tasks.md` (Task 7)
- **Design Details:** `.kiro/specs/step-monsters-game/design.md` (Battle System section)
- **Stat Balance:** `STAT_BALANCE_SYSTEM.md`

---

## Status

**Specification:** ✅ Complete
**Implementation:** ⏳ Not Started

Ready to begin implementation when approved!
