# Stat Balance System

## Overview
This document defines the complete stat balance system for Step Scientists, including rarity multipliers, stat ranges, and design philosophy.

---

## Rarity System

### Catch Rates
- **Common**: 100% (1 in 1 attempt)
- **Uncommon**: 1% (1 in 100 attempts)
- **Rare**: 0.01% (1 in 10,000 attempts)
- **Epic**: 0.000001% (1 in 100,000,000 attempts)
- **Legendary**: 0.00000001% (1 in 10,000,000,000 attempts)

### Stat Multipliers
- **Common**: 1x (baseline)
- **Uncommon**: 15x
- **Rare**: 50x
- **Epic**: 150x
- **Legendary**: 500x

### Release XP Multipliers
- **Common**: 1x
- **Uncommon**: 100x (matches 100x rarity)
- **Rare**: 10,000x (matches 10,000x rarity)
- **Epic**: 100,000,000x (matches rarity)
- **Legendary**: 10,000,000,000x (matches rarity)

---

## Stat Types

### Main Stats (Scale Linearly)
**HP (Health Points)**
- Survivability stat
- Common range: 100-150
- Growth: 10% of base per level

**Attack**
- Damage output stat
- Common range: 30-50
- Growth: 10% of base per level

**Defense**
- Damage reduction stat
- Common range: 40-80
- Growth: 10% of base per level

**Speed**
- Turn order / evasion stat
- Common range: 20-30
- Growth: 10% of base per level

### Percentage Stats (Scale Slowly, Capped at 100%)
**Regen (% of HP regenerated per turn)**
- Extremely valuable for sustain
- Common range: 2-3%
- Growth: 2% of base per level (slower than main stats)
- Hard cap: 100%
- Design note: 10% regen = heal 10% of max HP every turn (very powerful!)

**Lifesteal (% of damage dealt returned as HP)**
- Extremely valuable for offensive sustain
- Common range: 0.5-1%
- Growth: 2% of base per level (slower than main stats)
- Hard cap: 100%
- Design note: 5% lifesteal = heal 5% of all damage dealt (very powerful!)

---

## Current Species Stats

### Common Tier

**🦗 Grasshopper** (Balanced Attacker)
- HP: 100
- Attack: 50
- Defense: 40
- Speed: 30
- Regen: 2%
- Lifesteal: 1%
- Archetype: Balanced starter with decent offense

**🐢 Pebble Turtle** (Tank)
- HP: 150
- Attack: 30
- Defense: 80
- Speed: 20
- Regen: 3%
- Lifesteal: 0.5%
- Archetype: High HP/Defense tank with best regen

### Uncommon Tier (15x Common)

**🦎 Flame Salamander** (Glass Cannon)
- HP: 1,500 (15x)
- Attack: 750 (15x)
- Defense: 600 (15x)
- Speed: 450 (15x)
- Regen: 1.5%
- Lifesteal: 2.5%
- Archetype: High damage with offensive sustain through lifesteal

**🪲 Crystal Beetle** (Defensive Bruiser)
- HP: 1,350 (15x)
- Attack: 450 (15x)
- Defense: 1,200 (15x)
- Speed: 300 (15x)
- Regen: 2%
- Lifesteal: 1.5%
- Archetype: Highest defense with balanced sustain

### Rare Tier (50x Common)

**🦅 Storm Eagle** (Legendary All-Rounder)
- HP: 15,000 (50x)
- Attack: 10,000 (50x)
- Defense: 7,500 (50x)
- Speed: 12,500 (50x)
- Regen: 3%
- Lifesteal: 3%
- Archetype: Dominates in all stats with high sustain

---

## Fusion Mechanics

### Fusion Formula
1. Both parents must be same species and fusion level
2. Average the current stats of both parents
3. Add 10% of that average as bonus to base stats
4. New stepling starts at Level 1 with enhanced base stats
5. Fusion level increases by 1

### Max Level Formula
- Max Level = Fusion Level × 10
- F1 max = 10, F2 max = 20, F3 max = 30, etc.

### Fusion Progression to Match Higher Rarities

**To match Uncommon (15x):**
- Need F6L60 Common (64 commons required)
- Grasshopper F6L60 ≈ 2,800 HP ≈ Salamander F1L10

**To match Rare (50x):**
- Need F9L90 or F10L50 Common (512-1,024 commons required)
- Grasshopper F9L90 ≈ 23,000 HP ≈ Storm Eagle F1L10

**Conclusion:** Fusion farming is possible but catching higher rarities is much more efficient.

---

## Stat Growth Per Level

### Main Stats
- Growth = Base Stat × 0.10 (10% per level)
- Example: Grasshopper with 100 base HP gains +10 HP per level

### Percentage Stats (Regen/Lifesteal)
- Growth = Base Stat × 0.02 (2% per level)
- Example: Grasshopper with 2% base regen gains +0.04% regen per level
- At F1L10: 2% + (9 × 0.04%) = 2.36% regen
- At F6L60: ~4-5% regen (still reasonable, not broken)

### Why Slower Growth for Percentage Stats?
- 10% growth would cause percentage stats to hit 100% cap too quickly
- 2% growth allows meaningful progression without breaking balance
- Keeps percentage stats valuable throughout the game

---

## Balance Philosophy

### Rarity vs Fusion Farming
- Higher rarities should be significantly stronger to justify their rarity
- Fusion farming should be viable but require massive effort
- Catching a rare should feel rewarding and save enormous grinding time

### Percentage Stat Balance
- Regen and Lifesteal are multiplicatively powerful
- Small increases (1-2%) have huge impact on survivability
- Must scale slower than main stats to avoid breaking endgame
- Cap at 100% to prevent infinite sustain

### Release XP Balance
- Release XP multipliers match actual catch rarity
- Releasing a rare gives 10,000x XP (matches 10,000x rarity)
- This makes rare catches valuable even if you don't want to use them
- Encourages diverse gameplay (catch for XP vs catch for power)

---

## Future Considerations

### Adding New Species
When adding new species, follow these guidelines:

**Stat Allocation:**
- Total stat budget = (HP + ATK + DEF + SPD) should be consistent within rarity
- Common total: ~220-260 points
- Uncommon total: ~3,300-3,900 points (15x)
- Rare total: ~11,000-13,000 points (50x)

**Percentage Stats:**
- Regen: 0.5-3% for commons, scale proportionally
- Lifesteal: 0.5-3% for commons, scale proportionally
- Never exceed 5% base for any species (would hit cap too fast)

**Archetypes:**
- Tank: High HP/DEF, low ATK/SPD, high Regen
- Glass Cannon: High ATK/SPD, low HP/DEF, high Lifesteal
- Balanced: Even distribution across all stats
- Speedster: Very high SPD, moderate other stats
- Sustain: Moderate stats with high Regen + Lifesteal

---

## Migration Notes

### Updating Existing Species
- Migration `005_update_stats_structure.js` handles conversion
- Old stats are mapped to new stat structure
- Existing steplings in database will be updated
- Players should release and recatch for fresh stats

### Testing Checklist
- [ ] Verify all species have correct stat multipliers
- [ ] Test fusion stat calculation with new stats
- [ ] Verify percentage stats cap at 100%
- [ ] Test release XP matches rarity multipliers
- [ ] Confirm level-up stat growth is correct
- [ ] Test fusion progression matches balance targets

---

## Version History

**v2.0 - Rarity Balance Update**
- Implemented 15x/50x/150x/500x multiplier system
- Reduced regen/lifesteal base values (2-3% range)
- Implemented 2% growth rate for percentage stats
- Updated release XP to match actual rarity
- Documented complete balance system

**v1.0 - Initial Stat System**
- Basic 4-stat system (health, attack, defense, special)
- 2x multiplier for uncommons (unbalanced)
- 10x release XP (didn't match rarity)
