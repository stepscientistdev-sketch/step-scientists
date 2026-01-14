# Database Access Guide

## Current Database Contents

### Species Available (5 total)
From seed data in `backend/seeds/001_initial_species.js`:

1. **Grasshopper** 🦗 (Common)
   - Base Stats: HP 20, ATK 15, DEF 10, SPE 5
   
2. **Pebble Turtle** 🐢 (Common)
   - Base Stats: HP 30, ATK 8, DEF 20, SPE 2
   
3. **Butterfly** 🦋 (Uncommon)
   - Base Stats: HP 15, ATK 12, DEF 8, SPE 15
   
4. **Beetle** 🪲 (Rare)
   - Base Stats: HP 25, ATK 18, DEF 15, SPE 8
   
5. **Dragonfly** 🐉 (Epic)
   - Base Stats: HP 22, ATK 20, DEF 12, SPE 18

### Current Steplings (8 total)

**Grasshoppers (4):**
- Level 5, F1 (HP 28, ATK 23, DEF 14, SPE 9) - ID: 168435a5
- Level 5, F1 (HP 28, ATK 23, DEF 14, SPE 9) - ID: fe00761d
- Level 2, F1 (HP 22, ATK 17, DEF 11, SPE 6) - ID: 8f265d68
- Level 1, F1 (HP 20, ATK 15, DEF 10, SPE 5) - ID: 53e77001

**Pebble Turtles (4):**
- Level 1, F1 (HP 30, ATK 8, DEF 20, SPE 2) - ID: c07e5e82
- Level 1, F1 (HP 30, ATK 8, DEF 20, SPE 2) - ID: 1c16c42b
- Level 1, F1 (HP 30, ATK 8, DEF 20, SPE 2) - ID: 65f9c2e6
- Level 1, F1 (HP 30, ATK 8, DEF 20, SPE 2) - ID: a6b28530

---

## How to Access the Database

### Method 1: Via API (Recommended)

**Get all species:**
```bash
curl https://step-scientists-backend.onrender.com/api/species/all
```

**Get all steplings:**
```bash
curl https://step-scientists-backend.onrender.com/api/steplings
```

**Get specific stepling:**
```bash
curl https://step-scientists-backend.onrender.com/api/steplings/168435a5-9c57-4cc3-b9e0-aefc4b337c22
```

### Method 2: Via Render Dashboard (Direct Database Access)

1. Go to https://dashboard.render.com
2. Select your PostgreSQL database
3. Click "Connect" → "External Connection"
4. Use the connection string with a PostgreSQL client

**Or use the built-in Shell:**
1. Go to your database in Render dashboard
2. Click "Shell" tab
3. Run SQL queries directly:

```sql
-- View all species
SELECT * FROM species;

-- View all steplings with species info
SELECT 
    s.id,
    s.level,
    s.fusion_level,
    s.current_stats,
    sp.name,
    sp.emoji,
    sp.rarity
FROM steplings s
JOIN species sp ON s.species_id = sp.id
ORDER BY sp.name, s.level DESC;

-- Count steplings by species
SELECT 
    sp.name,
    sp.emoji,
    COUNT(*) as count
FROM steplings s
JOIN species sp ON s.species_id = sp.id
GROUP BY sp.name, sp.emoji;
```

### Method 3: Via Web App Debug

In the web app (https://step-scientists.vercel.app):
1. Open browser console (F12)
2. Click "View Steplings"
3. Click "Debug" button
4. Check console for detailed stepling data

Or run in console:
```javascript
await debugSteplings();
```

### Method 4: Via Backend Script

Create a query script in `backend/`:

```javascript
// backend/query-steplings.js
const knex = require('knex');
const knexConfig = require('./knexfile');

const db = knex(knexConfig.production);

async function querySteplings() {
    const steplings = await db('steplings')
        .join('species', 'steplings.species_id', 'species.id')
        .select(
            'steplings.*',
            'species.name',
            'species.emoji',
            'species.rarity'
        );
    
    console.log(JSON.stringify(steplings, null, 2));
    await db.destroy();
}

querySteplings();
```

Run with:
```bash
cd backend
node query-steplings.js
```

---

## Useful Database Queries

### Species Information

```sql
-- All species with discovery rates
SELECT 
    name,
    emoji,
    rarity,
    base_stats
FROM species
ORDER BY 
    CASE rarity
        WHEN 'common' THEN 1
        WHEN 'uncommon' THEN 2
        WHEN 'rare' THEN 3
        WHEN 'epic' THEN 4
        WHEN 'legendary' THEN 5
    END;
```

### Stepling Statistics

```sql
-- Average level by species
SELECT 
    sp.name,
    AVG(s.level) as avg_level,
    MAX(s.level) as max_level,
    COUNT(*) as total_count
FROM steplings s
JOIN species sp ON s.species_id = sp.id
GROUP BY sp.name;

-- Highest level steplings
SELECT 
    sp.name,
    sp.emoji,
    s.level,
    s.fusion_level,
    s.current_stats
FROM steplings s
JOIN species sp ON s.species_id = sp.id
ORDER BY s.level DESC, s.fusion_level DESC
LIMIT 10;

-- Fusion candidates (same species, same fusion level, max level)
SELECT 
    sp.name,
    s.fusion_level,
    COUNT(*) as count,
    s.fusion_level * 10 as max_level
FROM steplings s
JOIN species sp ON s.species_id = sp.id
WHERE s.level >= s.fusion_level * 10
GROUP BY sp.name, s.fusion_level
HAVING COUNT(*) >= 2;
```

### Player Statistics

```sql
-- Total steplings per player
SELECT 
    player_id,
    COUNT(*) as total_steplings,
    COUNT(DISTINCT species_id) as unique_species
FROM steplings
GROUP BY player_id;

-- Lifetime achievements
SELECT 
    player_id,
    total_steps,
    unlocked_achievements,
    current_bonuses
FROM lifetime_achievements;
```

---

## Database Schema

### Tables

1. **players**
   - id (UUID, primary key)
   - username
   - email
   - created_at
   - updated_at

2. **species**
   - id (UUID, primary key)
   - name
   - emoji
   - rarity (common, uncommon, rare, epic, legendary)
   - base_stats (JSONB: health, attack, defense, special)
   - created_at

3. **steplings**
   - id (UUID, primary key)
   - player_id (FK to players)
   - species_id (FK to species)
   - level (1-10 per fusion level)
   - fusion_level (1+)
   - current_stats (JSONB: health, attack, defense, special)
   - has_suboptimal_fusion (boolean)
   - created_at
   - updated_at

4. **lifetime_achievements**
   - id (UUID, primary key)
   - player_id (FK to players)
   - total_steps (bigint)
   - unlocked_achievements (JSONB array)
   - current_bonuses (JSONB)
   - last_synced_at
   - created_at
   - updated_at

---

## Quick Stats Summary

**Current State:**
- ✅ 5 species seeded
- ✅ 8 steplings created
- ✅ 2 species discovered (Grasshopper, Pebble Turtle)
- ✅ 3 species undiscovered (Butterfly, Beetle, Dragonfly)
- ✅ Highest level: Level 5 Grasshoppers (2x)
- ✅ Fusion ready: 2x Level 5 Grasshoppers can fuse to F2

**Potential Actions:**
1. Fuse the two Level 5 Grasshoppers → Create F2 Grasshopper
2. Level up the Level 2 Grasshopper to 10 → Fusion ready
3. Discover more species (Butterfly, Beetle, Dragonfly)
4. Train the Pebble Turtles

---

## Connection Strings

### Production (Render)
Available in Render dashboard under "Connect" → "External Connection"

Format:
```
postgresql://[user]:[password]@[host]/[database]?ssl=true
```

### Local Development
```
postgresql://postgres:your_password@localhost:5432/step_scientists
```

---

**Last Updated**: January 14, 2025
