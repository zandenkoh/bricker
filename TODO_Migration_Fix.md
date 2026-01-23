# TODO - Guest to Signed-up User Migration Fix

## Task: Fix migration from guest with progress to signed up user

### Issues Identified:
1. `saveToLocalStorage()` was missing `basic`, `cannonball`, `poison`, and `snowball` ball counts
2. Inconsistent ballPrices handling between localStorage and Firebase saves  
3. `login()` function didn't migrate local guest progress before loading from Firebase

### Fixes Implemented:

- [x] 1. Fixed `saveToLocalStorage()` to include ALL ball types (basic, cannonball, poison, snowball)
- [x] 2. Fixed `playAsGuest()` to restore ALL ball counts consistently with nullish coalescing
- [x] 3. Added migration logic in `login()` to check for localStorage data and merge with Firebase
- [x] 4. Added migration logic in `loginWithGoogle()` function as well
- [x] 5. Fixed `saveGameState()` to save all ball counts and unclaimedMilestoneRewards to Firebase
- [x] 6. Ensured backward compatibility with existing data

### Key Changes:
1. **`saveToLocalStorage()`**: Now saves ALL 9 ball types instead of only 5
2. **`playAsGuest()`**: Uses nullish coalescing (`??`) for safer default values
3. **`login()`**: Checks for local guest progress, merges with Firebase data, then clears localStorage
4. **`loginWithGoogle()`**: Same migration logic for Google sign-in
5. **`saveGameState()`**: Consistent ball counts and includes unclaimedMilestoneRewards

### Testing:
- [ ] Test guest play and save
- [ ] Test signup with existing guest progress
- [ ] Test login with existing account
- [ ] Verify all ball counts and upgrades are preserved

