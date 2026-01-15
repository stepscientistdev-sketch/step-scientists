# Gmail Authentication Testing Guide

## Prerequisites

✅ Frontend deployed to Vercel (DONE)
⚠️ Backend deployed to Render (PENDING - see deployment steps below)

## Deploy Backend First

**CRITICAL:** Backend must be deployed before testing!

1. Go to https://dashboard.render.com
2. Click on "step-scientists-backend" service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 2-5 minutes for build to complete
5. Verify deployment succeeded (check logs)

## Test Scenarios

### Test 1: First-Time User Authentication

**Steps:**
1. Open https://step-scientists.vercel.app in incognito window
2. Should see purple auth overlay with "Connect Google Fit" button
3. Click "Connect Google Fit"
4. Google OAuth popup should appear
5. Select Google account and authorize
6. Should see log messages:
   - "🔐 Authenticating with backend..."
   - "📧 Email: your-email@gmail.com"
   - "✅ Authenticated! Player ID: xxxxxxxx..."
7. Auth overlay should disappear
8. Game should load normally
9. Open browser console (F12)
10. Check localStorage:
    ```javascript
    localStorage.getItem('playerId')  // Should show UUID
    localStorage.getItem('playerEmail')  // Should show your email
    ```

**Expected Result:**
- New player created in database
- Player ID stored in localStorage
- Game loads and works normally

### Test 2: Returning User Authentication

**Steps:**
1. After Test 1, close browser completely
2. Reopen https://step-scientists.vercel.app
3. Should see auth overlay briefly
4. Should auto-hide and show game immediately
5. Check log: "✅ Authenticated as: your-email@gmail.com"
6. Verify game data persists (steplings, gems, etc.)

**Expected Result:**
- No need to reconnect Google Fit
- Player ID loaded from localStorage
- All game data persists

### Test 3: Multiple User Accounts

**Steps:**
1. Open https://step-scientists.vercel.app in incognito window
2. Connect with Google Account A
3. Play game, collect some steplings, earn gems
4. Note player ID from console
5. Close incognito window
6. Open new incognito window
7. Connect with Google Account B (different email)
8. Note player ID from console (should be different)
9. Verify Account B starts fresh (no steplings, no gems)
10. Close and reopen with Account A
11. Verify Account A's data is still there

**Expected Result:**
- Each Google account gets unique player ID
- Data is completely separate between accounts
- No data conflicts or overwrites

### Test 4: Battle System with Auth

**Steps:**
1. Authenticate with Google Fit
2. Collect some steplings (inspect cells)
3. Open Battle section
4. Configure team (1-10 steplings)
5. Start battle
6. Verify battle works normally
7. Check that gems are awarded
8. Close browser and reopen
9. Verify gems persist

**Expected Result:**
- Battle system works with authenticated player ID
- Gems and battle progress persist

### Test 5: Google Fit Sync with Auth

**Steps:**
1. Authenticate with Google Fit
2. Walk some steps (or use Google Fit app to add steps)
3. Click "Sync Steps" in game
4. Verify steps sync correctly
5. Verify cells/XP awarded based on steps
6. Close browser and reopen
7. Verify step count persists

**Expected Result:**
- Steps sync from Google Fit
- Progress persists across sessions

## Debugging

### Check Backend Logs

If authentication fails, check Render logs:
1. Go to https://dashboard.render.com
2. Click on "step-scientists-backend"
3. Click "Logs" tab
4. Look for:
   - `POST /api/auth/google-signin`
   - `✅ Created new player: email@gmail.com`
   - Or `✅ Existing player logged in: email@gmail.com`

### Check Browser Console

Open F12 console and look for:
- `🔐 Authenticating with backend...`
- `📧 Email: your-email@gmail.com`
- `✅ Authenticated! Player ID: xxxxxxxx...`
- Any error messages

### Check localStorage

In browser console:
```javascript
// Check stored values
localStorage.getItem('playerId')
localStorage.getItem('playerEmail')
localStorage.getItem('googleFitToken')

// Clear auth (for testing)
localStorage.removeItem('playerId')
localStorage.removeItem('playerEmail')
location.reload()
```

### Common Issues

**Issue:** "Failed to authenticate: Backend authentication failed"
- **Cause:** Backend not deployed or not responding
- **Fix:** Deploy backend from Render dashboard

**Issue:** Auth overlay shows but button doesn't work
- **Cause:** Google OAuth not loading
- **Fix:** Check internet connection, try different browser

**Issue:** "No access token received"
- **Cause:** User cancelled OAuth or permissions denied
- **Fix:** Try again, make sure to authorize all permissions

**Issue:** Game shows old data after auth
- **Cause:** Browser cache
- **Fix:** Hard refresh (Ctrl+Shift+R) or clear cache

## Success Checklist

After testing, verify:

- [ ] Auth overlay shows on first visit
- [ ] Google Fit connection works
- [ ] Email extracted from OAuth
- [ ] Backend creates/fetches player
- [ ] Player ID stored in localStorage
- [ ] Game loads after auth
- [ ] Data persists across sessions
- [ ] Multiple accounts work independently
- [ ] Battle system works with auth
- [ ] Google Fit sync works with auth
- [ ] No console errors

## Rollback Procedure

If critical issues found:

1. Revert frontend:
   ```bash
   git revert ef7d298
   git push origin main
   cd public
   vercel --prod
   ```

2. Users will return to shared player ID behavior
3. Fix issues and redeploy

---

## Quick Test Commands

```javascript
// In browser console after auth:

// Check auth status
console.log('Player ID:', localStorage.getItem('playerId'));
console.log('Email:', localStorage.getItem('playerEmail'));

// Test getPlayerId function
console.log('Current Player ID:', getPlayerId());

// Clear auth and reload
localStorage.clear();
location.reload();
```
