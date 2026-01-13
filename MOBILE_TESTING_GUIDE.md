# Mobile Testing Guide - Step Monsters Core Features

## Overview
This guide outlines testing the core game features on real mobile devices before continuing development.

## Pre-Testing Setup

### 1. Build and Deploy
```bash
# Build the React Native app
npx react-native run-android

# Start the backend server
cd backend
npm run dev

# Ensure database is running
# Update API URLs in src/services/apiClient.ts for your network IP
```

### 2. Network Configuration
- Update `baseURL` in `src/services/apiClient.ts` to your computer's IP address
- Ensure mobile device and development machine are on same network
- Test API connectivity from mobile browser first

## Core Feature Testing Checklist

### Step Tracking & Google Fit Integration
- [ ] App requests Google Fit permissions on first launch
- [ ] Step count updates when walking (test with 50-100 steps)
- [ ] Step data persists when app is backgrounded
- [ ] Step count syncs correctly after app restart
- [ ] Offline step accumulation works (test with airplane mode)
- [ ] 7-day offline limit is enforced

### Game Mode System
- [ ] Can switch between Discovery and Training modes
- [ ] Mode confirmation dialog appears
- [ ] Step-to-resource conversion works correctly:
  - Discovery: 1000 steps = 1 cell
  - Training: 10 steps = 1 experience point
- [ ] Mode switching resets step counter for new mode
- [ ] Previous mode steps are preserved

### Species Discovery
- [ ] Cell inspection creates new steplings
- [ ] Rarity system works (common species appear most frequently)
- [ ] Magnifying glasses improve discovery rates
- [ ] Species data loads and displays correctly
- [ ] Discovery statistics update properly

### Stepling Management
- [ ] Stepling collection displays all discovered steplings
- [ ] Can view individual stepling details
- [ ] Level-up system works with experience points
- [ ] Fusion system combines same-species steplings
- [ ] Training roster can be set and modified
- [ ] Experience distributes to training roster in Training Mode

### Milestone System
- [ ] Milestone progress tracks total steps correctly
- [ ] Magnifying glasses awarded at 5K, 10K, 50K, 100K steps
- [ ] Milestone rewards can be claimed
- [ ] Magnifying glass inventory persists

### Data Persistence & Sync
- [ ] Game state persists between app sessions
- [ ] Data syncs with server when online
- [ ] Offline changes sync when connection restored
- [ ] No data loss during network interruptions

## Real-World Usage Tests

### Daily Usage Simulation
1. **Morning Setup** (5 minutes)
   - Open app, check current steplings
   - Set training roster
   - Switch to Training Mode

2. **Midday Check** (2 minutes)
   - Check step progress
   - Inspect any available cells
   - Level up steplings if possible

3. **Evening Review** (10 minutes)
   - Review daily progress
   - Fuse steplings if candidates available
   - Plan next day's training roster

### Walking Tests
- **Short Walk** (500-1000 steps): Verify step tracking accuracy
- **Long Walk** (2000+ steps): Test resource accumulation and battery impact
- **Interrupted Walk**: Test app behavior when backgrounded/foregrounded

## Performance & UX Testing

### App Performance
- [ ] App launches quickly (< 3 seconds)
- [ ] Smooth navigation between screens
- [ ] No crashes during normal usage
- [ ] Reasonable battery consumption
- [ ] Memory usage stays stable

### User Experience
- [ ] Intuitive navigation flow
- [ ] Clear feedback for all actions
- [ ] Error messages are helpful
- [ ] Loading states are appropriate
- [ ] Offline functionality is clear to user

## Device Testing Matrix

Test on multiple devices if available:
- **Primary Device**: Your main Android phone
- **Secondary Device**: Different Android version/manufacturer
- **Tablet**: Test on larger screen if available

## Common Issues to Watch For

### Step Tracking Issues
- Steps not updating in real-time
- Large discrepancies with device step counter
- App not requesting proper permissions
- Background step tracking stopping

### Sync Issues
- Data not saving to server
- Conflicts between local and server data
- Network timeout errors
- Authentication token expiration

### Performance Issues
- App becoming sluggish over time
- High battery drain
- Memory leaks during extended use
- Slow API responses

## Testing Timeline

**Week 1: Core Functionality**
- Days 1-2: Step tracking and game modes
- Days 3-4: Species discovery and stepling management
- Days 5-7: Real-world usage patterns

**Week 2: Edge Cases & Polish**
- Days 1-3: Network interruption scenarios
- Days 4-5: Extended usage and performance
- Days 6-7: Multi-device testing

## Success Criteria

Before continuing development, ensure:
1. ✅ Core game loop works reliably on mobile
2. ✅ Step tracking is accurate and consistent
3. ✅ No critical bugs or crashes
4. ✅ Performance is acceptable for daily use
5. ✅ User experience feels engaging

## Next Steps After Testing

Based on testing results:
- **If successful**: Continue with community features (Task 6)
- **If issues found**: Address critical bugs before new features
- **Performance problems**: Optimize before adding complexity

## Feedback Collection

Document:
- Any crashes or errors encountered
- Performance issues or slow responses
- Confusing UX elements
- Feature requests from real usage
- Battery and data usage observations

This testing phase is crucial for validating the core experience before building additional features that depend on these foundations.