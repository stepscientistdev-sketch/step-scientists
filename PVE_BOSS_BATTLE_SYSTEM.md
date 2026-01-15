# PvE Boss Battle System Design

## Overview
A turn-based boss battle system where teams of 10 steplings fight against scaling bosses. Players earn points based on damage dealt, which can be converted to gems for rewards.

---

## Core Mechanics

### Energy System
- **Max Capacity:** 10 energy points
- **Battle Cost:** 1 energy per battle attempt
- **Passive Regeneration:** +1 energy every 30 minutes (automatic)
- **Active Regeneration:** +1 energy per 1,000 steps walked
- **Cap Behavior:** Energy stops accumulating at max capacity (10)
- **Display:** Shows current/max energy, time until next passive regen, steps until next active regen

**Energy Formula:**
```
Passive: +1 energy every 30 minutes
Active: +1 energy per 1,000 steps
Max: 10 energy (cannot exceed)
Cost: 1 energy per battle
```

**Example Scenarios:**
- Player with 0 energy must wait 30 minutes OR walk 1,000 steps to battle again
- Player with 10 energy cannot gain more (capped)
- Walking 5,000 steps = +5 energy (if under cap)
- Waiting 2 hours = +4 energy (if under cap)

### Team Formation
- **10 steplings per team**
- **3 rows formation:**
  - Front row: 3 steplings (positions 1-3)
  - Middle row: 3 steplings (positions 4-6)
  - Back row: 4 steplings (positions 7-10)
- All 10 steplings are active simultaneously
- Strategic positioning: Tanks in front, attackers in back

### Boss Stats
- **HP**: Health points (scales infinitely)
- **Attack**: Damage output (grows 10% per turn)
- **Speed**: Turn order priority (grows 5% per turn)
- Boss stats are independent of player team composition

### Boss Scaling
- **Per Turn Growth:**
  - HP: +10% per turn
  - Attack: +10% per turn
  - Speed: +5% per turn
- Infinite scaling for leaderboard competition
- Starting stats scale with boss tier

---

## Combat System

### Turn Order
- **Speed-based initiative**
- All combatants (10 steplings + 1 boss) sorted by Speed stat
- Highest speed acts first, then next highest, etc.
- Turn order recalculated each round

**Turn Order Algorithm:**
```
combatants = [...steplings, boss]
combatants.sort((a, b) => b.speed - a.speed)
for each combatant in combatants:
    if combatant.hp > 0:
        combatant.takeTurn()
```

### Stepling Attacks
- Stepling attacks boss
- Damage = Stepling Attack stat
- Lifesteal heals stepling for (Damage × Lifesteal%)

### Boss Attacks
- **Row-based targeting:**
  - Boss attacks front row first
  - If front row is dead, attacks middle row
  - If middle row is dead, attacks back row
- **Target selection:** Random alive stepling in active row
- **Damage calculation:** See damage formula below

### Damage Formula

**Boss Damage to Stepling:**
```
baseDamage = Boss.attack
damageReduction = Stepling.defense / (Stepling.defense + 100)
finalDamage = baseDamage × (1 - damageReduction)
```

**Example:**
- Boss Attack: 1,000
- Stepling Defense: 100
- Reduction: 100 / (100 + 100) = 50%
- Final Damage: 1,000 × 0.5 = 500 HP

**Defense Value:**
- 100 DEF = 50% damage reduction
- 200 DEF = 67% damage reduction
- 400 DEF = 80% damage reduction
- 900 DEF = 90% damage reduction

### Sustain Mechanics

**Regen (Start of Turn):**
```
healAmount = Stepling.maxHP × (Stepling.regen / 100)
Stepling.currentHP = min(Stepling.currentHP + healAmount, Stepling.maxHP)
```

**Lifesteal (On Attack):**
```
damageDealt = Stepling.attack
healAmount = damageDealt × (Stepling.lifesteal / 100)
Stepling.currentHP = min(Stepling.currentHP + healAmount, Stepling.maxHP)
```

---

## Boss Tiers

### Tier Progression
- **Unlock Condition:** Survive to specific turn thresholds
- **Difficulty Scaling:** Each tier is 3x harder than previous

| Tier | Unlock Turn | Starting HP | Starting ATK | Starting SPD | Rewards Multiplier |
|------|-------------|-------------|--------------|--------------|-------------------|
| 1 | Always unlocked | 10,000 | 100 | 50 | 1x |
| 2 | Survive Turn 10 | 30,000 | 300 | 150 | 2x |
| 3 | Survive Turn 20 | 90,000 | 900 | 450 | 4x |
| 4 | Survive Turn 30 | 270,000 | 2,700 | 1,350 | 8x |
| 5 | Survive Turn 40 | 810,000 | 8,100 | 4,050 | 16x |

### Boss Types (Future Expansion)

**Tank Boss:**
- High HP (2x normal)
- Low Attack (0.5x normal)
- Tests sustained damage and team endurance

**Speed Boss:**
- Low HP (0.5x normal)
- High Speed (2x normal)
- High Attack (1.5x normal)
- Tests burst damage and speed composition

---

## Scoring & Rewards

### Point Calculation
```
points = totalDamageDealt
```

Simple and straightforward - every 1 HP of damage = 1 point

### Leaderboards
- **Global Leaderboard:** Highest damage dealt per boss tier
- **Daily Leaderboard:** Resets every 24 hours
- **Weekly Leaderboard:** Resets every 7 days

### Rewards (Future - Store System)
- **Gem Conversion:** 100 points = 1 gem
- **Store Items:**
  - Cells (10 gems = 10 cells)
  - Magnifying glasses (50-500 gems by tier)
  - XP potions (instant level ups)
  - Stepling eggs (guaranteed rarity)

---

## Battle Flow

### Pre-Battle
1. Player checks energy (must have at least 1)
2. Player selects 10 steplings
3. Player arranges steplings in 3 rows (3/3/4 formation)
4. Player selects boss tier
5. System validates energy and deducts 1 energy
6. Battle begins

### Battle Loop
```
while (boss.hp > 0 AND anySteplingAlive):
    turn++
    
    // Boss scales
    boss.hp *= 1.10
    boss.attack *= 1.10
    boss.speed *= 1.05
    
    // Calculate turn order
    combatants = sortBySpeed([...steplings, boss])
    
    // Execute turns
    for each combatant in combatants:
        if combatant is stepling:
            // Regen at start of turn
            stepling.hp += stepling.maxHP * (stepling.regen / 100)
            
            // Attack boss
            damage = stepling.attack
            boss.hp -= damage
            totalDamage += damage
            
            // Lifesteal
            stepling.hp += damage * (stepling.lifesteal / 100)
            
        else if combatant is boss:
            // Find target row
            targetRow = getActiveRow(steplings)
            target = randomAlive(targetRow)
            
            // Calculate damage
            reduction = target.defense / (target.defense + 100)
            damage = boss.attack * (1 - reduction)
            target.hp -= damage
            
    // Check victory/defeat
    if boss.hp <= 0:
        victory()
    if allSteplingsDead():
        defeat()
```

### Post-Battle
1. Display final score (total damage dealt)
2. Show turn survived
3. Update leaderboards
4. Award points/gems
5. Show unlock message if new tier unlocked
6. Display energy remaining and time/steps until next energy

---

## Strategic Depth

### Team Composition Strategies

**Tank Wall Strategy:**
- 3 high-defense steplings in front row
- 7 high-attack steplings in back rows
- Maximizes damage while protecting attackers

**Speed Blitz Strategy:**
- All high-speed, high-attack steplings
- Attack multiple times before boss acts
- Risky but high damage potential

**Sustain Strategy:**
- High regen/lifesteal steplings throughout
- Survives longer battles
- Lower burst damage but consistent

**Balanced Strategy:**
- Mix of tanks, attackers, and sustain
- Adaptable to different boss types
- Good for learning

### Stat Value in Boss Battles

**HP:** Survivability, especially for front row
**Attack:** Direct damage output, scales points
**Defense:** Damage reduction, critical for front row
**Speed:** Turn frequency, more attacks = more damage
**Regen:** Passive healing, valuable in long battles
**Lifesteal:** Offensive healing, scales with attack

---

## UI/UX Design

### Battle Screen Layout
```
┌─────────────────────────────────────┐
│  ⚡ Energy: 7/10  Next: 15m 30s     │
│  Boss: [████████░░] 80% HP          │
│  Turn: 15  |  Damage: 125,430       │
├─────────────────────────────────────┤
│                                     │
│         🦅 BOSS 🦅                  │
│      HP: 24,000 / 30,000            │
│                                     │
├─────────────────────────────────────┤
│  Back Row:  🦗 🐢 🦎 🪲            │
│  Mid Row:   🦗 🐢 🦎               │
│  Front Row: 🐢 🐢 🐢               │
├─────────────────────────────────────┤
│  [Speed] Next: 🦎 → 🦅 → 🦗 → ...  │
└─────────────────────────────────────┘
```

### Battle Log
- Show recent actions (last 5 turns)
- Damage numbers
- Deaths/knockouts
- Healing amounts

---

## Technical Implementation

### Data Structures

**Boss:**
```typescript
interface Boss {
  tier: number;
  baseHP: number;
  baseAttack: number;
  baseSpeed: number;
  currentHP: number;
  currentAttack: number;
  currentSpeed: number;
  turn: number;
}
```

**Player Energy:**
```typescript
interface PlayerEnergy {
  current: number; // 0-10
  max: number; // Default 10
  lastRegenTime: Date;
  lastStepCount: number;
}
```

**Battle State:**
```typescript
interface BattleState {
  boss: Boss;
  team: Stepling[]; // 10 steplings
  formation: {
    front: number[]; // indices 0-2
    middle: number[]; // indices 3-5
    back: number[]; // indices 6-9
  };
  turn: number;
  totalDamage: number;
  battleLog: BattleEvent[];
}
```

**Battle Event:**
```typescript
interface BattleEvent {
  turn: number;
  actor: string; // stepling name or "Boss"
  action: 'attack' | 'heal' | 'death';
  target: string;
  value: number; // damage or healing
}
```

### Backend API Endpoints

```
GET /api/player/energy
  Returns: { current: number, max: number, timeUntilNextRegen: number }

POST /api/player/energy/update
  Body: { currentSteps: number }
  Returns: { energy: PlayerEnergy, passiveRegenAmount: number, activeRegenAmount: number }

POST /api/battle/start
  Body: { teamIds: string[], bossTier: number }
  Returns: { battleId: string, initialState: BattleState, energyRemaining: number }
  Errors: { INSUFFICIENT_ENERGY: "Not enough energy to start battle" }

POST /api/battle/simulate
  Body: { battleId: string }
  Returns: { finalState: BattleState, score: number }

GET /api/battle/leaderboard/:tier
  Returns: { rankings: LeaderboardEntry[] }
```

---

## Balance Considerations

### Boss Scaling Math
- Turn 10: Boss has 2.59x starting stats
- Turn 20: Boss has 6.73x starting stats
- Turn 30: Boss has 17.45x starting stats
- Turn 40: Boss has 45.26x starting stats

### Damage Output Requirements
To kill Tier 1 boss by turn 10:
- Boss HP at turn 10: 25,900
- Team needs: 2,590 damage/turn average
- With 10 steplings: 259 attack/stepling average

### Defense Value
Front row steplings need high defense:
- 400 DEF = 80% reduction (boss deals 20% damage)
- Allows 5x more hits before death
- Critical for protecting back row attackers

---

## Future Enhancements

### v2.0 Features
- Multiple boss types with unique mechanics
- Boss abilities (special attacks every N turns)
- Team presets (save formations)
- Battle replay system
- Guild boss battles (cooperative)

### v3.0 Features
- PvP arena (player vs player)
- Tournament system
- Seasonal bosses with exclusive rewards
- Boss raid events (time-limited)

---

## Summary

The PvE Boss Battle system provides:
- Strategic team composition gameplay
- Meaningful use of all 6 stats
- Infinite scaling for competitive players
- Clear progression through boss tiers
- Leaderboard competition
- Future monetization through gem rewards

All stats now have clear value:
- HP/Defense: Survivability
- Attack: Damage output
- Speed: Turn frequency
- Regen/Lifesteal: Sustain

The row-based targeting creates strategic depth in team formation, and the scaling boss ensures endless challenge for endgame players.
