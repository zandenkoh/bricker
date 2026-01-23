# TODO: Fix MyBalls Modal Upgrade Refresh Issue

## Problem
When upgrading a ball in the MyBalls modal, the entire modal is removed and recreated, causing:
- Flash effect when modal refreshes
- Scroll position resets to top
- Poor user experience

## Solution
Instead of removing and recreating the popup after upgrades, update the UI in-place:
1. Update only the specific ball stat row that was upgraded
2. Update upgrade button states based on new gold
3. Keep overlay open without refreshing

## Changes Made

### 1. Added helper function to update a specific ball stat row
- `updateBallStatRow(type)` - Updates the UI for a specific ball type after upgrade
- Updates ball count, level, speed, damage displays
- Updates upgrade button state (enabled/disabled)

### 2. Modified upgrade button click handler
Changed from:
```javascript
btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    if (type) {
        upgradeBall(type);
        // Refresh the popup after upgrade - BAD: causes flash and scroll reset
        overlay.remove();
        showMyBallsPopup();
    }
});
```

To:
```javascript
btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    if (type) {
        const scrollPos = overlay.querySelector('.ball-stats')?.scrollTop || 0;
        upgradeBall(type);
        // Update UI in-place - GOOD: no flash, preserves scroll
        updateBallStatRow(type);
        // Update global upgrade button states
        updateGlobalUpgradeButtons(overlay);
        // Restore scroll position
        const statsContainer = overlay.querySelector('.ball-stats');
        if (statsContainer) statsContainer.scrollTop = scrollPos;
    }
});
```

### 3. Modified global upgrade button handlers
Similar change - update UI in-place instead of recreating popup.

### 4. Added helper function for global upgrade buttons
- `updateGlobalUpgradeButtons(overlay)` - Updates the state of global upgrade buttons based on current gold and active state

## Files Modified
- `index.js` - Modified `showMyBallsPopup()` function

## Testing
After implementing, verify:
1. Open MyBalls modal and scroll down
2. Upgrade a ball - modal should NOT flash
3. Scroll position should be preserved
4. Upgrade button states should update correctly
5. Global upgrades should also update in-place

