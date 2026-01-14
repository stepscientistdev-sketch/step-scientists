# Authentication Implementation Guide

## Good News! 🎉

The authentication system is **already built** in the backend! We just need to:
1. Configure environment variables
2. Update the web app to use it

## Step 1: Configure Backend (5 minutes)

### Add Environment Variables to Render

1. Go to https://dashboard.render.com
2. Select your web service: `step-scientists-backend`
3. Go to "Environment" tab
4. Add these variables:

```
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-also-32-characters-minimum
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

**Generate secure secrets:**
```bash
# On Windows PowerShell:
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Or use online generator:
# https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")
```

4. Click "Save Changes"
5. Render will automatically redeploy

### Test Auth Endpoints

```bash
# Test registration
curl -X POST https://step-scientists-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# Test login
curl -X POST https://step-scientists-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

## Step 2: Update Web App (2-3 hours)

### A. Add Authentication UI to index.html

Add this modal before the closing `</body>` tag:

```html
<!-- Authentication Modal -->
<div id="auth-modal" class="modal" style="display: none;">
    <div class="modal-content">
        <h2>Welcome to Step Scientists!</h2>
        
        <!-- Tab buttons -->
        <div class="auth-tabs">
            <button id="login-tab" class="tab-btn active" onclick="showAuthTab('login')">Login</button>
            <button id="register-tab" class="tab-btn" onclick="showAuthTab('register')">Register</button>
        </div>
        
        <!-- Login Form -->
        <div id="login-form" class="auth-form">
            <input type="text" id="login-username" placeholder="Username" />
            <input type="password" id="login-password" placeholder="Password" />
            <button class="btn btn-primary" onclick="login()">Login</button>
            <div id="login-error" class="error-message"></div>
        </div>
        
        <!-- Register Form -->
        <div id="register-form" class="auth-form" style="display: none;">
            <input type="text" id="register-username" placeholder="Username (3-30 characters)" />
            <input type="email" id="register-email" placeholder="Email" />
            <input type="password" id="register-password" placeholder="Password (min 6 characters)" />
            <button class="btn btn-primary" onclick="register()">Register</button>
            <div id="register-error" class="error-message"></div>
        </div>
    </div>
</div>

<style>
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.modal-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 30px;
    border-radius: 20px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}

.auth-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.tab-btn {
    flex: 1;
    padding: 10px;
    border: none;
    background: rgba(255,255,255,0.2);
    color: white;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
}

.tab-btn.active {
    background: rgba(255,255,255,0.4);
}

.auth-form input {
    width: 100%;
    padding: 12px;
    margin-bottom: 15px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    box-sizing: border-box;
}

.error-message {
    color: #ff6b6b;
    background: rgba(255,255,255,0.9);
    padding: 10px;
    border-radius: 8px;
    margin-top: 10px;
    display: none;
}

.error-message.show {
    display: block;
}
</style>
```

### B. Update app.js - Add Authentication Logic

Add this at the top of `public/app.js`:

```javascript
// Authentication state
var auth = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null
};

// Load authentication from localStorage
function loadAuth() {
    const stored = localStorage.getItem('stepScientistsAuth');
    if (stored) {
        try {
            auth = JSON.parse(stored);
            log('Loaded saved authentication');
            return true;
        } catch (error) {
            console.error('Failed to load auth:', error);
            localStorage.removeItem('stepScientistsAuth');
        }
    }
    return false;
}

// Save authentication to localStorage
function saveAuth() {
    localStorage.setItem('stepScientistsAuth', JSON.stringify(auth));
}

// Clear authentication
function clearAuth() {
    auth = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null
    };
    localStorage.removeItem('stepScientistsAuth');
}

// Show authentication modal
function showAuthModal() {
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
}

// Hide authentication modal
function hideAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
}

// Switch between login and register tabs
function showAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('register-tab').classList.remove('active');
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('register-form').style.display = 'none';
    } else {
        document.getElementById('login-tab').classList.remove('active');
        document.getElementById('register-tab').classList.add('active');
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
    }
}

// Register new user
async function register() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');
    
    // Validation
    if (!username || username.length < 3) {
        errorEl.textContent = 'Username must be at least 3 characters';
        errorEl.classList.add('show');
        return;
    }
    
    if (!email || !email.includes('@')) {
        errorEl.textContent = 'Please enter a valid email';
        errorEl.classList.add('show');
        return;
    }
    
    if (!password || password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.classList.add('show');
        return;
    }
    
    try {
        log('Registering new user...');
        const response = await fetch(API_BASE + '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Save authentication
            auth.isAuthenticated = true;
            auth.user = result.data.player;
            auth.accessToken = result.data.token;
            auth.refreshToken = result.data.refreshToken;
            saveAuth();
            
            log('✅ Registration successful! Welcome, ' + username + '!');
            hideAuthModal();
            
            // Initialize game
            await init();
        } else {
            errorEl.textContent = result.error?.message || 'Registration failed';
            errorEl.classList.add('show');
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.add('show');
    }
}

// Login existing user
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    if (!username || !password) {
        errorEl.textContent = 'Please enter username and password';
        errorEl.classList.add('show');
        return;
    }
    
    try {
        log('Logging in...');
        const response = await fetch(API_BASE + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Save authentication
            auth.isAuthenticated = true;
            auth.user = result.data.player;
            auth.accessToken = result.data.token;
            auth.refreshToken = result.data.refreshToken;
            saveAuth();
            
            log('✅ Login successful! Welcome back, ' + username + '!');
            hideAuthModal();
            
            // Initialize game
            await init();
        } else {
            errorEl.textContent = result.error?.message || 'Login failed';
            errorEl.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.add('show');
    }
}

// Logout
async function logout() {
    try {
        // Call logout endpoint (optional, for token revocation)
        if (auth.refreshToken) {
            await fetch(API_BASE + '/api/auth/logout', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + auth.accessToken
                },
                body: JSON.stringify({ refreshToken: auth.refreshToken })
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    clearAuth();
    log('Logged out');
    showAuthModal();
}

// Refresh access token
async function refreshAccessToken() {
    if (!auth.refreshToken) {
        throw new Error('No refresh token available');
    }
    
    try {
        const response = await fetch(API_BASE + '/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: auth.refreshToken })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            auth.accessToken = result.data.token;
            if (result.data.refreshToken) {
                auth.refreshToken = result.data.refreshToken;
            }
            saveAuth();
            log('Token refreshed');
            return true;
        } else {
            // Refresh failed, need to login again
            clearAuth();
            showAuthModal();
            return false;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        clearAuth();
        showAuthModal();
        return false;
    }
}

// Make authenticated API call
async function authenticatedFetch(url, options = {}) {
    if (!auth.accessToken) {
        throw new Error('Not authenticated');
    }
    
    // Add authorization header
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + auth.accessToken,
        ...options.headers
    };
    
    try {
        const response = await fetch(url, { ...options, headers });
        
        // If token expired, try to refresh
        if (response.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                // Retry request with new token
                headers.Authorization = 'Bearer ' + auth.accessToken;
                return await fetch(url, { ...options, headers });
            }
        }
        
        return response;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}
```

### C. Update init() function

Replace the init() function:

```javascript
// Initialize
async function init() {
    try {
        // Check authentication first
        if (!loadAuth() || !auth.isAuthenticated) {
            showAuthModal();
            return;
        }
        
        log('Initializing Step Scientists...');
        log('Logged in as: ' + auth.user.username);
        
        log('Step 1: Testing connection...');
        await testConnection();
        
        log('Step 2: Loading game data...');
        loadGame();
        
        log('Step 3: Checking daily reset...');
        checkDailyReset();
        
        log('Step 4: Updating display...');
        updateDisplay();
        
        log('Step 5: Loading species...');
        await loadSpecies();
        
        log('Step 6: Loading steplings...');
        await loadSteplings();
        
        log('Step 7: Checking lifetime achievements...');
        checkNewAchievements();
        
        log('Initialization complete!');
    } catch (error) {
        log('Initialization error: ' + error.message);
        console.error('Init error:', error);
    }
}
```

### D. Replace all hardcoded player IDs

Find and replace in `public/app.js`:

```javascript
// OLD:
playerId: '021cb11f-482a-44d2-b289-110400f23562'

// NEW:
playerId: auth.user.id
```

### E. Update all API calls to use authenticatedFetch

Replace fetch calls with authenticatedFetch:

```javascript
// OLD:
const response = await fetch(API_BASE + '/api/steplings');

// NEW:
const response = await authenticatedFetch(API_BASE + '/api/steplings');
```

### F. Add logout button to UI

In `public/index.html`, add a logout button:

```html
<div class="user-info" style="position: absolute; top: 10px; right: 10px;">
    <span id="username-display"></span>
    <button class="btn btn-secondary" onclick="logout()" style="margin-left: 10px;">Logout</button>
</div>
```

Update display to show username:

```javascript
function updateDisplay() {
    // ... existing code ...
    
    // Update username display
    if (auth.user) {
        document.getElementById('username-display').textContent = '👤 ' + auth.user.username;
    }
}
```

## Step 3: Test Everything

### Test Registration
1. Open https://step-scientists.vercel.app
2. Should see auth modal
3. Click "Register" tab
4. Enter username, email, password
5. Click "Register"
6. Should log in and show game

### Test Login
1. Logout
2. Click "Login" tab
3. Enter credentials
4. Should log in successfully

### Test Session Persistence
1. Refresh page
2. Should stay logged in
3. Should load your steplings

### Test Token Refresh
1. Wait 15 minutes (or modify JWT_EXPIRES_IN to 1m for testing)
2. Make an API call
3. Should automatically refresh token
4. Should continue working

## Step 4: Deploy

```bash
# Commit changes
git add public/
git commit -m "feat: Add multi-user authentication to web app"
git push origin main

# Deploy to Vercel
cd public
vercel --prod
```

## Migration Plan for Existing Data

Since you have existing steplings, you have two options:

### Option 1: Keep as Demo Account
- Leave existing data under the hardcoded ID
- Create a "demo" account that uses that ID
- New users start fresh

### Option 2: Claim System
- Add a "claim code" feature
- Generate a unique code for the existing account
- First user to enter the code gets the data

## Next Steps After Auth

Once authentication is working:

1. **User Profiles** - Add display name, avatar, bio
2. **Leaderboards** - Global rankings by steps, achievements
3. **Friends System** - Add/remove friends, friend leaderboards
4. **Trading** - Trade steplings between users
5. **PvP Battles** - Battle other players' steplings
6. **Guilds** - Create/join guilds, guild events
7. **Chat** - Global and guild chat

## Troubleshooting

### "JWT secrets must be configured"
- Add JWT_SECRET and JWT_REFRESH_SECRET to Render environment variables

### "Invalid credentials"
- Check username/password are correct
- Check backend logs in Render dashboard

### "Token expired" errors
- Token refresh should handle this automatically
- If not working, check refreshAccessToken() function

### Can't see steplings after login
- Check that auth.user.id is being used instead of hardcoded ID
- Check browser console for errors
- Check Network tab for API responses

---

**Estimated Time**: 3-4 hours total
**Priority**: HIGH - Enables all multiplayer features
**Status**: Backend ready, just needs web app integration
