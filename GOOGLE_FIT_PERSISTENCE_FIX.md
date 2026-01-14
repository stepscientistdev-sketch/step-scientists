# Google Fit Token Persistence - Improvement Plan

## Current Issue

You have to reconnect to Google Fit frequently because:
1. Access tokens expire after 1 hour
2. We're not requesting **refresh tokens** from Google
3. Silent refresh only works if user recently gave consent

## Solution: Request Offline Access

Google OAuth supports **refresh tokens** that last much longer (weeks/months) and can be used to get new access tokens without user interaction.

## Implementation

### Update Google Fit OAuth Request

In `public/app.js`, find the `requestPermission` function and update it:

```javascript
async requestPermission(silent = false) {
    if (!this.initialized) {
        await this.initialize();
    }
    
    const CLIENT_ID = '570511343860-48hgn66bnn5vjdsvb3m62m4qpinbfl9n.apps.googleusercontent.com';
    const SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read';
    
    return new Promise((resolve, reject) => {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            prompt: silent ? '' : 'consent',
            // ADD THESE TWO LINES:
            access_type: 'offline',  // Request refresh token
            include_granted_scopes: true,  // Include previously granted scopes
            callback: (tokenResponse) => {
                if (tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;
                    
                    // Save access token with expiry
                    const expiryTime = Date.now() + (3600 * 1000); // 1 hour
                    localStorage.setItem('googleFitToken', tokenResponse.access_token);
                    localStorage.setItem('googleFitTokenExpiry', expiryTime.toString());
                    
                    // ADD: Save refresh token if provided
                    if (tokenResponse.refresh_token) {
                        localStorage.setItem('googleFitRefreshToken', tokenResponse.refresh_token);
                        log('✅ Refresh token saved - you won\'t need to reconnect often!');
                    }
                    
                    if (!silent) {
                        log('✅ Successfully connected to Google Fit!');
                    }
                    updateGoogleFitStatus(true);
                    resolve(true);
                } else {
                    if (silent) {
                        resolve(false);
                    } else {
                        reject(new Error('No access token received'));
                    }
                }
            },
            error_callback: (error) => {
                if (silent) {
                    resolve(false);
                } else {
                    log('❌ Failed to connect to Google Fit: ' + error.error);
                    updateGoogleFitStatus(false);
                    reject(error);
                }
            }
        });
        
        tokenClient.requestAccessToken({ 
            prompt: silent ? '' : 'consent',
            // ADD: Request offline access
            access_type: 'offline'
        });
    });
}
```

### Add Refresh Token Function

Add this new function to handle token refresh using the refresh token:

```javascript
async refreshWithRefreshToken() {
    const refreshToken = localStorage.getItem('googleFitRefreshToken');
    if (!refreshToken) {
        log('No refresh token available');
        return false;
    }
    
    try {
        log('🔄 Refreshing Google Fit token...');
        
        // Use Google's token endpoint to refresh
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: '570511343860-48hgn66bnn5vjdsvb3m62m4qpinbfl9n.apps.googleusercontent.com',
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Save new access token
            this.accessToken = data.access_token;
            const expiryTime = Date.now() + (data.expires_in * 1000);
            localStorage.setItem('googleFitToken', data.access_token);
            localStorage.setItem('googleFitTokenExpiry', expiryTime.toString());
            
            log('✅ Token refreshed successfully!');
            updateGoogleFitStatus(true);
            return true;
        } else {
            log('❌ Token refresh failed');
            // Refresh token might be expired, remove it
            localStorage.removeItem('googleFitRefreshToken');
            return false;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}
```

### Update Token Restoration Logic

Update the `initialize` function to try refresh token first:

```javascript
async initialize() {
    // ... existing code ...
    
    // Try to restore saved token
    const savedToken = localStorage.getItem('googleFitToken');
    const tokenExpiry = localStorage.getItem('googleFitTokenExpiry');
    const refreshToken = localStorage.getItem('googleFitRefreshToken');
    
    if (savedToken && tokenExpiry) {
        const now = Date.now();
        const expiry = parseInt(tokenExpiry);
        
        if (now < expiry) {
            // Token is still valid
            this.accessToken = savedToken;
            log('✅ Restored Google Fit session');
            updateGoogleFitStatus(true);
            
            // If token expires in less than 5 minutes, refresh it
            if (expiry - now < 5 * 60 * 1000) {
                log('🔄 Token expiring soon, refreshing...');
                // Try refresh token first
                if (refreshToken) {
                    await this.refreshWithRefreshToken();
                } else {
                    // Fall back to silent refresh
                    this.requestPermission(true).catch(() => {
                        log('Silent refresh failed, will need manual reconnect');
                    });
                }
            }
            
            return true;
        } else {
            // Token expired
            localStorage.removeItem('googleFitToken');
            localStorage.removeItem('googleFitTokenExpiry');
            log('🔄 Token expired, attempting refresh...');
            
            // Try refresh token first
            if (refreshToken) {
                const refreshed = await this.refreshWithRefreshToken();
                if (refreshed) {
                    log('✅ Token refreshed using refresh token');
                    return true;
                }
            }
            
            // Fall back to silent refresh
            try {
                const refreshed = await this.requestPermission(true);
                if (refreshed) {
                    log('✅ Token refreshed silently');
                    return true;
                } else {
                    log('Silent refresh failed, please reconnect manually');
                }
            } catch (error) {
                log('Silent refresh error: ' + error.message);
            }
        }
    }
    
    return true;
}
```

### Update getCurrentSteps Error Handling

Update the error handling in `getCurrentSteps` to try refresh token:

```javascript
async getCurrentSteps() {
    if (!this.accessToken) {
        throw new Error('Not authorized - please connect to Google Fit first');
    }
    
    // ... existing request code ...
    
    try {
        const response = await window.gapi.client.request({
            // ... existing request ...
        });
        
        // ... existing response handling ...
        
    } catch (error) {
        // If token is invalid, try refresh
        if (error.status === 401 || error.status === 403) {
            log('🔄 Token expired, attempting refresh...');
            this.accessToken = null;
            localStorage.removeItem('googleFitToken');
            localStorage.removeItem('googleFitTokenExpiry');
            
            // Try refresh token first
            const refreshToken = localStorage.getItem('googleFitRefreshToken');
            if (refreshToken) {
                const refreshed = await this.refreshWithRefreshToken();
                if (refreshed) {
                    // Retry the request with new token
                    return await this.getCurrentSteps();
                }
            }
            
            // Fall back to silent refresh
            try {
                const refreshed = await this.requestPermission(true);
                if (refreshed) {
                    return await this.getCurrentSteps();
                } else {
                    updateGoogleFitStatus(false);
                    throw new Error('Google Fit session expired - please reconnect');
                }
            } catch (refreshError) {
                updateGoogleFitStatus(false);
                throw new Error('Google Fit session expired - please reconnect');
            }
        }
        throw error;
    }
}
```

### Update Disconnect Function

Update disconnect to also remove refresh token:

```javascript
disconnect() {
    this.accessToken = null;
    localStorage.removeItem('googleFitToken');
    localStorage.removeItem('googleFitTokenExpiry');
    localStorage.removeItem('googleFitRefreshToken');  // ADD THIS LINE
    updateGoogleFitStatus(false);
    log('🔌 Disconnected from Google Fit');
}
```

## Important Notes

### First-Time Connection
The first time a user connects after this update, they'll need to:
1. Disconnect from Google Fit (if currently connected)
2. Reconnect to grant offline access
3. This will provide a refresh token

### Refresh Token Lifespan
- Refresh tokens can last **weeks or months**
- They can be revoked by the user in Google account settings
- They expire if not used for 6 months

### Security
- Refresh tokens are more sensitive than access tokens
- They're stored in localStorage (same as access tokens)
- For production, consider additional security measures

## Alternative: Backend Token Storage

For even better security and persistence, you could:

1. Store refresh tokens in your backend database
2. Associate them with user accounts
3. Backend handles token refresh
4. Frontend just requests fresh tokens from your backend

This would require:
- User authentication (which you're implementing!)
- Backend endpoint to manage Google Fit tokens
- More complex but more secure

## Testing

After implementing:

1. **First Connection**:
   - Connect to Google Fit
   - Check localStorage for `googleFitRefreshToken`
   - Should see: "✅ Refresh token saved"

2. **Page Reload**:
   - Refresh page
   - Should auto-connect without prompting
   - Check console: "✅ Restored Google Fit session"

3. **After 1 Hour**:
   - Wait for access token to expire
   - Make a step sync
   - Should auto-refresh using refresh token
   - Check console: "✅ Token refreshed using refresh token"

4. **After Weeks**:
   - Come back after a long time
   - Should still auto-connect
   - Only need to reconnect if refresh token expired (rare)

## Expected Improvement

**Before**: Reconnect every 1 hour
**After**: Reconnect every few weeks/months (or never if you use the app regularly)

---

**Implementation Time**: 30 minutes
**Testing Time**: 15 minutes
**Impact**: Significantly better user experience
