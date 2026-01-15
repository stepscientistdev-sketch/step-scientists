# Gmail-Based Authentication Implementation Plan

## Current Status
- Boss battle system fully functional (T1 defeated in 14 turns)
- Data retention issues due to shared `MOBILE_PLAYER_ID`
- All users currently share the same account

## Problem
Users lose data because everyone uses the same hardcoded player ID. Need unique accounts per user.

## Solution
Use Gmail (from Google Fit OAuth) as unique player identifier. No separate login needed.

---

## Implementation Steps

### 1. Backend: Player Creation Endpoint
**File**: `backend/src/server.ts`

Add endpoint to create/fetch player by email:
```typescript
app.post('/api/auth/google-signin', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    // Check if player exists
    let player = await database('players')
      .where('email', email)
      .first();
    
    if (!player) {
      // Create new player
      const playerId = uuidv4();
      await database('players').insert({
        id: playerId,
        username: name || email.split('@')[0],
        email: email,
        password_hash: 'google_oauth', // Not used
        step_data: { total_steps: 0, daily_steps: 0 },
        resources: { cells: 0, experience_points: 0 },
        current_mode: 'discovery',
        gems: 0,
        energy_current: 10,
        energy_max: 10,
        energy_last_regen_time: database.fn.now(),
        energy_last_step_count: 0
      });
      
      player = await database('players').where('id', playerId).first();
    }
    
    res.json({
      success: true,
      player: {
        id: player.id,
        email: player.email,
        username: player.username
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});
```

### 2. Frontend: Extract Email from Google Fit
**File**: `public/app.js`

Modify Google Fit connection to extract email:
```javascript
async function connectGoogleFit() {
    try {
        const authResult = await gapi.auth2.getAuthInstance().signIn({
            scope: 'https://www.googleapis.com/auth/fitness.activity.read'
        });
        
        // Get user profile
        const profile = authResult.getBasicProfile();
        const email = profile.getEmail();
        const name = profile.getName();
        
        // Authenticate with backend
        const response = await fetch(`${API_BASE}/api/auth/google-signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
        });
        
        const data = await response.json();
        
        // Store player ID
        localStorage.setItem('playerId', data.player.id);
        localStorage.setItem('playerEmail', email);
        
        // Update global variable
        PLAYER_ID = data.player.id;
        
        // Now connect to Google Fit
        googleFitConnected = true;
        updateGoogleFitStatus();
        
    } catch (error) {
        alert('Failed to connect: ' + error.message);
    }
}
```

### 3. Frontend: Block Game Until Connected
**File**: `public/app.js`

Add blocking overlay:
```javascript
function checkAuthStatus() {
    const playerId = localStorage.getItem('playerId');
    
    if (!playerId || !googleFitConnected) {
        // Show blocking overlay
        document.getElementById('game-content').style.display = 'none';
        document.getElementById('auth-overlay').style.display = 'flex';
    } else {
        document.getElementById('game-content').style.display = 'block';
        document.getElementById('auth-overlay').style.display = 'none';
    }
}
```

### 4. Frontend: Auth Overlay UI
**File**: `public/index.html`

Add before game content:
```html
<div id="auth-overlay" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); z-index: 9999; flex-direction: column; align-items: center; justify-content: center; color: white;">
    <h1 style="font-size: 48px; margin-bottom: 20px;">🔬 Step Scientists</h1>
    <p style="font-size: 18px; margin-bottom: 40px; text-align: center; max-width: 400px;">
        Connect Google Fit to start your adventure!
    </p>
    <button onclick="connectGoogleFit()" style="padding: 20px 40px; font-size: 20px; background: white; color: #667eea; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
        🔗 Connect Google Fit
    </button>
    <div id="auth-status" style="margin-top: 20px; font-size: 14px; opacity: 0.8;"></div>
</div>

<div id="game-content" style="display: none;">
    <!-- Existing game content here -->
</div>
```

### 5. Replace All MOBILE_PLAYER_ID References
**Files**: `public/app.js`, all API calls

Find and replace:
- `MOBILE_PLAYER_ID` → `PLAYER_ID` (loaded from localStorage)
- Add check: `if (!PLAYER_ID) { checkAuthStatus(); return; }`

### 6. Backend: Update Email Column
**File**: `backend/migrations/001_create_players_table.js`

Email column should be unique:
```javascript
table.string('email', 255).unique().notNullable();
```

---

## Testing Checklist

- [ ] Google Fit connection extracts email
- [ ] Backend creates new player for new email
- [ ] Backend returns existing player for known email
- [ ] Player ID stored in localStorage
- [ ] Game blocked until connected
- [ ] All API calls use correct player ID
- [ ] Data persists across sessions
- [ ] Multiple users can play without conflicts

---

## Migration Strategy

1. Deploy backend with new endpoint
2. Deploy frontend with auth overlay
3. Existing users will need to reconnect Google Fit
4. Old `MOBILE_PLAYER_ID` data can be migrated or archived

---

## Files to Modify

### Backend
- `backend/src/server.ts` - Add auth endpoint
- `backend/migrations/001_create_players_table.js` - Ensure email is unique

### Frontend
- `public/index.html` - Add auth overlay
- `public/app.js` - Extract email, block game, replace player ID references

---

## Next Steps (Next Month)

1. Implement backend auth endpoint
2. Modify Google Fit connection to extract email
3. Add auth overlay UI
4. Replace all MOBILE_PLAYER_ID references
5. Test with multiple Google accounts
6. Deploy and verify data persistence

---

## Current Working State

✅ Boss battle system complete
✅ Energy system working
✅ Gem rewards working
✅ Battle balancing good (14 turns)

🔄 Pending: Gmail authentication for data persistence
