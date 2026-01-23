# Task: Ball Options UI Improvements

## Requirements:
1. ✅ Plan approved
2. ✅ Modify HTML to wrap ball options in scrollable container and reposition buttons
3. ✅ Add CSS for scrollable container, fixed buttons, and price progress bar
4. ✅ Add JavaScript to filter purchasable balls only
5. ✅ Add JavaScript to show gold progress bar on price containers
6. ✅ Implementation complete - ready for testing

## Changes Made:

### index.html:
- Added `.ball-options-container` wrapper with `.ball-options-scroll` for ball options and `.ball-options-buttons` for fixed buttons
- Replaced `.ball-price` with `.price-container` containing `.price-progress` and `.price-text` elements
- Mass Destruction, Upgrades, and Settings buttons now stay fixed on the right while ball options scroll

### index.css:
- Added `.ball-options-container` with flex layout for separating scrollable content from fixed buttons
- Added `.ball-options-scroll` with `overflow-x: auto` for horizontal scrolling
- Added `.ball-options-buttons` with `flex-shrink: 0` to stay fixed on right
- Added `.price-container` with layered positioning for progress bar background
- Added `.price-progress` with green gradient that fills from left to right
- Added `.price-text` for centered price display on top of progress bar
- Added `.cannot-afford` styling for balls user cannot afford (grayed out)

### index.js:
- Updated `updateBallOptionsUI()` to call `updatePriceProgress()`
- Added `updatePriceProgress()` function that:
  - Calculates gold percentage for each purchasable item
  - Updates the width of `.price-progress` bar (0-100%)
  - Adds/removes `.cannot-afford` class based on gold availability
- Added call to `updatePriceProgress()` at the end of `updateUI()` to keep progress bars in sync


