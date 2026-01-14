# Google Fit Refresh Token - Testing Guide

## What Changed

✅ **Deployed**: Google Fit now uses refresh tokens for persistent authentication

## How It Works Now

### Before (Old Behavior)
- Access token expires after 1 hour
- Had to reconnect every hour
- Silent refresh often failed

### After (New Behavior)
- Access token still expires after 1 hour
- **Refresh token** lasts weeks/months
- Automatically refreshes access token without user interaction
- Only need to reconnect if refresh token expires (rare)

## Testing Steps

### 1. First Connection (Important!)

**You need to reconnect to get the refresh token:**

1. Open https://step-scientists.vercel.app
2. If already connected to Google Fit, **disconnect first**:
   - Click on "✅ Google Fit Connected"
   - This clears old tokens
3. Click "🏥 Tap to connect Google Fit"
4. Grant permissions
5. Check browser console (F12) for:
   ```
   ✅ Refresh token saved - you won't need to reconnect often!
   ```

### 2. Verify Token Storage

Open browser console and check localStorage:

```javascript
// Check what's stored
console.log('Access Token:', localStorage.getItem('googleFitToken'));
console.log('Token Expiry:', localStorage.getItem('googleFitTokenExpiry'));
console.log('Refresh Token:', localStorage.getItem('googleFitRefreshToken'));
```

You should see all three values.

### 3. Test Page Reload

1. Refresh the page (F5)
2. Should see: `✅ Restored Google Fit session`
3. Should NOT need to reconnect
4. Steps should sync automatically

### 4. Test Token Refresh (After 1 Hour)

**Option A: Wait 1 hour**
1. Leave the app open for 1 hour
2. Click "Sync Steps"
3. Should see: `🔄 Refreshing Google Fit token with refresh token...`
4. Then: `✅ Token refreshed successfully!`
5. Steps sync without reconnecting

**Option B: Test immediately (for developers)**
1. Open browser console
2. Manually expire the token:
   ```javascript
   // Set token expiry to past
   localStorage.setItem('googleFitTokenExpiry', '0');
   ```
3. Refresh page
4. Should see automatic refresh using refresh token
5. Should NOT need to reconnect

### 5. Test Long-Term Persistence

1. Close browser completely
2. Come back tomorrow/next week
3. Open https://step-scientists.vercel.app
4. Should auto-connect to Google Fit
5. Should NOT need to reconnect

## Expected Console Messages

### On First Connection
```
Initializing Google Fit service...
✅ Google Fit service initialized successfully!
🔗 Connecting to Google Fit...
✅ Refresh token saved - you won't need to reconnect often!
✅ Successfully connected to Google Fit!
```

### On Page Reload (Token Valid)
```
Initializing Google Fit service...
✅ Restored Google Fit session
✅ Google Fit service initialized successfully!
```

### On Page Reload (Token Expired, Has Refresh Token)
```
Initializing Google Fit service...
🔄 Token expired, attempting refresh...
🔄 Refreshing Google Fit token with refresh token...
✅ Token refreshed successfully!
✅ Token refreshed using refresh token
✅ Google Fit service initialized successfully!
```

### On Sync (Token Expired During Use)
```
📊 Loading step data from Google Fit...
🔄 Token expired, attempting refresh...
🔄 Refreshing Google Fit token with refresh token...
✅ Token refreshed successfully!
📱 Google Fit: 12345 steps today
```

## Troubleshooting

### "No refresh token available"
- You need to disconnect and reconnect
- Refresh tokens are only provided on first authorization
- Clear localStorage and reconnect

### "Token refresh failed"
- Refresh token might be expired (after months)
- Refresh token might be revoked in Google account
- Solution: Disconnect and reconnect

### Still asking to reconnect every hour
- Check if refresh token is saved:
  ```javascript
  console.log(localStorage.getItem('googleFitRefreshToken'));
  ```
- If null, disconnect and reconnect
- Make sure you see "✅ Refresh token saved" message

### Refresh token not being saved
- This is a Google OAuth limitation
- Refresh tokens are only provided on **first** authorization
- If you've connected before, Google won't provide it again
- Solution:
  1. Go to https://myaccount.google.com/permissions
  2. Find "Step Scientists" app
  3. Remove access
  4. Reconnect in the app
  5. Should now get refresh token

## Important Notes

### Refresh Token Lifespan
- Refresh tokens can last **weeks or months**
- They expire if not used for 6 months
- They can be revoked by user in Google account settings

### Security
- Refresh tokens are stored in localStorage
- They're more sensitive than access tokens
- Only works on the same browser/device
- Clearing browser data removes them

### When You'll Need to Reconnect
- After clearing browser data
- After 6 months of inactivity
- If you revoke access in Google account
- If refresh token expires (rare)

## Success Criteria

✅ Connect once, stay connected for weeks
✅ Page reloads don't require reconnection
✅ Token refreshes automatically after 1 hour
✅ No user interaction needed for refresh
✅ Only reconnect if refresh token expires

## Next Steps

Once this is working well, we can:
1. Store refresh tokens in backend (more secure)
2. Associate with user accounts
3. Sync across devices
4. Add token rotation for extra security

---

**Status**: Deployed to production
**URL**: https://step-scientists.vercel.app
**Test Now**: Disconnect and reconnect to get refresh token!
