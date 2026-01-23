# Fix Implementation Plan

## Issue 1: Ball Unlocks Reset on Rebirth
- **Status**: PENDING
- **Problem**: `ballsUnlocked` resets when user rebirths
- **Fix**: Ensure `ballsUnlocked` is preserved in save/load cycle

## Issue 2: Logout Doesn't Clear localStorage
- **Status**: PENDING
- **Problem**: Guest data persists after logout
- **Fix**: Add `logout()` function that clears localStorage before signOut

## Issue 3: Intro Tutorial Too Complex
- **Status**: PENDING
- **Problem**: Uses heavy intro.js library, shows multiple times
- **Fix**: Create simple native modal-based intro

---

## Implementation Notes

### Fix 1: Preserve ballsUnlocked
- In `playAsGuest()`: Check if `ballsUnlocked` exists in localData before overwriting
- In `rebirth()`: Explicitly preserve `ballsUnlocked` in the game state

### Fix 2: Clear localStorage on Logout
- Create `logout()` function that:
  1. Clears localStorage
  2. Signs out from Firebase
  3. Reloads page
- Update settings popup logout button to use this function

### Fix 3: Simple Native Intro
- Create `showIntroModal()` function
- Show once when:
  1. User is guest
  2. Hasn't seen intro before (`hasSeenIntro` not in localStorage)
  3. All popups have closed (wait for popupClosed + updateModalClosed)
- Simple 4-step intro:
  1. Welcome + goal
  2. How to earn gold
  3. How to buy balls
  4. Rebirth at level 100
- Use native `<dialog>` or custom modal with CSS animations

