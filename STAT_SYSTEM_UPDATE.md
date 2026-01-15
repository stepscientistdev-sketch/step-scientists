# Stat System Update

## Summary
Updated the stepling stat system to remove "Special" and add three new stats: Speed, Regen, and Lifesteal.

## Changes Made

### 1. Backend Type Definitions
**File:** `backend/src/types/index.ts`

**Old Stats:**
- health
- attack
- defense
- special

**New Stats:**
- hp (renamed from health)
- attack
- defense
- speed
- regen (% of HP, capped at 100%)
- lifesteal (% of attack damage, capped at 100%)

### 2. Stat Growth Rates
**File:** `backend/src/services/steplingService.ts`

**Growth per level:**
- HP, Attack, Defense, Speed: **10% of base stats**
- Regen, Lifesteal: **2% of base stats** (slower growth to avoid hitting 100% cap too quickly)

**Caps:**
- Regen: Maximum 100%
- Lifesteal: Maximum 100%

### 3. Species Base Stats
**File:** `backend/seeds/001_initial_species.js`

Updated all 5 species with new stat values:

**Grasshopper (Common):**
- HP: 100, Attack: 50, Defense: 40, Speed: 30, Regen: 5%, Lifesteal: 3%

**Pebble Turtle (Common):**
- HP: 150, Attack: 30, Defense: 80, Speed: 20, Regen: 8%, Lifesteal: 2%

**Flame Salamander (Uncommon):**
- HP: 200, Attack: 120, Defense: 70, Speed: 90, Regen: 6%, Lifesteal: 8%

**Crystal Beetle (Uncommon):**
- HP: 180, Attack: 90, Defense: 130, Speed: 60, Regen: 7%, Lifesteal: 5%

**Storm Eagle (Rare):**
- HP: 300, Attack: 200, Defense: 150, Speed: 250, Regen: 10%, Lifesteal: 12%

### 4. Database Migration
**File:** `backend/migrations/005_update_stats_structure.js`

- Updates all existing species in database with new stat structure
- Maps old stats to new stats based on species name
- Includes rollback function to revert if needed

### 5. Frontend Display
**Files:** `public/app.js`, `public/index.html`

- Updated stat display to show all 6 stats in a 2x3 grid
- Regen and Lifesteal display as percentages with 1 decimal place
- Backward compatible: supports both old 'health' and new 'hp' format

## Deployment Status

✅ **Backend:** Deployed to Render
- Migration will run automatically on deployment
- All species in database updated with new stats

✅ **Frontend:** Deployed to Vercel
- New stat display live at https://step-scientists.vercel.app

## User Impact

**Existing Steplings:**
- User will release their existing steplings to reset (as discussed)
- New catches will have the updated stat structure

**New Catches:**
- All newly caught steplings will have the 6-stat system
- Stats will grow according to new growth rates

## Testing Checklist

- [x] Backend migration runs successfully
- [x] Species seed data updated
- [x] Stat calculation logic updated
- [x] Frontend displays all 6 stats
- [x] Deployed to production
- [ ] User tests new stat system with fresh catches
- [ ] Verify stat growth on level up
- [ ] Verify fusion preserves new stats

## Notes

- Regen and Lifesteal use 2% growth rate instead of 10% to prevent reaching 100% cap too quickly
- At max level (60 for F6), a stepling with base 10% regen would reach ~22% regen (10 + 59 levels × 0.2)
- This allows for meaningful progression without hitting caps too early
- Speed is independent and scales like other main stats
