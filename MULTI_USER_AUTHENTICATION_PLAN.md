# Multi-User Authentication Implementation Plan

## Current State

**Problem**: Single hardcoded user ID in web app
```javascript
// In public/app.js - hardcoded everywhere
playerId: '021cb11f-482a-44d2-b289-110400f23562'
```

**Impact**:
- All users share the same account
- No user isolation
- Can't implement multiplayer features
- Can't have leaderboards
- No personalization

## Solution Overview

Implement a complete authentication system with:
1. **User Registration/Login** - Email/password or Google OAuth
2. **JWT Token Management** - Secure session handling
3. **User Profile System** - Display names, avatars, stats
4. **Session Persistence** - Stay logged in across sessions
5. **Multi-device Support** - Same account on web + mobile

## Implementation Phases

### Phase 1: Backend Authentication (Priority: HIGH)
- ✅ Database already has `players` table
- ✅ Auth controllers/services already exist (need activation)
- ⚠️ Need to wire up routes and middleware
- ⚠️ Need to add JWT secret to environment

### Phase 2: Web App Authentication (Priority: HIGH)
- Add login/register UI
- Store JWT token in localStorage
- Add token to all API requests
- Handle token refresh
- Add logout functionality

### Phase 3: User Profile System (Priority: MEDIUM)
- Display name selection
- Avatar/emoji selection
- Public profile page
- Stats display (total steps, steplings, achievements)

### Phase 4: Leaderboards (Priority: MEDIUM)
- Global step leaderboard
- Achievement leaderboard
- Species discovery leaderboard
- Friend leaderboards

### Phase 5: Multiplayer Features (Priority: LOW)
- Trading system
- PvP battles
- Guilds/teams
- Cooperative events

## Technical Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USER REGISTRATION                                        │
│     ┌──────────────┐                                        │
│     │  Web App     │                                        │
│     │  Register    │                                        │
│     │  Form        │                                        │
│     └──────┬───────┘                                        │
│            │ POST /api/auth/register                        │
│            │ { email, password, displayName }               │
│            ▼                                                 │
│     ┌──────────────────────────────────┐                   │
│     │  Backend                          │                   │
│     │  - Hash password (bcrypt)         │                   │
│     │  - Create player record           │                   │
│     │  - Generate JWT tokens            │                   │
│     │  - Return tokens + user info      │                   │
│     └──────┬───────────────────────────┘                   │
│            │ { accessToken, refreshToken, user }            │
│            ▼                                                 │
│     ┌──────────────┐                                        │
│     │  Web App     │                                        │
│     │  - Store tokens in localStorage                       │
│     │  - Store user info                                    │
│     │  - Redirect to game                                   │
│     └──────────────┘                                        │
│                                                              │
│  2. USER LOGIN                                               │
│     ┌──────────────┐                                        │
│     │  Web App     │                                        │
│     │  Login Form  │                                        │
│     └──────┬───────┘                                        │
│            │ POST /api/auth/login                           │
│            │ { email, password }                            │
│            ▼                                                 │
│     ┌──────────────────────────────────┐                   │
│     │  Backend                          │                   │
│     │  - Verify password                │                   │
│     │  - Generate JWT tokens            │                   │
│     │  - Return tokens + user info      │                   │
│     └──────┬───────────────────────────┘                   │
│            │ { accessToken, refreshToken, user }            │
│            ▼                                                 │
│     ┌──────────────┐                                        │
│     │  Web App     │                                        │
│     │  - Store tokens                                       │
│     │  - Load game state                                    │
│     └──────────────┘                                        │
│                                                              │
│  3. AUTHENTICATED API CALLS                                  │
│     ┌──────────────┐                                        │
│     │  Web App     │                                        │
│     └──────┬───────┘                                        │
│            │ GET /api/steplings                             │
│            │ Authorization: Bearer <accessToken>            │
│            ▼                                                 │
│     ┌──────────────────────────────────┐                   │
│     │  Backend Middleware               │                   │
│     │  - Verify JWT token               │                   │
│     │  - Extract user ID                │                   │
│     │  - Attach to request              │                   │
│     └──────┬───────────────────────────┘                   │
│            │ req.user = { id, email, ... }                  │
│            ▼                                                 │
│     ┌──────────────────────────────────┐                   │
│     │  Controller                       │                   │
│     │  - Use req.user.id for queries    │                   │
│     │  - Return user-specific data      │                   │
│     └──────────────────────────────────┘                   │
│                                                              │
│  4. TOKEN REFRESH                                            │
│     ┌──────────────┐                                        │
│     │  Web App     │                                        │
│     │  (Token expired)                                      │
│     └──────┬───────┘                                        │
│            │ POST /api/auth/refresh                         │
│            │ { refreshToken }                               │
│            ▼                                                 │
│     ┌──────────────────────────────────┐                   │
│     │  Backend                          │                   │
│     │  - Verify refresh token           │                   │
│     │  - Generate new access token      │                   │
│     └──────┬───────────────────────────┘                   │
│            │ { accessToken }                                │
│            ▼                                                 │
│     ┌──────────────┐                                        │
│     │  Web App     │                                        │
│     │  - Update stored token                                │
│     │  - Retry failed request                               │
│     └──────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Updates

### Players Table (Already Exists)
```sql
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(50),
    avatar_emoji VARCHAR(10) DEFAULT '🧪',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);
```

### New: Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE
);
```

### New: Player Stats Table (for leaderboards)
```sql
CREATE TABLE player_stats (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    total_steps BIGINT DEFAULT 0,
    total_steplings INTEGER DEFAULT 0,
    unique_species_discovered INTEGER DEFAULT 0,
    highest_fusion_level INTEGER DEFAULT 1,
    achievements_unlocked INTEGER DEFAULT 0,
    rank_global INTEGER,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Authentication Endpoints

**POST /api/auth/register**
```json
Request:
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "StepMaster"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "StepMaster",
      "avatarEmoji": "🧪"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

**POST /api/auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

**POST /api/auth/refresh**
```json
Request:
{
  "refreshToken": "refresh-token"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-token"
  }
}
```

**POST /api/auth/logout**
```json
Request:
{
  "refreshToken": "refresh-token"
}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### User Profile Endpoints

**GET /api/users/me**
```json
Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "StepMaster",
    "avatarEmoji": "🧪",
    "stats": {
      "totalSteps": 150000,
      "totalSteplings": 12,
      "uniqueSpecies": 4,
      "achievementsUnlocked": 5
    }
  }
}
```

**PUT /api/users/me**
```json
Request:
{
  "displayName": "NewName",
  "avatarEmoji": "🦗"
}

Response:
{
  "success": true,
  "data": { ... }
}
```

**GET /api/users/:id/profile**
```json
Response:
{
  "success": true,
  "data": {
    "displayName": "StepMaster",
    "avatarEmoji": "🧪",
    "stats": { ... },
    "achievements": [...],
    "topSteplings": [...]
  }
}
```

### Leaderboard Endpoints

**GET /api/leaderboards/steps**
```json
Query: ?limit=100&offset=0

Response:
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "playerId": "uuid",
      "displayName": "StepMaster",
      "avatarEmoji": "🧪",
      "totalSteps": 5000000,
      "achievementsUnlocked": 15
    },
    ...
  ]
}
```

**GET /api/leaderboards/achievements**
**GET /api/leaderboards/species**
**GET /api/leaderboards/friends** (requires friend system)

## Web App Changes

### 1. Add Authentication UI

**Login Screen** (`public/auth.html` or modal):
```html
<div id="auth-modal">
  <div class="auth-tabs">
    <button onclick="showLogin()">Login</button>
    <button onclick="showRegister()">Register</button>
  </div>
  
  <div id="login-form">
    <input type="email" id="login-email" placeholder="Email">
    <input type="password" id="login-password" placeholder="Password">
    <button onclick="login()">Login</button>
  </div>
  
  <div id="register-form" style="display:none;">
    <input type="text" id="register-name" placeholder="Display Name">
    <input type="email" id="register-email" placeholder="Email">
    <input type="password" id="register-password" placeholder="Password">
    <button onclick="register()">Register</button>
  </div>
</div>
```

### 2. Update app.js

**Add authentication state:**
```javascript
var auth = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
};

// Load auth from localStorage on init
function loadAuth() {
    const stored = localStorage.getItem('auth');
    if (stored) {
        auth = JSON.parse(stored);
        // Verify token is still valid
        verifyAuth();
    } else {
        showAuthModal();
    }
}

// Save auth to localStorage
function saveAuth() {
    localStorage.setItem('auth', JSON.stringify(auth));
}
```

**Update API calls to include token:**
```javascript
async function apiCall(endpoint, options = {}) {
    if (!auth.accessToken) {
        throw new Error('Not authenticated');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
        ...options.headers
    };
    
    try {
        const response = await fetch(API_BASE + endpoint, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            // Token expired, try refresh
            await refreshToken();
            // Retry request
            return apiCall(endpoint, options);
        }
        
        return response;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}
```

**Replace hardcoded player ID:**
```javascript
// OLD:
playerId: '021cb11f-482a-44d2-b289-110400f23562'

// NEW:
playerId: auth.user.id
```

## Security Considerations

### Password Security
- ✅ Use bcrypt for password hashing (already in backend)
- ✅ Minimum password length: 8 characters
- ✅ Require mix of letters and numbers
- ⚠️ Add rate limiting on login attempts

### Token Security
- ✅ Access tokens expire in 15 minutes
- ✅ Refresh tokens expire in 7 days
- ✅ Store tokens in localStorage (not cookies for web app)
- ✅ Revoke refresh tokens on logout
- ⚠️ Add token rotation on refresh

### API Security
- ✅ HTTPS only (enforced by Render/Vercel)
- ✅ CORS configured for specific domains
- ✅ Rate limiting on auth endpoints
- ⚠️ Add request validation with Joi
- ⚠️ Add SQL injection protection (use parameterized queries)

## Migration Strategy

### For Existing Data
```sql
-- Assign existing steplings to a "legacy" player account
-- Or create individual accounts and let users claim their data
UPDATE steplings 
SET player_id = 'new-player-id'
WHERE player_id = '021cb11f-482a-44d2-b289-110400f23562';
```

### For Existing Users
1. Show migration notice on first visit
2. Prompt to create account
3. Option to "claim" existing progress with verification
4. Or start fresh with new account

## Testing Plan

### Backend Tests
- [ ] User registration
- [ ] User login
- [ ] Token generation
- [ ] Token verification
- [ ] Token refresh
- [ ] Logout (token revocation)
- [ ] Protected endpoint access

### Frontend Tests
- [ ] Login flow
- [ ] Register flow
- [ ] Token storage
- [ ] Token refresh on expiry
- [ ] Logout flow
- [ ] Session persistence

### Integration Tests
- [ ] End-to-end auth flow
- [ ] Multi-device login
- [ ] Concurrent sessions
- [ ] Token expiry handling

## Rollout Plan

### Phase 1: Backend (Week 1)
1. Activate auth routes
2. Add JWT middleware
3. Update all controllers to use req.user.id
4. Add refresh token table
5. Test all endpoints
6. Deploy to Render

### Phase 2: Web App (Week 2)
1. Add auth UI
2. Implement login/register
3. Update all API calls
4. Add token management
5. Test thoroughly
6. Deploy to Vercel

### Phase 3: User Profiles (Week 3)
1. Add profile endpoints
2. Add profile UI
3. Add stats tracking
4. Deploy

### Phase 4: Leaderboards (Week 4)
1. Add leaderboard endpoints
2. Add leaderboard UI
3. Add real-time updates
4. Deploy

## Success Metrics

- [ ] Users can register and login
- [ ] Each user has isolated data
- [ ] Sessions persist across page reloads
- [ ] Tokens refresh automatically
- [ ] No security vulnerabilities
- [ ] Leaderboards show real data
- [ ] Ready for multiplayer features

---

**Next Steps**: 
1. Review and approve this plan
2. Start with Phase 1: Backend Authentication
3. Test thoroughly before moving to Phase 2

**Estimated Timeline**: 4 weeks for full implementation
**Priority**: HIGH - Required for all multiplayer features
