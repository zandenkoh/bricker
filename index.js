
document.addEventListener("mousemove", e => {
    const trail = document.createElement("div");
    trail.className = "cursor-trail";
    trail.style.left = e.clientX + "px";
    trail.style.top = e.clientY + "px";
    trail.style.zIndex = "9999"
    document.body.appendChild(trail);

    // Remove after animation ends
    setTimeout(() => trail.remove(), 600);
});

// Inject tooltip and toast styles
const style = document.createElement('style');
style.innerHTML = `
    .tooltip {
        position: absolute;
        background: #f4eed6;
        border: 1px solid #444;
        color: #000;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        z-index: 10;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
        white-space: nowrap;
    }
    .ball-option:hover .tooltip {
        opacity: 1;
    }

.toast {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    background: #e9dcaf;
    border: 1px solid #444;
    color: #000;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999;
    opacity: 0;
    min-width: 200px;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    bottom: 20px; /* Default position, will be overridden by JS */
    pointer-events: auto;
}

.toast.show {
    opacity: 1;
}

/* Ensure toasts don't interfere with each other during spam */
.toast:not(.show) {
    pointer-events: none;
}

/* Responsive adjustments */
@media (max-width: 480px) {
    .toast {
        min-width: 90vw;
        max-width: 90vw;
        padding: 12px 16px;
        font-size: 16px;
        left: 5%;
        transform: translateX(0);
    }
}

    .upgrade-btn.disabled, .rebirth-btn.disabled {
        background: #ccc;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Firebase configuration loaded from config.js
const firebaseConfig = window.firebaseConfig;

// Verify config loaded before initializing
if (!firebaseConfig || !firebaseConfig.apiKey) {
    console.error("❌ Firebase config not loaded! Make sure config.js is loaded before index.js");
    throw new Error("Firebase configuration missing");
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

function startTutorialIfNeeded(userId) {
    const tutorialCompleted = localStorage.getItem(`tutorialCompleted_${userId}`);
    if (!tutorialCompleted && document.querySelector('#gameCanvas')) {
        setTimeout(() => startTutorial(), 500); // Delay to ensure DOM is ready
    }
}

function autoScaleMainContainer() {
    const container = document.querySelector(".main-main-container");
    if (!container) return;

    // Reset scale first to measure natural size
    container.style.transform = "scale(1)";
    container.style.transformOrigin = "top center";

    const containerRect = container.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const scaleX = windowWidth / containerRect.width;
    const scaleY = windowHeight / containerRect.height;

    // Use the smaller scale so both width and height fit
    const scale = Math.min(scaleX, scaleY);

    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = "top center"; // keep top centered
}

// Run on load and resize
window.addEventListener("load", autoScaleMainContainer);
window.addEventListener("resize", autoScaleMainContainer);


let originalTitle = document.title;
let toastEl = null;

const gcImages = [
    "./public/SLS.png",
    "./public/classroom.png"
];
let gcIndex = 0;
const gcImageEl = document.getElementById('gcImage');

gcImageEl.addEventListener('click', () => {
    gcIndex = (gcIndex + 1) % gcImages.length;
    gcImageEl.src = gcImages[gcIndex];
});


// Listen for overlay changes
database.ref('settings/overlay').on('value', snapshot => {
    const isOverlay = snapshot.val();
    const overlayEl = document.getElementById('afkOverlay');

    if (isOverlay) {
        // Show animated overlay
        overlayEl.style.display = 'block';
        if (!overlayEl.classList.contains('active')) {
            overlayEl.classList.remove('hiding');
            overlayEl.classList.add('active');
        }


        // Toast
        if (!toastEl) {
            toastEl = showTooast("Do not worry! We will AFK for you!");
        }

        // Title change
        document.title = "Teacher alert — Game Paused!";
    } else {
        // Only trigger fade-out if overlay was previously active
        if (overlayEl.classList.contains('active') && !overlayEl.classList.contains('hiding')) {
            overlayEl.classList.remove('active');
            overlayEl.classList.add('hiding');

            // Listen for animation end to hide overlay
            const hideOverlay = () => {
                if (!snapshot.val()) { // Check Firebase value again to avoid race conditions
                    overlayEl.style.display = 'none';
                    overlayEl.classList.remove('hiding');
                }
            };
            overlayEl.removeEventListener('animationend', hideOverlay); // Remove any existing listener
            overlayEl.addEventListener('animationend', hideOverlay, {
                once: true
            });
        } else {
            // Ensure overlay is hidden without animation on load if false
            overlayEl.style.display = 'none';
            overlayEl.classList.remove('active', 'hiding');
        }

        // Remove toast
        if (toastEl) {
            toastEl.style.opacity = '0';
            setTimeout(() => {
                if (toastEl && toastEl.parentNode) {
                    toastEl.remove();
                    toastEl = null;
                }
            }, 500);
        }

        // Restore title
        document.title = originalTitle;
    }
});

function showTooast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(0, 0, 0, 0.85)';
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '6px';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '9999';
    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.transition = 'opacity 0.5s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }
    }, 6000);

    return toast;
}

// Define Intro.js tutorial
function startTutorial() {
    if (typeof introJs === 'undefined') {
        console.error('introJs library not loaded');
        return;
    }
    introJs().setOptions({
        steps: [{
            intro: "Welcome to Bricker! Let's explore the game.",
            position: "center"
        },
        {
            element: document.querySelector('#gameCanvas'),
            intro: "This is the game canvas where balls bounce to destroy bricks. Click bricks to reduce their health!",
            position: "top"
        },
        {
            element: document.querySelector('.info-container'),
            intro: "Track your Gold and Level here. Gold buys balls and upgrades.",
            position: "right"
        },
        {
            element: document.querySelector('#save-button'),
            intro: "Click here to save your progress to your account.",
            position: "right"
        },
        {
            element: document.querySelector('.ball-options'),
            intro: "Buy different balls like Basic, Sniper, Bomb, Clones, Cannonball, Poison, or Snowball, each with unique abilities.",
            position: "bottom"
        },
        {
            element: document.querySelector('#my-balls-btn'),
            intro: "View your balls and upgrade them.",
            position: "left"
        },
        {
            element: document.querySelector('#settings-btn'),
            intro: "Update your username or log out in the settings.",
            position: "left"
        },
        {
            element: document.querySelector('#weapons-btn'),
            intro: "Use powerful weapons like Nuke or Blackhole for 1000 gold.",
            position: "left"
        },
        {
            element: document.querySelector('.leaderboard-container'),
            intro: "Check the leaderboard to see top players' rankings and stats.",
            position: "left"
        },
        {
            intro: "You're all set! Start destroying bricks and earning gold!",
            position: "center"
        }
        ],
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        disableInteraction: true,
        tooltipClass: 'custom-tooltip',
        highlightClass: 'custom-highlight',
        nextLabel: 'Next',
        prevLabel: 'Back',
        doneLabel: 'Done'
    }).oncomplete(() => {
        const user = auth.currentUser;
        if (user) {
            localStorage.setItem(`tutorialCompleted_${user.uid}`, 'true');
        }
    }).onexit(() => {
        const user = auth.currentUser;
        if (user) {
            localStorage.setItem(`tutorialCompleted_${user.uid}`, 'true');
        }
    }).start();
}

let ballCounts = {
    basic: 0,
    sniper: 0,
    big: 0,
    explosion: 0,
    multiplying: 0,
    child: 0,
    cannonball: 0,
    poison: 0,
    snowball: 0
};
let gold = 20;
let idleGoldPerSecond = 0.5;
let autoBallPrice = 200;
let level = 1;
let balls = [];
let bricks = [];
window.bricks = [];
let powerUps = [];
let autoBalls = [];
let effects = [];
let rebirthCount = 0;
let autoRebirthOwned = false; // Permanently purchased in shop (saved to DB)
let autoRebirthEnabled = false;
const brickWidth = 100;
const brickHeight = 30;
const maxBalls = 1000;
const MAX_BALL_SPEED = 45;
const maxPowerUps = 10;
const maxBricks = 66;
const ballPrices = {
    basic: 25,
    sniper: 50,
    big: 75,
    explosion: 100,
    multiplying: 125,
    cannonball: 150,
    poison: 175,
    snowball: 200
};
const ballUnlocks = {
    basic: { level: 0, rebirth: 0 },
    sniper: { level: 10, rebirth: 0 },
    big: { level: 20, rebirth: 0 },
    explosion: { level: 0, rebirth: 1 },
    multiplying: { level: 0, rebirth: 3 },
    cannonball: { level: 0, rebirth: 5 },
    poison: { level: 0, rebirth: 10 },
    snowball: { level: 0, rebirth: 15 }
};

// Replace existing ballUpgrades entries with these (or add the fields)
let ballUpgrades = {
    basic: {
        level: 1,
        speed: 3.5,
        baseDamage: 1,
        damage: 1,
        damageGrowth: 1.08   // ~8% per level
    },
    sniper: {
        level: 1,
        speed: 4.5,
        baseDamage: 1,
        damage: 1,
        damageGrowth: 1.10   // ~10% per level
    },
    big: {
        level: 1,
        speed: 2.7,
        baseDamage: 1,
        damage: 1,
        damageGrowth: 1.09   // ~9% per level
    },
    explosion: {
        level: 1,
        speed: 2.7,
        baseDamage: 2,
        damage: 2,
        damageGrowth: 1.12   // ~12% per level
    },
    multiplying: {
        level: 1,
        speed: 2.7,
        baseDamage: 1,
        damage: 1,
        damageGrowth: 1.09   // ~9% per level
    },
    child: {
        level: 1,
        speed: 3.6,
        baseDamage: 1,
        damage: 1,
        damageGrowth: 1.07   // ~7% per level
    },
    cannonball: {
        level: 1,
        speed: 3.0,
        baseDamage: 3,
        damage: 3,
        damageGrowth: 1.13   // ~13% per level, still strongest
    },
    poison: {
        level: 1,
        speed: 3.5,
        baseDamage: 1,
        damage: 1,
        damageGrowth: 1.09   // ~9% per level
    },
    snowball: {
        level: 1,
        speed: 3.5,
        baseDamage: 1,
        damage: 1,
        damageGrowth: 1.08   // ~8% per level
    }
};

let globalUpgrades = {
    speedBoost: {
        active: false,
        activationTime: null,
        cost: 200
    },
    goldBoost: {
        active: false,
        activationTime: null,
        cost: 150
    }
};
let stats = {
    totalPlayTime: 0,
    totalBallsPurchased: 0,
    totalUpgrades: 0,
    startTime: Date.now()
};
let username = '';
let lastUpdateTime = Date.now();

function isBallUnlocked(type) {
    const unlock = ballUnlocks[type];

    // Case 1: unlocked by level
    if (level >= unlock.level && rebirthCount >= unlock.rebirth) {
        return true;
    }

    // Case 2: rebirth "skips" some level locks
    if (rebirthCount > 0) {
        // At rebirth 1 → keep basic, sniper, big automatically
        if (["basic", "sniper", "big"].includes(type)) return true;
    }

    return false;
}


function updateBallOptionsUI() {
    Object.keys(ballUnlocks).forEach(type => {
        const optionEl = document.getElementById(`${type}-option`);
        if (!optionEl) return;

        if (isBallUnlocked(type)) {
            optionEl.style.opacity = "1";
            optionEl.style.cursor = "pointer";
            optionEl.style.pointerEvents = "auto";
        } else {
            optionEl.style.opacity = "0.4";
            optionEl.style.cursor = "not-allowed";
            optionEl.style.pointerEvents = "auto";
        }
    });
}

function enterArena() {
    window.location.href = "matchmaking.html";
}

function getUpgradeCost(type) {
    const baseCosts = {
        basic: 50,
        sniper: 100,
        big: 150,
        explosion: 200,
        multiplying: 250,
        child: 80,
        cannonball: 300,
        poison: 350,
        snowball: 400
    };
    const increment = 50 + rebirthCount * 10;
    return baseCosts[type] + (ballUpgrades[type].level - 1) * increment;
}

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const goldDisplay = document.getElementById('gold');
const levelDisplay = document.getElementById('level');
const rebirthDisplay = document.getElementById('rebirth');
const saveButton = document.getElementById('save-button');

// Authentication state
let isGuest = false;

// Add tooltips to ball options
/*const ballTooltips = {
    'sniper-option': 'Sniper Ball: Redirects to nearest brick on wall hit. Speed: 4.5, Damage: 1',
    'big-option': 'Big Ball: Larger size for more hitting surface. Speed: 2.7, Damage: 1',
    'explosion-option': 'Bomb Ball: Deals 2 damage to hit brick, 1 to nearby bricks. Speed: 2.7',
    'multiplying-option': 'Clones Ball: Spawns a small clone on brick hit. Speed: 2.7, Damage: 1',
    'auto-option': 'Auto Ball: Spawns at bottom, moves up, respawns if no brick hit. Speed: 3.6',
    'basic-option': `Basic Ball: Standard ball that bounces off walls and breaks bricks. Speed: 3.5, Damage: 1`,
    'cannonball-option': `Cannonball: Powerful ball that smashes through bricks. Speed: 3.0, Damage: 3.0`,
    'poison-option': `Poison Ball: Infects bricks to receive double damage. Speed: 3.5, Damage: 1.0`,
    'snowball-option': `Snowball: Gains power and speed with every bounce. Speed: 3.5, Damage: 1.0`
};*/
const ballTooltips = {
    'basic-option': `Basic Ball: Standard ball that bounces off walls and breaks bricks. Speed: ${ballUpgrades.basic.speed.toFixed(1)}, Damage: ${ballUpgrades.basic.damage.toFixed(1)}`,
    'sniper-option': `Sniper Ball: Redirects to nearest brick on wall hit. Speed: ${ballUpgrades.sniper.speed.toFixed(1)}, Damage: ${ballUpgrades.sniper.damage.toFixed(1)}`,
    'big-option': `Big Ball: Larger size for more hitting surface. Speed: ${ballUpgrades.big.speed.toFixed(1)}, Damage: ${ballUpgrades.big.damage.toFixed(1)}`,
    'explosion-option': `Bomb Ball: Deals ${ballUpgrades.explosion.damage.toFixed(1)} damage to hit brick, ${Math.floor(ballUpgrades.explosion.damage / 2).toFixed(1)} to nearby bricks. Speed: ${ballUpgrades.explosion.speed.toFixed(1)}`,
    'multiplying-option': `Clones Ball: Spawns a small clone on brick hit. Speed: ${ballUpgrades.multiplying.speed.toFixed(1)}, Damage: ${ballUpgrades.multiplying.damage.toFixed(1)}`,
    'auto-option': `Auto Ball: Spawns at bottom, moves up, respawns if no brick hit. Speed: 5, Damage: 1000`,
    'cannonball-option': `Cannonball: Powerful ball that smashes through bricks. Speed: ${ballUpgrades.cannonball.speed.toFixed(1)}, Damage: ${ballUpgrades.cannonball.damage.toFixed(1)}`,
    'poison-option': `Poison Ball: Infects bricks to receive double damage. Speed: ${ballUpgrades.poison.speed.toFixed(1)}, Damage: ${ballUpgrades.poison.damage.toFixed(1)}`,
    'snowball-option': `Snowball: Gains power and speed with every bounce. Speed: ${ballUpgrades.snowball.speed.toFixed(1)}, Damage: ${ballUpgrades.snowball.damage.toFixed(1)}`
};
Object.keys(ballTooltips).forEach(id => {
    const element = document.getElementById(id);
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = ballTooltips[id];
    element.appendChild(tooltip);
    element.addEventListener('mousemove', (e) => {
        tooltip.style.left = `${e.clientX - canvas.offsetLeft - 40}px`;
        tooltip.style.top = `${e.clientY - canvas.offsetTop + 170}px`;
    });
});


// Toast notification
/*function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 2000);
}*/
// Keep track of all active toasts
let activeToasts = [];
let isProcessing = false;

function showToast(message, duration = 2000) {
    // Prevent multiple simultaneous processing
    if (isProcessing) {
        setTimeout(() => showToast(message, duration), 50);
        return;
    }

    isProcessing = true;

    // Limit to latest 4 toasts - remove oldest if we have 4 or more
    if (activeToasts.length >= 3) {
        const oldestToast = activeToasts.shift();
        if (oldestToast.element.parentNode) {
            oldestToast.element.remove();
        }
    }

    // Create the toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.dataset.toastId = Date.now() + Math.random();
    document.body.appendChild(toast);

    // Add to active toasts array
    const toastData = {
        element: toast,
        id: toast.dataset.toastId,
        startTime: Date.now(),
        duration: duration
    };
    activeToasts.push(toastData);

    // Force a reflow to get accurate height
    toast.offsetHeight;

    // Position all toasts with dynamic heights
    updateToastPositions();

    // Show this toast
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('show');
            // Recalculate positions after show animation starts
            setTimeout(updateToastPositions, 50);
        }
        isProcessing = false;
    }, 100);

    // Schedule removal
    setTimeout(() => {
        safeRemoveToast(toastData);
    }, duration + 500);
}

function updateToastPositions() {
    // Filter out any toasts that might have been removed from DOM
    activeToasts = activeToasts.filter(toastData => toastData.element.parentNode);

    let totalHeight = 0;
    const spacing = 15;

    // Calculate positions from bottom up
    for (let i = activeToasts.length - 1; i >= 0; i--) {
        const toastData = activeToasts[i];
        const toast = toastData.element;

        if (toast.parentNode && toast.parentNode === document.body) {
            // Get actual height including padding and border
            const toastHeight = toast.offsetHeight;

            // Position from bottom
            const bottomPosition = totalHeight + 20; // 20px from screen bottom for first toast

            toast.style.bottom = `${bottomPosition}px`;
            toast.style.height = 'auto'; // Ensure it uses actual height
            toast.style.zIndex = `10000 + ${i}`;

            // Add spacing for next toast
            totalHeight += toastHeight + spacing;
        }
    }
}

function safeRemoveToast(toastData) {
    if (isProcessing) {
        setTimeout(() => safeRemoveToast(toastData), 100);
        return;
    }

    isProcessing = true;

    const index = activeToasts.findIndex(t => t.id === toastData.id);
    if (index > -1 && activeToasts[index].element.parentNode) {
        const toast = toastData.element;

        // Fade out animation
        toast.classList.remove('show');

        // Remove from DOM after animation and update positions
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
            activeToasts.splice(index, 1);
            // Recalculate all positions after removal
            requestAnimationFrame(updateToastPositions);
            isProcessing = false;
        }, 500);
    } else {
        if (index > -1) {
            activeToasts.splice(index, 1);
        }
        isProcessing = false;
    }
}

// Optional: Dismiss all toasts
function dismissAllToasts() {
    isProcessing = true;
    activeToasts.forEach(toastData => {
        const toast = toastData.element;
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 500);
        }
    });
    activeToasts = [];
    setTimeout(() => { isProcessing = false; }, 550);
}

// Check for inviter in URL
const urlParams = new URLSearchParams(window.location.search);
const inviterId = urlParams.get("id");


window.onload = function () {
    auth.onAuthStateChanged(user => {
        const trollsContainer = document.getElementById("troll-container");
        if (user && !isGuest) {
            // Remove any lingering login modals
            document.querySelectorAll('.login-overlay').forEach(el => el.remove());

            // Set save button for logged in users
            document.getElementById('save-button').textContent = 'Save progress';

            // Logged in: ignore invite links
            loadGameState(user.uid);   // <-- this will trigger bgMusic if enabled
            startTutorialIfNeeded(user.uid);
            //showSG60GiveawayPopup(user.uid);
            migrateNewBalls();
            setupListeners();
            showPopup();

            // Only show modal if not previously closed
            if (localStorage.getItem('updateModalClosed') !== 'true') {
                setTimeout(() => {
                    document.getElementById("updateModal").style.display = "flex";
                }, 1500);
            }

            // Set invite link for this user
            const inviteLinkEl = document.getElementById("inviteLink");
            if (inviteLinkEl) {
                inviteLinkEl.value = "zandenkoh.github.io/bricker/" + "?id=" + user.uid;
            }

            // Setup invite container
            setupInviteContainer(user.uid);
            if (trollsContainer) trollsContainer.style.display = "block";


        } else {
            // For guests or not logged in, set button to "Login to save"
            document.getElementById('save-button').textContent = 'Login to save';
            document.getElementById('save-button').onclick = () => showLoginPopupForSave();

            if (!isGuest) {
                // Only show login/signup modal if not playing as guest
                if (inviterId) {
                    showInviteSignupPopup(inviterId);
                } else {
                    showLoginPopup();
                }
            }

            // Load local settings for guests and apply once
            const localData = JSON.parse(localStorage.getItem("brickerGameState"));
            if (localData?.settings) {
                if (typeof localData.settings.backgroundMusic !== 'undefined') {
                    settings.backgroundMusic = !!localData.settings.backgroundMusic;
                }
                if (typeof localData.settings.backgroundMusicVolume === 'number') {
                    settings.backgroundMusicVolume = localData.settings.backgroundMusicVolume;
                }
            }
            applyMusicSettings();
            if (trollsContainer) trollsContainer.style.display = "none";
            hidePopup();


        }

        updateBallOptionsUI(); // run for both
    });
};

// Get DOM elements
const GamePopup = document.getElementById('gamePromoPopup');
const GameOverlay = document.getElementById('popupOverlay');
const GameCloseBtn = document.getElementById('closePopupBtn');

// Function to show pop-up
function showPopup() {
    // Check if pop-up was previously closed
    if (localStorage.getItem('popupClosed') !== 'true') {
        GamePopup.style.display = 'block';
        GameOverlay.style.display = 'block';
        // Show close button after 2 seconds
        setTimeout(() => {
            GameCloseBtn.style.display = 'flex';
            GameCloseBtn.style.alignItems = 'center';
            GameCloseBtn.style.justifyContent = 'center';
        }, 2000);
    }
}

// Function to hide pop-up
function hidePopup() {
    GamePopup.style.display = 'none';
    GameOverlay.style.display = 'none';
    // Save closed state to local storage
    localStorage.setItem('popupClosed', 'true');
}

// Close button event listener
GameCloseBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent the link from being followed
    hidePopup();
});




const sgTarget = new Date("2026-12-05T00:00:00+08:00").getTime();

function updateCountdownDisplays() {
    const now = new Date().getTime();
    const diff = sgTarget - now;

    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    const hours = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
    const minutes = Math.max(0, Math.floor((diff / (1000 * 60)) % 60));
    const seconds = Math.max(0, Math.floor((diff / 1000) % 60));

    // Update modal
    document.getElementById("days").textContent = String(days).padStart(2, "0");
    document.getElementById("hours").textContent = String(hours).padStart(2, "0");
    document.getElementById("minutes").textContent = String(minutes).padStart(2, "0");
    document.getElementById("seconds").textContent = String(seconds).padStart(2, "0");

    // Update mini countdown
    const mini = document.getElementById("miniCountdown");
    if (diff > 0) {
        mini.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
        mini.textContent = "Update in progress!";
    }

    // Show overlay if time is up
    if (diff <= 0) {
        document.getElementById("updateOverlay").style.display = "none";
        clearInterval(timer);
    }
}

// Show modal on miniCountdown click
document.getElementById("miniCountdown").addEventListener("click", () => {
    document.getElementById("updateModal").style.display = "flex";
});

// Store closed state in localStorage when closing modal
document.getElementById("closeUpdateModal").addEventListener("click", () => {
    document.getElementById("updateModal").style.display = "none";
    localStorage.setItem('updateModalClosed', 'true');
});

const timer = setInterval(updateCountdownDisplays, 1000);
updateCountdownDisplays();























// Elements
const chatBtn = document.getElementById("chatBtn");
const chatPopup = document.getElementById("chatPopup");
const closeChatBtn = document.getElementById("closeChatBtn");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatBadge = document.getElementById("chatBadge");
const chatHeader = document.getElementById("chatHeader");
const chatArrow = document.getElementById("chatArrow");
const chatBadgeLeft = document.getElementById("chatBadgeLeft");


// Default state
chatPopup.classList.add("expanded");
chatHeader.addEventListener("click", (e) => {
    // Prevent close button clicks from triggering collapse
    if (e.target.id === "closeChatBtn") return;

    chatPopup.classList.toggle("collapsed");
    chatPopup.classList.toggle("expanded");
});

let unreadCount = 0;
let chatOpen = false;
let userCache = {}; // cache usernames
let lastChatMessage = "No messages yet...";


closeChatBtn.addEventListener("click", () => {
    chatPopup.style.display = "none";
    chatOpen = false;
});

// Send message function
function sendMessage() {
    const msg = chatInput.value.trim();
    if (msg) {
        const user = auth.currentUser;
        if (!user || isGuest) {
            showToast("You must be logged in to send messages.");
            return;
        }
        const newMsgRef = database.ref("globalChat").push();
        newMsgRef.set({
            id: newMsgRef.key,  // ✅ include message ID in DB
            user: user.uid,
            message: msg,
            timestamp: Date.now()
        });
        chatInput.value = "";
    }
}

function updateUnreadBadge() {
    if (unreadCount > 0) {
        chatBadge.textContent = unreadCount;
        chatBadge.style.display = "inline-block";

        chatBadgeLeft.textContent = unreadCount;
        chatBadgeLeft.style.display = "inline-block";
    } else {
        chatBadge.style.display = "none";
        chatBadgeLeft.style.display = "none";
    }
}


sendChatBtn.addEventListener("click", sendMessage);

// Enter key support
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

// Helpers for localStorage
function getReadMessages() {
    try {
        return JSON.parse(localStorage.getItem("readMessages")) || [];
    } catch {
        return [];
    }
}

function markMessageAsRead(id) {
    const read = new Set(getReadMessages());
    read.add(id);
    localStorage.setItem("readMessages", JSON.stringify([...read]));
}


function markChatAsRead() {
    const now = Date.now();
    localStorage.setItem("lastChatRead", now.toString());
    unreadCount = 0;
    updateUnreadBadge();
}


function isMessageUnread(msgTimestamp) {
    const lastRead = parseInt(localStorage.getItem("lastChatRead") || "0", 10);
    return msgTimestamp > lastRead;
}




const lastRead = parseInt(localStorage.getItem("lastChatRead") || "0", 10);

// Fetch username once & cache
function getUsername(uid, callback) {
    if (!uid || uid === "guest") {
        callback("Guest");
        return;
    }
    if (userCache[uid]) {
        callback(userCache[uid]);
    } else {
        // ✅ Corrected Firebase path
        database.ref("users/" + uid + "/gameState/username").once("value").then(snap => {
            const name = snap.val() || "Guest";
            userCache[uid] = name;
            callback(name);
        });
    }
}

database.ref("globalChat").limitToLast(50).on("child_added", snapshot => {
    const data = snapshot.val();
    const currentUser = auth.currentUser ? auth.currentUser.uid : null;

    const wrapper = document.createElement("div");
    wrapper.classList.add("chat-message");
    wrapper.dataset.id = data.id || snapshot.key;

    const displayName = currentUser && data.user === currentUser ? 'You' : 'Anonymous';
    let messageText = `${displayName}: ${data.message.length > 20 ? data.message.substring(0, 20) + '...' : data.message}`;

    if (currentUser && data.user === currentUser) {
        wrapper.classList.add("me");
        wrapper.innerHTML = `<div class="bubble">${data.message}</div>`;
    } else {
        wrapper.classList.add("them");
        getUsername(data.user, name => {
            wrapper.innerHTML = `
                <div class="bubble">${data.message}</div>
                <div class="sender-name">${name}</div>
            `;
            // Update messageText with real name
            messageText = `${name}: ${data.message.length > 20 ? data.message.substring(0, 20) + '...' : data.message}`;
            lastChatMessage = messageText;
            // Update preview if exists
            const lastMessageEl = document.getElementById('last-chat-message');
            if (lastMessageEl) {
                lastMessageEl.textContent = messageText;
            }
        });
    }

    // Update global lastChatMessage
    lastChatMessage = messageText;
    // Update preview if exists
    const lastMessageEl = document.getElementById('last-chat-message');
    if (lastMessageEl) {
        lastMessageEl.textContent = messageText;
    }

    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // ✅ Robust unread logic
    if (!chatOpen && isMessageUnread(data.timestamp)) {
        unreadCount++;
        updateUnreadBadge();
    } else if (chatOpen) {
        markChatAsRead();
    }

});






















function setupInviteContainer(userId) {
    const inviteContainer = document.querySelector(".invite-container");
    const invitesLeftEl = document.getElementById("invites-left");

    let lastInvites = null;

    const invitesRef = database.ref('users/' + userId + '/invitesLeft');

    invitesRef.on('value', snap => {
        let invites = snap.val();

        // If no invitesLeft field yet, set it to 5
        if (invites === null || invites === undefined) {
            invites = 5;
            invitesRef.set(5);
        }

        // Show or hide the container
        if (invites > 0) {
            if (inviteContainer) {
                inviteContainer.style.display = "block";
                if (invitesLeftEl) invitesLeftEl.textContent = invites;
            }
        } else {
            if (inviteContainer) {
                inviteContainer.remove(); // remove completely when 0
            }
        }

        // Detect invite consumption
        if (lastInvites !== null && invites < lastInvites) {
            showInviteUsedTooltip();
        }
        lastInvites = invites;
    });
}


function showInviteUsedTooltip() {
    const tooltip = document.createElement("div");
    tooltip.className = "invite-tooltip";
    tooltip.innerHTML = `
        <h3>Invite Accepted 🎉</h3>
        <p>One of your friends joined! You just earned 150,000 Gold. Reload quickly to view your prize!</p>
        <button id="reloadBtn">Reload</button>
    `;
    document.body.appendChild(tooltip);

    // Animate in
    setTimeout(() => tooltip.classList.add("show"), 50);

    // Reload button
    tooltip.querySelector("#reloadBtn").addEventListener("click", () => {
        window.location.reload();
    });

    // Auto-reload if tab not visible
    if (document.hidden) {
        window.location.reload();
    }
}


function setupListeners() {
    const user = firebase.auth().currentUser;
    if (user) {
        const userId = user.uid;
        const presenceRef = firebase.database().ref(`presence/${userId}`);
        const reloadRef = firebase.database().ref(`reload/${userId}`);

        // Set presence to true and ensure it persists
        presenceRef.set(true)
            .then(() => {
                console.log(`Presence set to true for user ${userId}`);
                // Set up onDisconnect to handle tab close or disconnect
                presenceRef.onDisconnect().set(false)
                    .then(() => {
                        console.log(`onDisconnect set for presence/${userId}`);
                    })
                    .catch(err => {
                        console.error(`Error setting onDisconnect for presence/${userId}:`, err);
                    });
            })
            .catch(err => {
                console.error(`Error setting presence for user ${userId}:`, err);
            });

        // Constantly listen for reload changes
        reloadRef.on('value', snap => {
            if (snap.val() === true) {
                reloadRef.set(false)
                    .then(() => {
                        console.log(`Reload triggered for user ${userId}`);
                        window.location.reload();
                    })
                    .catch(err => {
                        console.error('Error resetting reload flag:', err);
                    });
            }
        }, err => {
            console.error('Error listening to reload:', err);
        });

        // Check for updates on load
        checkForUpdates();
    } else {
        console.warn('No authenticated user found for setting up listeners');
    }
}

function checkForUpdates() {
    const userId = firebase.auth().currentUser?.uid;
    if (!userId) return;

    firebase.database().ref('updates').once('value')
        .then(snap => {
            const updates = snap.val() || {};
            const dismissedUpdates = JSON.parse(localStorage.getItem('dismissedUpdates') || '[]');

            Object.entries(updates).forEach(([updateId, {
                id: elementId,
                content
            }]) => {
                if (!dismissedUpdates.includes(updateId)) {
                    waitForElementToDisplay(elementId, () => {
                        showUpdateTooltip(updateId, elementId, content);
                    });
                }
            });
        })
        .catch(err => {
            console.error('Error fetching updates:', err);
        });
}

function waitForElementToDisplay(elementId, callback) {
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loops (5 seconds max)

    const checkElement = () => {
        attempts++;

        // Try different selectors in order of preference
        let element = null;
        let foundBy = '';

        // 1. Try regular ID first
        element = document.getElementById(elementId);
        if (element) {
            foundBy = 'id';
        } else {
            // 2. Try data-uid exact match
            element = document.querySelector(`[data-uid="${elementId}"]`);
            if (element) {
                foundBy = 'data-uid (exact)';
            } else {
                // 3. Try data-uid with sanitized version
                const sanitizedId = sanitizeUidForId(elementId);
                element = document.querySelector(`[data-uid="${sanitizedId}"]`);
                if (element) {
                    foundBy = 'data-uid (sanitized)';
                }
            }
        }

        // Check if element exists and is visible
        if (element && element.offsetParent !== null) {
            console.log(`✓ Found element for update "${elementId}" after ${attempts} attempts (${foundBy})`);
            callback();
        } else if (attempts < maxAttempts) {
            console.log(`⏳ Still searching for element "${elementId}" (attempt ${attempts}/${maxAttempts})`);
            setTimeout(checkElement, 100);
        } else {
            console.warn(`⚠️ Gave up searching for element "${elementId}" after ${maxAttempts} attempts`);
        }
    };

    console.log(`🔍 Starting search for element "${elementId}"`);
    checkElement();
}

function sanitizeUidForId(uid) {
    return uid.replace(/[^a-zA-Z0-9_-]/g, '_');
}


function showUpdateTooltip(updateId, elementId, content) {
    // Find element using the same logic
    let element = document.getElementById(elementId);
    if (!element) {
        element = document.querySelector(`[data-uid="${elementId}"]`);
    }
    if (!element) {
        const sanitizedId = sanitizeUidForId(elementId);
        element = document.querySelector(`[data-uid="${sanitizedId}"]`);
    }

    if (!element) {
        console.warn(`Element with ID or data-uid "${elementId}" not found for update ${updateId}`);
        return;
    }

    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '5px 10px';
    tooltip.style.paddingRight = '5px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    tooltip.style.zIndex = '999';
    tooltip.style.maxWidth = '300px';
    tooltip.style.fontSize = '14px';
    tooltip.style.textAlign = 'center';
    tooltip.innerHTML = `
        <div style="display:flex;flex-direction:row;gap:0;align-items:center;">
            <p style="margin: 0 5px 0 0;">${content}</p>
            <button style="margin: 0; position: relative; background: red; margin-right: 0; border-radius: 50px; padding: 0; width: 20px; height: 20px; border: none; color: #fff; font-size: 16px; cursor: pointer; line-height: 1;">✕</button>
        </div>
        <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid #333;"></div>
    `;
    document.body.appendChild(tooltip);

    // Position relative to the found element
    const rect = element.getBoundingClientRect();
    const elementType = element.id ? 'id' : 'data-uid';
    console.log(`Positioning tooltip for element found by ${elementType}:`, elementId);

    tooltip.style.left = `${rect.left + window.scrollX + rect.width / 2 - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${rect.top + window.scrollY + rect.height + 10}px`;

    tooltip.querySelector('button').addEventListener('click', () => {
        const dismissedUpdates = JSON.parse(localStorage.getItem('dismissedUpdates') || '[]');
        dismissedUpdates.push(updateId);
        localStorage.setItem('dismissedUpdates', JSON.stringify(dismissedUpdates));
        tooltip.remove();
    });
}

function buyAutoRebirth() {
    const user = auth.currentUser;
    if (!user || isGuest) {
        showLoginPopupForSave();
        return;
    }
    if (autoRebirthOwned) {
        showToast('Auto Rebirth already owned.');
        return;
    }
    if (rebirthCount < 10) {
        showToast('Not enough rebirths!');
        return;
    }
    if (!confirm('Spend 10 rebirths to permanently unlock Auto Rebirth?')) return;

    rebirthCount -= 10;
    autoRebirthOwned = true;
    autoRebirthEnabled = true;
    updateUI();

    database.ref('users/' + user.uid + '/gameState').update({
        rebirthCount: rebirthCount,
        autoRebirthOwned: true,
        autoRebirthEnabled: true
    }).then(() => {
        showToast('Auto Rebirth purchased!');
        updateLeaderboard?.();
    }).catch(error => {
        // revert on failure
        rebirthCount += 10;
        autoRebirthOwned = false;
        autoRebirthEnabled = false;
        updateUI();
        showToast('Purchase failed: ' + error.message);
    });
}


// Buy handler (hook it up once DOM is ready)

document.getElementById('auto-rebirth-toggle')?.addEventListener('change', function (e) {
    autoRebirthEnabled = !!e.target.checked;
    const user = auth.currentUser;
    if (user && !isGuest) {
        database.ref('users/' + user.uid + '/gameState').update({
            autoRebirthEnabled
        })
            .catch(() => { }); // don't block UI on failure
    }
    updateUI();
});


// Login popup
function showLoginPopup() {
    // Remove any existing login overlays to prevent stacking
    document.querySelectorAll('.login-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
        <div class="login-popup">
            <h2>Login to Save Progress</h2>
            <input type="email" id="email" placeholder="Email">
            <input type="password" id="password" placeholder="Password">
            <div class="button-group">
                <button id="login-btn">Login</button>
                <button id="guest-btn">Play as Guest</button>
            </div>
            <p>Don't have an account? <a href="#" id="signup-link">Sign up</a></p>
        </div>
    `;
    document.body.appendChild(overlay);
    saveToLocalStorage(); // Save progress to local storage
    const loginBtn = overlay.querySelector('#login-btn');
    const guestBtn = overlay.querySelector('#guest-btn');
    const signupLink = overlay.querySelector('#signup-link');

    loginBtn.addEventListener('click', () => {
        loginBtn.disabled = true;
        login();
    });
    guestBtn.addEventListener('click', () => {
        guestBtn.disabled = true;
        playAsGuest();
    });
    signupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSignUpPopup(overlay);
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            playAsGuest();
        }
    });
}

function showSignUpPopup(overlay) {
    overlay.innerHTML = `
        <div class="login-popup">
            <h2>Sign Up</h2>
            <input type="email" id="email" placeholder="Email">
            <input type="password" id="password" placeholder="Password">
            <input type="password" id="confirm-password" placeholder="Confirm Password">
            <div class="button-group">
                <button id="signup-btn">Sign Up</button>
                <button id="back-btn">Back to Login</button>
            </div>
        </div>
    `;
    const signupBtn = overlay.querySelector('#signup-btn');
    const backBtn = overlay.querySelector('#back-btn');
    signupBtn.addEventListener('click', () => {
        signupBtn.disabled = true;
        signUp();
    });
    backBtn.addEventListener('click', () => {
        showLoginPopup();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            playAsGuest();
        }
    });
}

// Login function
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.querySelector('#login-btn');
    loginBtn.disabled = true;
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            isGuest = false;
            document.querySelector('.login-overlay').remove();
            loadGameState(userCredential.user.uid); // Only load data, do not save local storage
            startTutorialIfNeeded(userCredential.user.uid);
        })
        .catch(error => {
            showToast('Login failed: ' + error.message);
            loginBtn.disabled = false;
        });
}

// Update signUp function
function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    const signupBtn = document.querySelector('#signup-btn');
    if (password !== confirmPassword) {
        showToast('Passwords do not match!');
        signupBtn.disabled = false;
        return;
    }
    signupBtn.disabled = true;
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            isGuest = false;
            document.querySelector('.login-overlay').remove();
            saveGameStateFromLocalStorage(userCredential.user.uid); // Save local storage data for new users
            startTutorialIfNeeded(userCredential.user.uid);
        })
        .catch(error => {
            showToast('Sign up failed: ' + error.message);
            signupBtn.disabled = false;
        });
}

function copyInviteLink() {
    const linkInput = document.getElementById('inviteLink');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("Invite link copied! Just send anyone this link and you will get 1 rebirth when they sign up!");
}
document.getElementById("copyInviteBtn").addEventListener("click", copyInviteLink);


// Play as guest
function playAsGuest() {
    isGuest = true;
    document.querySelectorAll('.login-overlay').forEach(el => el.remove());
    startGame();
}

// Save game state
function saveGameState() {
    if (isGuest) {
        showLoginPopupForSave();
        return;
    }
    const saveBtn = document.getElementById('save-button');
    saveBtn.disabled = true;
    const user = auth.currentUser;
    if (user) {
        const ballCounts = {
            basic: balls.filter(b => b.type === 'basic').length,
            sniper: balls.filter(b => b.type === 'sniper').length,
            big: balls.filter(b => b.type === 'big').length,
            explosion: balls.filter(b => b.type === 'explosion').length,
            multiplying: balls.filter(b => b.type === 'multiplying').length,
            child: balls.filter(b => b.type === 'child').length,
            cannonball: balls.filter(b => b.type === 'cannonball').length,
            poison: balls.filter(b => b.type === 'poison').length,
            snowball: balls.filter(b => b.type === 'snowball').length
        };
        const gameState = {
            gold,
            level,
            ballCounts,
            autoBalls: autoBalls.length,
            ballPrices,
            autoBallPrice,
            idleGoldPerSecond,
            ballUpgrades,
            stats: {
                ...stats,
                totalBricksBroken: stats.totalBricksBroken || 0  // <-- add this
            },
            username,
            rebirthCount,
            cosmetics,
            autoRebirthOwned,
            autoRebirthEnabled,
            mascotsOwned,          // array of owned mascot entries
            selectedMascotId,      // equipped mascot (optional)
            settings: {
                backgroundMusic: settings.backgroundMusic,
                backgroundMusicVolume: settings.backgroundMusicVolume
            },
            globalUpgrades: {
                speedBoost: {
                    active: globalUpgrades.speedBoost.active,
                    activationTime: globalUpgrades.speedBoost.active ? Date.now() : null
                },
                goldBoost: {
                    active: globalUpgrades.goldBoost.active,
                    activationTime: globalUpgrades.goldBoost.active ? Date.now() : null
                }
            }
        };
        database.ref('users/' + user.uid + '/gameState').update(gameState)
            .then(() => {
                showToast('Progress saved successfully!');
                saveBtn.disabled = false;
            })
            .catch(error => {
                showToast('Save failed: ' + error.message);
                saveBtn.disabled = false;
            });
    }
}

function saveGameStateFromLocalStorage(uid) {
    const gameState = JSON.parse(localStorage.getItem('brickerGameState'));
    if (gameState) {
        database.ref('users/' + uid + '/gameState').set(gameState)
            .then(() => {
                localStorage.removeItem('brickerGameState');
                showToast('Progress saved successfully!');
                location.reload();
            })
            .catch(error => showToast('Save failed: ' + error.message));
    } else {
        loadGameState(uid);
    }
}

let milestoneDefinitions = [
    // === Ball count milestones ===
    {
        id: 'balls_basic_50',
        title: 'Basic Collector',
        description: 'Own 50 Basic Balls.',
        goal: 50,
        stat: 'basicBalls',
        benefit: '+5% basic ball speed'
    },
    {
        id: 'balls_sniper_50',
        title: 'Sharpshooter',
        description: 'Own 50 Sniper Balls.',
        goal: 50,
        stat: 'sniperBalls',
        benefit: '+5% sniper accuracy'
    },
    {
        id: 'balls_big_50',
        title: 'Big Time',
        description: 'Own 50 Big Balls.',
        goal: 50,
        stat: 'bigBalls',
        benefit: '+10% big ball size'
    },
    {
        id: 'balls_explosion_50',
        title: 'Demolitionist',
        description: 'Own 50 Bomb Balls.',
        goal: 50,
        stat: 'explosionBalls',
        benefit: '+1 explosion radius'
    },
    {
        id: 'balls_multiplying_50',
        title: 'Clone Commander',
        description: 'Own 50 Clones Balls.',
        goal: 50,
        stat: 'multiplyingBalls',
        benefit: '+5% clone spawn chance'
    },
    {
        id: 'balls_cannonball_50',
        title: 'Siege Master',
        description: 'Own 50 Cannonballs.',
        goal: 50,
        stat: 'cannonballBalls',
        benefit: '+2 cannonball damage'
    },
    {
        id: 'balls_poison_50',
        title: 'Toxic Avenger',
        description: 'Own 50 Poison Balls.',
        goal: 50,
        stat: 'poisonBalls',
        benefit: '+5% poison duration'
    },
    {
        id: 'balls_snowball_50',
        title: 'Frost Lord',
        description: 'Own 50 Snowballs.',
        goal: 50,
        stat: 'snowballBalls',
        benefit: '+5% snowball speed growth'
    },

    // === Upgrade milestones ===
    {
        id: 'upgrade_basic_5',
        title: 'Basic Upgrade Adept',
        description: 'Upgrade Basic Ball to level 5.',
        goal: 5,
        stat: 'basicUpgrade',
        benefit: '+10% basic ball damage'
    },
    {
        id: 'upgrade_sniper_5',
        title: 'Sniper Upgrade Adept',
        description: 'Upgrade Sniper Ball to level 5.',
        goal: 5,
        stat: 'sniperUpgrade',
        benefit: '+10% sniper ball damage'
    },
    // Add similar ones for each ball type...

    // === Donation milestones ===
    {
        id: 'donate_1000',
        title: 'Benevolent Donor',
        description: 'Donate 1,000 gold to other players.',
        goal: 1000,
        stat: 'totalDonated',
        benefit: '+2% idle gold gain'
    },
    {
        id: 'donate_10000',
        title: 'Philanthropist',
        description: 'Donate 10,000 gold to other players.',
        goal: 10000,
        stat: 'totalDonated',
        benefit: '+5% idle gold gain'
    },

    // Keep your old ones
    {
        id: 'balls_100',
        title: 'Ball Master',
        description: 'Own 100 balls.',
        goal: 100,
        stat: 'totalBalls',
        benefit: '+2% all ball speed'
    },
    {
        id: 'balls_500',
        title: 'Ball Legend',
        description: 'Own 500 balls.',
        goal: 500,
        stat: 'totalBalls',
        benefit: '+5% all ball speed'
    },
    {
        id: 'balls_1000',
        title: 'Ball God',
        description: 'Own 1,000 balls.',
        goal: 1000,
        stat: 'totalBalls',
        benefit: '+10% all ball speed'
    },
    {
        id: 'upgrade_10',
        title: 'Upgrade Enthusiast',
        description: 'Buy 10 upgrades.',
        goal: 10,
        stat: 'totalUpgrades',
        benefit: '+2% damage'
    },
    {
        id: 'upgrade_100',
        title: 'Upgrade Master',
        description: 'Buy 100 upgrades.',
        goal: 100,
        stat: 'totalUpgrades',
        benefit: '+10% damage'
    }
];



document.getElementById('all-milestones-btn').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay'; // we can reuse your existing dark overlay style

    const popup = document.createElement('div');
    popup.className = 'all-milestones-popup';
    popup.style.maxHeight = '80vh';
    popup.style.overflowY = 'auto';

    popup.innerHTML = `
        <button class="close-btn">&times;</button>
        <h2>All Milestones</h2>
        <div id="all-milestones-list"></div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Fill the milestone list with all milestones (sorted)
    const listContainer = popup.querySelector('#all-milestones-list');
    milestoneDefinitions
        .sort((a, b) => a.goal - b.goal)
        .forEach(m => {
            const current = getStatValue(m.stat);
            const progress = Math.min((current / m.goal) * 100, 100);
            const milestoneEl = document.createElement('div');
            milestoneEl.className = 'milestone';
            milestoneEl.innerHTML = `
      <div class="tooltip">${m.benefit || 'No benefit'}</div>
  <div class="milestone-title">
      ${m.title}
  </div>
  <div>${m.description}</div>
  <div class="milestone-progress">
    <div class="milestone-progress-bar" style="width:${progress}%"></div>
  </div>
`;


            listContainer.appendChild(milestoneEl);
        });

    // Close events
    popup.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
});


// Player's active milestones
let activeMilestones = [];

// Load milestones based on player progress
function loadMilestones() {
    activeMilestones = milestoneDefinitions
        .filter(m => getStatValue(m.stat) < m.goal) // Skip completed
        .slice(0, 3); // Only easiest 3
    renderMilestones();
}

function getStatValue(stat) {
    if (stat === 'totalBalls') {
        return Object.values(ballCounts).reduce((a, b) => a + b, 0);
    }
    if (stat.endsWith('Balls')) {
        const type = stat.replace('Balls', '');
        return ballCounts[type] || 0;
    }
    if (stat.endsWith('Upgrade')) {
        const type = stat.replace('Upgrade', '');
        return ballUpgrades[type]?.level || 0;
    }
    if (stat === 'totalDonated') {
        return stats.totalDonated || 0;
    }
    return window[stat] || 0;
}


// Render milestones in sidebar
function renderMilestones() {
    const container = document.getElementById('milestone-list');
    container.innerHTML = '';
    activeMilestones.forEach(m => {
        const current = getStatValue(m.stat);
        const progress = Math.min((current / m.goal) * 100, 100);
        const milestoneEl = document.createElement('div');
        milestoneEl.className = 'milestone';
        milestoneEl.innerHTML = `
  <div class="milestone-title" style="position:relative;">
      ${m.title}
      <div class="tooltip" style="top:-30px; left:50%; transform:translateX(-50%);">${m.benefit || 'No benefit'}</div>
  </div>
  <div>${m.description}</div>
  <div class="milestone-progress">
    <div class="milestone-progress-bar" style="width:${progress}%"></div>
  </div>
    `;
        container.appendChild(milestoneEl);
    });
}

// Check milestones in real-time
function updateMilestones() {
    let changed = false;

    // Loop over a copy so we can modify activeMilestones safely
    [...activeMilestones].forEach(m => {
        if (getStatValue(m.stat) >= m.goal) {
            // Show a toast notification (non-blocking)
            showToast(`Milestone Complete: ${m.title}!`);

            // Optionally find and visually update the milestone in the DOM
            const milestoneEls = document.querySelectorAll('.milestone');
            milestoneEls.forEach(el => {
                if (el.querySelector('.milestone-title')?.textContent.trim() === m.title) {
                    el.classList.add('milestone-complete');
                }
            });

            // Remove from active list
            activeMilestones = activeMilestones.filter(x => x.id !== m.id);
            changed = true;
        }
    });

    // Update the list without interrupting the game
    if (changed) {
        requestAnimationFrame(loadMilestones); // non-blocking refresh
    } else {
        requestAnimationFrame(renderMilestones);
    }
}



// Inject styles for leaderboard cards and user details popup
const leaderboardStyle = document.createElement('style');
leaderboardStyle.innerHTML = `
.leaderboard-list {
    overflow-y: visible;
    padding: 10px;
    height: 100%;
        padding-bottom: 30px;

}

    .leaderboard-card {
display: flex;
    flex-direction: row; /* Horizontal layout for rank and user-info */
    align-items: center; /* Center vertically */
    gap: 10px; /* Space between rank and user-info */
    background: linear-gradient(145deg, #f4eed6, #e9dcaf);
    border: 1px solid #444;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 10px;
    cursor: pointer;
    }
    
    .leaderboard-card .user-and-info {
display: flex;
    flex-direction: column; /* Stack username and info vertically */
    gap: 5px; /* Space between username and info */
    flex: 1;
    white-space: nowrap;
    }

    .leaderboard-card.current-user {
        background: #000;
        color: #fff;
        border: 1px solid #fff;
        position: sticky;
        bottom: 0;
    }

    .leaderboard-card.current-user .info,
    .leaderboard-card.current-user .username {
        color: #fff;
    }

    .leaderboard-card .rank {
        font-size: 16px;
        font-weight: bold;
        color: #333;
        width: 30px;
        height: 30px;
        line-height: 30px;
        text-align: center;
        border-radius: 50%;
        background: #ccc;
        margin-bottom: 5px;
        flex-shrink: 0;
    }

    .leaderboard-card.rank-1 .rank {
        background: #ffd700;
    }

    .leaderboard-card.rank-2 .rank {
        background: #c0c0c0;
    }

    .leaderboard-card.rank-3 .rank {
        background: #cd7f32;
    }

    .leaderboard-card.current-user .rank {
        background: #fff;
        color: #000;
    }

    .leaderboard-card .username {
        font-size: 16px;
        font-weight: 600;
        color: #000;
    }

    .leaderboard-card .info {
        font-size: 14px;
        color: #000;
    }

.user-details-popup {
    background: #f4eed6;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 15px;
    width: 300px;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    font-family: Arial, sans-serif;
}

.user-details-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
}

.user-details-popup .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
}

.user-details-popup h3 {
    margin: 0 0 10px;
    color: #333;
}

.user-details-popup p {
    margin: 5px 0;
    font-size: 14px;
    color: #000;
}
`;
document.head.appendChild(leaderboardStyle);

function formatNumber(num) {
    if (num === 0) return "0";
    if (Math.abs(num) < 1000) return Math.floor(num).toString();

    const units = [
        'K',    // Thousand (10^3)
        'M',    // Million (10^6)
        'B',    // Billion (10^9)
        'T',    // Trillion (10^12)
        'Q',    // Quadrillion (10^15)
        'QT',   // Quintillion (10^18)
        'SX',   // Sextillion (10^21)
        'SP',   // Septillion (10^24)
        'OC',   // Octillion (10^27)
        'NO',   // Nonillion (10^30)
        'DC',   // Decillion (10^33)
        'UD',   // Undecillion (10^36)
        'DD',   // Duodecillion (10^39)
        'TD',   // Tredecillion (10^42)
        'QTD',  // Quattuordecillion (10^45)
        'QID',  // Quindecillion (10^48)
        'SXD',  // Sexdecillion (10^51)
        'SPD',  // Septendecillion (10^54)
        'OD',   // Octodecillion (10^57)
        'ND',   // Novemdecillion (10^60)
        'VG',   // Vigintillion (10^63)
        'UVG',  // Unvigintillion (10^66)
        'DVG',  // Duovigintillion (10^69)
        'TVG',  // Trevigintillion (10^72)
        'QTVG', // Quattuorvigintillion (10^75)
        'QIVG', // Quinvigintillion (10^78)
        'SXVG', // Sexvigintillion (10^81)
        'SPVG', // Septenvigintillion (10^84)
        'OVG',  // Octovigintillion (10^87)
        'NVG',  // Novemvigintillion (10^90)
        'TG',   // Trigintillion (10^93)
        'UTG',  // Untrigintillion (10^96)
        'DTG',  // Duotrigintillion (10^99)
        'GGL'   // Googol (10^100)
    ];

    const unitIndex = Math.min(
        Math.floor(Math.log10(Math.abs(num)) / 3) - 1,
        units.length - 1
    );

    if (unitIndex < 0) return Math.floor(num).toString();

    const scaledNum = num / Math.pow(1000, unitIndex + 1);
    const formattedNum = scaledNum % 1 === 0 ? Math.floor(scaledNum) : scaledNum.toFixed(1);
    return `${formattedNum}${units[unitIndex]}`;
}

function fetchLeaderboard() {
    console.log('Fetching leaderboard from users/...');
    const leaderboardList = document.querySelector('.leaderboard-container .leaderboard-list');
    if (!leaderboardList) {
        console.error('Leaderboard list element not found');
        return;
    }
    leaderboardList.innerHTML = '<p>Loading...</p>';
    database.ref('users').once('value')
        .then(snapshot => {
            console.log('Users snapshot:', snapshot.val());
            const leaders = [];
            snapshot.forEach(child => {
                const gameState = child.val().gameState;
                if (gameState) {
                    leaders.push({
                        uid: child.key,
                        username: gameState.username || 'Anonymous',
                        rebirthCount: gameState.rebirthCount || 0,
                        gold: gameState.gold || 0,
                        ballCounts: gameState.ballCounts || {},
                        totalUpgrades: gameState.stats?.totalUpgrades || 0,
                        idleGoldPerSecond: gameState.idleGoldPerSecond || 0.5,
                        ballUpgrades: gameState?.ballUpgrades || {},
                        stats: gameState?.stats || {}
                    });
                }
            });
            leaders.sort((a, b) => b.rebirthCount - a.rebirthCount || b.gold - a.gold);
            leaderboardList.innerHTML = '';

            // Add chat preview at the top
            const chatPreview = document.createElement('div');
            chatPreview.className = 'chat-preview';
            chatPreview.innerHTML = `
                <div class="chat-preview-header">
                    <span>Global Chat <span id="chatBadge" class="chat-badge" style="display:none;">0</span></span>
                </div>
                <div class="chat-preview-message" id="last-chat-message">${lastChatMessage}</div>
            `;
            chatPreview.addEventListener('click', () => {
                document.getElementById('chatPopup').style.display = 'flex';
                chatOpen = true;
                markChatAsRead();
            });
            chatPreview.id = "chatBtn";
            leaderboardList.appendChild(chatPreview);

            if (leaders.length === 0) {
                console.log('No user data available');
                leaderboardList.innerHTML += '<p>No leaderboard data available.</p>';
                return;
            }
            const currentUser = auth.currentUser;
            leaders.forEach((leader, index) => {
                const entry = document.createElement('div');
                const rank = index + 1;
                entry.className = `leaderboard-card rank-${rank}`;
                entry.id = leader.uid;
                entry.innerHTML = `
                    <span class="rank">${rank}</span>
                    <div class="user-and-info">
                        <span class="username">${leader.username}</span>
                        <span class="info">${leader.rebirthCount} Rebirths | ${formatNumber(leader.gold)} Gold</span>
                    </div>
                `;
                entry.addEventListener('click', () => showUserDetails({ ...leader, rank }));
                leaderboardList.appendChild(entry);
            });

            let userRank = null;
            if (currentUser) {
                const idx = leaders.findIndex(l => l.uid === currentUser.uid);
                if (idx !== -1) userRank = idx + 1;
            }
            setUserRankBadge(userRank);
        })
        .catch(error => {
            console.error('Failed to fetch leaderboard:', error);
            leaderboardList.innerHTML = '<p>Failed to load leaderboard.</p>';
        });
}

function ensureUserRankBadge() {
    const header = document.querySelector('.leaderboard-container h2');
    if (!header) return null;

    let badge = document.getElementById('user-rank-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'user-rank-badge';
        badge.textContent = '#--';
        badge.title = 'Your current rank';
        header.appendChild(badge);
    }
    return badge;
}

function setUserRankBadge(rank) {
    const badge = ensureUserRankBadge();
    if (!badge) return;

    // Hide if unknown / no logged-in user
    if (rank == null || Number.isNaN(rank)) {
        badge.style.display = 'none';
        return;
    } else {
        badge.style.display = 'inline-flex';
    }

    badge.textContent = `#${rank}`;
    badge.classList.remove('gold', 'silver', 'bronze', 'black');

    if (rank === 1) badge.classList.add('gold');
    else if (rank === 2) badge.classList.add('silver');
    else if (rank === 3) badge.classList.add('bronze');
    else badge.classList.add('black');
}


let currentLeaders = [];
let previousRanks = {};

function updateLeaderboard() {
    console.log('Updating leaderboard from users/...');

    const leaderboardList = document.querySelector('.leaderboard-container .leaderboard-list');
    if (!leaderboardList) return;

    database.ref('users').once('value')
        .then(snapshot => {
            const newLeaders = [];
            snapshot.forEach(child => {
                const gameState = child.val().gameState;
                if (gameState) {
                    newLeaders.push({
                        uid: child.key,
                        username: gameState.username || 'Anonymous',
                        rebirthCount: gameState.rebirthCount || 0,
                        gold: gameState.gold || 0,
                        ballCounts: gameState.ballCounts || {},
                        totalUpgrades: gameState.stats?.totalUpgrades || 0,
                        idleGoldPerSecond: gameState.idleGoldPerSecond || 0.5,
                        ballUpgrades: gameState?.ballUpgrades || {},
                        stats: gameState?.stats || {}
                    });
                }
            });

            newLeaders.sort((a, b) => b.rebirthCount - a.rebirthCount || b.gold - a.gold);

            leaderboardList.innerHTML = '';
            const currentUser = auth.currentUser;

            // Add chat preview at the top
            const chatPreview = document.createElement('div');
            chatPreview.className = 'chat-preview';
            chatPreview.innerHTML = `
                <div class="chat-preview-header">
                    <span>Global Chat <span id="chatBadge" class="chat-badge" style="display:none;">0</span></span>
                </div>
                <div class="chat-preview-message" id="last-chat-message">${lastChatMessage}</div>
            `;
            chatPreview.addEventListener('click', () => {
                document.getElementById('chatPopup').style.display = 'flex';
                chatOpen = true;
                markChatAsRead();
            });
            chatPreview.id = "chatBtn";
            leaderboardList.appendChild(chatPreview);

            newLeaders.forEach((leader, index) => {
                const newRank = index + 1;
                const oldRank = previousRanks[leader.uid];

                // 🔥 Detect rank improvement
                if (oldRank && newRank < oldRank) {
                    showNewRankToast(leader.username, newRank);
                }

                previousRanks[leader.uid] = newRank;

                const entry = document.createElement('div');
                entry.setAttribute('data-uid', leader.uid);
                entry.className = `leaderboard-card rank-${newRank}${currentUser && leader.uid === currentUser.uid ? ' current-user' : ''}`;
                entry.innerHTML = `
        <span class="rank">${newRank}</span>
        <div class="user-and-info">
            <span class="username">${leader.username}</span>
                        <span class="info">${leader.rebirthCount} Rebirths | ${formatNumber(leader.gold)} Gold</span>
        </div>
    `;
                entry.addEventListener('click', () => showUserDetails({ ...leader, rank: newRank }));
                leaderboardList.appendChild(entry);
            });

            let userRank = null;
            if (currentUser) {
                const idx = newLeaders.findIndex(l => l.uid === currentUser.uid);
                if (idx !== -1) userRank = idx + 1;
            }
            setUserRankBadge(userRank);

            currentLeaders = newLeaders;
        })
        .catch(error => {
            console.error('Failed to fetch leaderboard:', error);
            leaderboardList.innerHTML = '<p>Failed to load leaderboard.</p>';
        });
}

const newRankToastStyle = document.createElement('style');
newRankToastStyle.innerHTML = `
#newranktoast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.newranktoast {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid #444;
  padding: 12px 16px;
  margin-top: 10px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  min-width: 300px;
  animation: slideInRight 0.5s ease forwards;
}

.newranktoast-rank-circle {
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #4caf50;
  color: #fff;
  font-weight: bold;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.newranktoast-rank-circle img {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
}

.newranktoast-content h4 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #222;
}

.newranktoast-content p {
  margin: 2px 0 0;
  font-size: 14px;
  color: #555;
}

@keyframes slideInRight {
  from { transform: translateX(120%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
`;
document.head.appendChild(newRankToastStyle);

function showNewRankToast(userName, newRank) {
    const container = document.getElementById("newranktoast-container") || createNewRankToastContainer();

    const toast = document.createElement("div");
    toast.classList.add("newranktoast");

    toast.innerHTML = `
    <div class="newranktoast-rank-circle">
      ${newRank}
      <img src="./public/green.png" alt="Rank Up">
    </div>
    <div class="newranktoast-content">
      <h4>${userName} just climbed the leaderboard!</h4>
      <p>They’re now ranked <b>#${newRank}</b>. Who can stop them?</p>
    </div>
  `;

    container.appendChild(toast);

    // Auto-remove after 5s
    setTimeout(() => {
        toast.style.transition = "opacity 0.5s, transform 0.5s";
        toast.style.opacity = "0";
        toast.style.transform = "translateX(120%)";
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

function createNewRankToastContainer() {
    const container = document.createElement("div");
    container.id = "newranktoast-container";
    document.body.appendChild(container);
    return container;
}

function getRankName(rebirths) {
    if (rebirths <= 5) return { name: "Noob", color: "#4A4A4A" }; // Dark Gray
    if (rebirths <= 10) return { name: "Beginner", color: "#008080" }; // Teal
    if (rebirths <= 20) return { name: "Amateur", color: "#808000" }; // Olive
    if (rebirths <= 50) return { name: "Skilled", color: "#000080" }; // Navy
    if (rebirths <= 100) return { name: "Pro", color: "#DC143C" }; // Crimson
    if (rebirths <= 200) return { name: "Master", color: "#4B0082" }; // Indigo
    if (rebirths <= 500) return { name: "Grandmaster", color: "#006400" }; // Dark Green
    if (rebirths <= 1000) return { name: "Legend", color: "#800080" }; // Purple
    return { name: "Immortal", color: "#1E90FF" }; // Deep Blue
}

function getRankClass(rank) {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "bronze";
    return "black";
}


function getRankDetails(rankName) {
    const rankDetails = {
        Noob: { range: "0–5 rebirths", description: "Starting your journey, learning the ropes!" },
        Beginner: { range: "6–10 rebirths", description: "Gaining confidence, finding your style." },
        Amateur: { range: "11–20 rebirths", description: "Showing promise, ready for bigger challenges." },
        Skilled: { range: "21–50 rebirths", description: "Honed skills, a force to be reckoned with." },
        Pro: { range: "51–100 rebirths", description: "Professional prowess, dominating the game." },
        Master: { range: "101–200 rebirths", description: "Mastery achieved, a true expert." },
        Grandmaster: { range: "201–500 rebirths", description: "Legendary skill, revered by all." },
        Legend: { range: "501–1000 rebirths", description: "A living legend, etched in history." },
        Immortal: { range: "1001+ rebirths", description: "Beyond mortal limits, an eternal icon." }
    };
    return rankDetails[rankName] || { range: "Unknown", description: "No details available." };
}

function showRankTooltip(rankName, rankColor) {
    const overlay = document.createElement('div');
    overlay.className = 'rank-tooltip-overlay';
    const details = getRankDetails(rankName);

    overlay.innerHTML = `
        <div style="background:#fff; border:2px solid #444; border-radius:10px; padding:20px; max-width:300px; text-align:center; position:relative;">
            <button class="close-btn" style="position:absolute; top:10px; right:10px; background:none; border:none; font-size:18px; cursor:pointer;">✖</button>
            <h3 style="margin:0 0 10px; font-size:20px; font-weight:700; color:${rankColor};">${rankName}</h3>
            <p style="margin:0 0 10px; font-size:16px; font-weight:600; color:#000;">${details.range}</p>
            <p style="margin:0; font-size:14px; color:#000;">${details.description}</p>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close behavior
    overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function getRankDetails(rankName) {
    const rankDetails = {
        Noob: { range: "0–5 rebirths", description: "Starting your journey, learning the ropes!" },
        Beginner: { range: "6–10 rebirths", description: "Gaining confidence, finding your style." },
        Amateur: { range: "11–20 rebirths", description: "Showing promise, ready for bigger challenges." },
        Skilled: { range: "21–50 rebirths", description: "Honed skills, a force to be reckoned with." },
        Pro: { range: "51–100 rebirths", description: "Professional prowess, dominating the game." },
        Master: { range: "101–200 rebirths", description: "Mastery achieved, a true expert." },
        Grandmaster: { range: "201–500 rebirths", description: "Legendary skill, revered by all." },
        Legend: { range: "501–1000 rebirths", description: "A living legend, etched in history." },
        Immortal: { range: "1001+ rebirths", description: "Beyond mortal limits, an eternal icon." }
    };
    return rankDetails[rankName] || { range: "Unknown", description: "No details available." };
}

function showRankTooltip(rankName, rankColor, rankElement) {
    // Remove existing tooltip if any
    const existingTooltip = document.querySelector('.rank-tooltip-overlay');
    if (existingTooltip) existingTooltip.remove();

    const overlay = document.createElement('div');
    overlay.className = 'rank-tooltip-overlay';
    const details = getRankDetails(rankName);

    // Get rank element's position
    const rect = rankElement.getBoundingClientRect();
    const topPosition = rect.top - 120; // Position above rank (adjust as needed)
    const leftPosition = rect.left + (rect.width / 2) - 150; // Center horizontally (half of tooltip width)

    overlay.innerHTML = `
        <div style="background:#fff; border:2px solid #444; border-radius:10px; padding:20px; max-width:300px; text-align:center; position:absolute; top:${topPosition}px; left:${leftPosition}px; box-shadow:0 4px 8px rgba(0,0,0,0.2); z-index:1000;">
            <h3 style="margin:0 0 10px; font-size:20px; font-weight:700; color:${rankColor};">${rankName}</h3>
            <p style="margin:0 0 10px; font-size:16px; font-weight:600; color:#000;">${details.range}</p>
            <p style="margin:0; font-size:14px; color:#000;">${details.description}</p>
        </div>
    `;

    document.body.appendChild(overlay);

    // Hide tooltip on mouseleave
    rankElement.addEventListener('mouseleave', () => overlay.remove());
}


function showUserDetails(leader) {
    const overlay = document.createElement('div');
    overlay.className = 'user-details-overlay';

    const rank = getRankName(leader.rebirthCount);
    const rankName = rank.name;
    const rankColor = rank.color;
    const rankClass = getRankClass(leader.rank);

    // ✅ Use ballUpgrades instead of ballCounts
    const ballUpgrades = leader.ballUpgrades || {};
    const topBalls = Object.entries(ballUpgrades)
        .sort((a, b) => (b[1].level || 0) - (a[1].level || 0))
        .slice(0, 4);

    const stats = leader.stats || {};
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };

    overlay.innerHTML = `
        <div class="user-details-popup">
            <button class="close-btn">✖</button>

            <!-- Top Section -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;color:#000;">
                <div class="rank-circle ${rankClass}" style="font-size:25px;">#${leader.rank}</div>

                <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;align-items:center;gap:0;">
                        <span class="username" style="font-size:26px; margin:0; font-weight:900; display:inline-block; width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${leader.username}
                        </span>
                    </div>

                    <!-- Rebirths + Rank side by side -->
                    <div style="display:flex;gap:20px;margin:0 5px;">
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <span class="rebirth-count" style="font-size:22px;font-weight:900;margin:0;">${leader.rebirthCount}</span>
                            <span class="rebirth-label" style="font-size:15px;font-weight:400;margin:0;">Rebirths</span>
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <span class="rebirth-count rank-tooltip-trigger" style="font-size:22px;font-weight:900;margin:0;color:${rankColor};cursor:pointer;" 
                                  onmouseenter="showRankTooltip('${rankName}', '${rankColor}', this)">
                                  ${rankName}
                            </span>
                            <span class="rebirth-label" style="font-size:15px;font-weight:400;margin:0;">Rank</span>
                        </div>
                    </div>
                </div>
            </div>

            <hr style="border:1px solid #444; opacity:0.3; margin:15px 0;">

            <!-- Favourite Balls -->
            <div style="margin-top:10px;">
                <h4 style="margin:0 0 8px;font-size:15px;font-weight:600;color:#000;">Favourite Balls</h4>
                <div style="display:flex;gap:10px;justify-content:center;white-space:nowrap;">
                    ${topBalls.map(([ball, data]) => `
                        <div style="text-align:center;">
                            <canvas id="fav-${ball}-canvas" width="60" height="60" style="border:2px solid #444;"></canvas>
                            <div style="font-size:15px;margin-top:4px;color:#000;font-weight:700;">
                                ${formatBallText(ball)}
                                <br>
                                <p style="font-size:13px;font-weight:400;">Lv ${data.level}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Player Stats -->
            <div style="margin-top:15px;">
                <h4 style="margin:0 0 8px;font-size:15px;font-weight:600;color:#000;">Player Stats</h4>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;text-align:center;">
                    <div style="background:transparent;border:1px solid #000;color:#000;padding:8px;border-radius:8px;">
                        <div style="font-size:18px;font-weight:700;">${formatNumber(stats.totalBallsPurchased ?? 0)}</div>
                        <div style="font-size:13px;">Balls Purchased</div>
                    </div>
                    <div style="background:transparent;border:1px solid #000;color:#000;padding:8px;border-radius:8px;">
                        <div style="font-size:18px;font-weight:700;">${formatNumber(stats.totalBricksBroken ?? 0)}</div>
                        <div style="font-size:13px;">Bricks Broken</div>
                    </div>
                    <div style="background:transparent;border:1px solid #000;color:#000;padding:8px;border-radius:8px;">
                        <div style="font-size:18px;font-weight:700;">${formatNumber(stats.totalDonated ?? 0)}</div>
                        <div style="font-size:13px;">Gold Donated</div>
                    </div>
                    <div style="background:transparent;border:1px solid #000;color:#000;padding:8px;border-radius:8px;">
                        <div style="font-size:18px;font-weight:700;">${formatTime(stats.totalPlayTime ?? 0)}</div>
                        <div style="font-size:13px;">Play Time</div>
                    </div>
                    <div style="background:transparent;border:1px solid #000;color:#000;padding:8px;border-radius:8px;">
                        <div style="font-size:18px;font-weight:700;">${formatNumber(stats.totalUpgrades ?? 0)}</div>
                        <div style="font-size:13px;">Total Upgrades</div>
                    </div>
                </div>
            </div>

            <div id="donation-container" style="display:none; margin-top:20px;">
                <input type="number" id="donation-amount" placeholder="Enter gold to donate" min="1" 
                       style="width:100%; padding:8px; margin-bottom:-10px; border:1px solid #444; border-radius:5px; background:#e9dcaf; color:#000; box-sizing:border-box;">
            </div>
            <button id="donate-btn" onclick="toggleDonationInput('${leader.uid}')" style="margin-top:15px;">Donate Gold</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close behavior for user details
    overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // ✅ Draw ball previews with correct colors
    topBalls.forEach(([ball]) => {
        const canvasId = `fav-${ball}-canvas`;
        switch (ball) {
            case 'basic': drawBallPreview(canvasId, 'gray', 8); break;
            case 'sniper': drawBallPreview(canvasId, 'blue', 8); break;
            case 'big': drawBallPreview(canvasId, 'green', 12); break;
            case 'explosion': drawBallPreview(canvasId, 'orange', 8); break;
            case 'multiplying': drawBallPreview(canvasId, 'purple', 8); break;
            case 'auto': drawBallPreview(canvasId, 'black', 8); break;
            case 'cannonball': drawBallPreview(canvasId, 'darkgray', 8); break;
            case 'poison': drawBallPreview(canvasId, 'lime', 8); break;
            case 'snowball': drawBallPreview(canvasId, 'white', 8); break;
            case 'child': drawBallPreview(canvasId, 'purple', 4); break;
        }
    });
}

function formatBallText(ball) {
    // Define translations
    const translations = {
        cannonball: 'Cannon',
        explosion: 'Bomb'
    };

    // Check if the word needs translation, otherwise use the original
    const translated = translations[ball.toLowerCase()] || ball;

    // Capitalize the first letter
    return translated.charAt(0).toUpperCase() + translated.slice(1);
}


function toggleDonationInput(recipientUid) {
    const donationContainer = document.getElementById('donation-container');
    const donateBtn = document.getElementById('donate-btn');
    if (donationContainer.style.display === 'none') {
        donationContainer.style.display = 'block';
        const donationInput = document.getElementById('donation-amount');
        donationInput.focus();
        donationInput.addEventListener('input', () => {
            const amount = parseInt(donationInput.value) || 0;
            donateBtn.textContent = `Donate ${amount}G`;
            donateBtn.onclick = () => showDonationConfirm(recipientUid, amount);
        });
    } else {
        const amount = parseInt(document.getElementById('donation-amount').value) || 0;
        showDonationConfirm(recipientUid, amount);
    }
}

// New function to show donation confirmation popup
function showDonationConfirm(recipientUid, amount) {
    if (amount <= 0 || isNaN(amount)) {
        showToast('Please enter a valid donation amount!');
        return;
    }
    if (gold < amount) {
        showToast('Not enough gold to donate!');
        return;
    }
    const user = auth.currentUser;
    if (!user || user.uid === recipientUid) {
        showToast('Cannot donate to yourself or as a guest!');
        return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
        <div class="login-popup">
            <h2>Confirm Donation</h2>
            <p>Donate ${amount} gold to this player?</p>
            <div class="button-group">
                <button id="proceed-donation">Proceed</button>
                <button id="cancel-donation">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#proceed-donation').addEventListener('click', () => {
        proceedDonation(recipientUid, amount);
        overlay.remove();
    });
    overlay.querySelector('#cancel-donation').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// New function to handle donation
function proceedDonation(recipientUid, amount) {
    const user = auth.currentUser;
    if (!user || isGuest) {
        showLoginPopupForSave();
        return;
    }
    
    if (gold < amount) {
        showToast('Not enough gold to donate!');
        return;
    }
    
    // Use transactions to ensure atomic updates
    const senderRef = database.ref('users/' + user.uid + '/gameState/gold');
    const recipientRef = database.ref('users/' + recipientUid + '/gameState/gold');
    
    // Update sender
    senderRef.transaction(currentGold => {
        if (currentGold === null) return;
        if (currentGold < amount) return; // Abort if not enough
        return currentGold - amount;
    }).then(senderResult => {
        if (!senderResult.committed) {
            showToast('Insufficient gold or transaction failed!');
            return;
        }
        
        // Update recipient
        recipientRef.transaction(currentGold => {
            return (currentGold || 0) + amount;
        }).then(recipientResult => {
            if (recipientResult.committed) {
                gold -= amount;
                showToast(`Successfully donated ${amount} gold!`);
                updateUI();
                updateLeaderboard();
                stats.totalDonated = (stats.totalDonated || 0) + amount;
                updateMilestones();
                
                // Notify recipient
                database.ref('reload/' + recipientUid).set(true).catch(() => {});
            } else {
                showToast('Failed to complete donation!');
                gold += amount;
                updateUI();
            }
        }).catch(error => {
            showToast('Donation failed: ' + error.message);
            gold += amount;
            updateUI();
        });
    }).catch(error => {
        showToast('Donation error: ' + error.message);
        updateUI();
    });
}

// Show login popup when guest tries to save
function showLoginPopupForSave() {
    // Remove any existing login overlays to prevent stacking
    document.querySelectorAll('.login-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
        <div class="login-popup">
            <h2>Login to Save</h2>
            <p>You are playing as a guest. Login or sign up to save your progress.</p>
            <input type="email" id="email" placeholder="Email">
            <input type="password" id="password" placeholder="Password">
            <div class="button-group">
                <button id="login-btn">Login</button>
                <button id="cancel-btn">Cancel</button>
            </div>
            <p>Don't have an account? <a href="#" id="signup-link">Sign Up</a></p>
        </div>
    `;
    document.body.appendChild(overlay);
    saveToLocalStorage(); // Save progress to local storage
    const loginBtn = overlay.querySelector('#login-btn');
    const signupLink = overlay.querySelector('#signup-link');
    const cancelBtn = overlay.querySelector('#cancel-btn');
    loginBtn.addEventListener('click', () => {
        loginBtn.disabled = true;
        login();
    });
    signupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSignUpPopup(overlay);
    });
    cancelBtn.addEventListener('click', () => {
        cancelBtn.disabled = true;
        overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

function saveToLocalStorage() {
    const gameState = {
        gold,
        level,
        ballCounts: {
            sniper: balls.filter(b => b.type === 'sniper').length,
            big: balls.filter(b => b.type === 'big').length,
            explosion: balls.filter(b => b.type === 'explosion').length,
            multiplying: balls.filter(b => b.type === 'multiplying').length,
            child: balls.filter(b => b.type === 'child').length
        },
        autoBalls: autoBalls.length,
        ballPrices,
        autoBallPrice,
        idleGoldPerSecond,
        ballUpgrades,
        stats,
        username,
        rebirthCount,
        cosmetics,
        settings: {
            backgroundMusic: settings.backgroundMusic,
            backgroundMusicVolume: settings.backgroundMusicVolume
        },

        globalUpgrades: {
            speedBoost: {
                active: globalUpgrades.speedBoost.active,
                activationTime: globalUpgrades.speedBoost.active ? Date.now() : null
            },
            goldBoost: {
                active: globalUpgrades.goldBoost.active,
                activationTime: globalUpgrades.goldBoost.active ? Date.now() : null
            }
        }
    };
    localStorage.setItem('brickerGameState', JSON.stringify(gameState));
}

// Load game state
function loadGameState(uid) {
    database.ref('users/' + uid + '/gameState').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                gold = data.gold || 20;
                level = data.level || 1;
                ballPrices.basic = data.ballPrices?.basic || 25;
                ballPrices.sniper = data.ballPrices?.sniper || 50;
                ballPrices.big = data.ballPrices?.big || 75;
                ballPrices.explosion = data.ballPrices?.explosion || 100;
                ballPrices.multiplying = data.ballPrices?.multiplying || 125;
                ballPrices.cannonball = data.ballPrices?.cannonball || 150;
                ballPrices.poison = data.ballPrices?.poison || 175;
                ballPrices.snowball = data.ballPrices?.snowball || 200;
                autoBallPrice = data.autoBallPrice || 200;
                idleGoldPerSecond = data.idleGoldPerSecond || 0.5;
                rebirthCount = data.rebirthCount || 0;
                autoRebirthOwned = data.autoRebirthOwned || false;
                autoRebirthEnabled = !!data.autoRebirthEnabled;

                ballUpgrades = data.ballUpgrades || {
                    basic: {
                        level: 1,
                        speed: 3.5,
                        damage: 1
                    },
                    sniper: {
                        level: 1,
                        speed: 4.5,
                        damage: 1
                    },
                    big: {
                        level: 1,
                        speed: 2.7,
                        damage: 1
                    },
                    explosion: {
                        level: 1,
                        speed: 2.7,
                        damage: 2
                    },
                    multiplying: {
                        level: 1,
                        speed: 2.7,
                        damage: 1
                    },
                    child: {
                        level: 1,
                        speed: 3.6,
                        damage: 1
                    },
                    cannonball: {
                        level: 1,
                        speed: 3.0,
                        damage: 3
                    },
                    poison: {
                        level: 1,
                        speed: 3.5,
                        damage: 1
                    },
                    snowball: {
                        level: 1,
                        speed: 3.5,
                        damage: 1
                    }
                };
                ballCounts = data.ballCounts || {
                    basic: 0,
                    sniper: 0,
                    big: 0,
                    explosion: 0,
                    multiplying: 0,
                    child: 0,
                    cannonball: 0,
                    poison: 0,
                    snowball: 0
                };
                stats = data.stats || {
                    totalPlayTime: 0,
                    totalBallsPurchased: 0,
                    totalUpgrades: 0,
                    totalBricksBroken: 0,
                    startTime: Date.now()
                };
                username = data.username || '';
                cosmetics = data.cosmetics || {
                    nebulaSkin: false,
                    fireTrail: false,
                    iceTrail: false,
                    rainbowSkin: false,
                    bundleSilver: false,
                    bundleGold: false,
                    bundlePlatinum: false
                };
                mascotsOwned = Array.isArray(data.mascotsOwned) ? data.mascotsOwned : (data.mascotsOwned || []);
                selectedMascotId = data.selectedMascotId || null;

                syncBallsWithCounts();
                autoBalls = [];
                for (let i = 0; i < (data.autoBalls || 0); i++) {
                    autoBalls.push(new AutoBall());
                }
                const now = Date.now();
                if (data.globalUpgrades) {
                    if (data.globalUpgrades.speedBoost.active) {
                        const elapsed = now - data.globalUpgrades.speedBoost.activationTime;
                        if (elapsed < 60000) {
                            globalUpgrades.speedBoost.active = true;
                            setTimeout(() => {
                                globalUpgrades.speedBoost.active = false;
                                showToast('Speed boost expired!');
                            }, 60000 - elapsed);
                        } else {
                            globalUpgrades.speedBoost.active = false;
                        }
                    }
                    if (data.globalUpgrades.goldBoost.active) {
                        const elapsed = now - data.globalUpgrades.goldBoost.activationTime;
                        if (elapsed < 60000) {
                            globalUpgrades.goldBoost.active = true;
                            setTimeout(() => {
                                globalUpgrades.goldBoost.active = false;
                                showToast('Gold boost expired!');
                            }, 60000 - elapsed);
                        } else {
                            globalUpgrades.goldBoost.active = false;
                        }
                    }
                }
                // ---- SETTINGS: hydrate from DB, then fallback to local, then apply ----
                if (data.settings) {
                    if (typeof data.settings.backgroundMusic !== 'undefined') {
                        settings.backgroundMusic = !!data.settings.backgroundMusic;
                    }
                    if (typeof data.settings.backgroundMusicVolume === 'number') {
                        settings.backgroundMusicVolume = data.settings.backgroundMusicVolume;
                    }
                } else {
                    // Fallback to local
                    const localData = JSON.parse(localStorage.getItem("brickerGameState"));
                    if (localData?.settings) {
                        if (typeof localData.settings.backgroundMusic !== 'undefined') {
                            settings.backgroundMusic = !!localData.settings.backgroundMusic;
                        }
                        if (typeof localData.settings.backgroundMusicVolume === 'number') {
                            settings.backgroundMusicVolume = localData.settings.backgroundMusicVolume;
                        }
                    }
                }

                // Play/pause exactly once here
                applyMusicSettings();


                updateUI();
                renderMascots();     // ensures shop tabs (Normal/Rare/Legendary/Goofy) show items
                renderMyMascots();   // ensures My Mascots displays owned ones
                updateMascotsPreview();
                applyMascotEffects();


                loadMilestones();
                spawnBricks();
                updateBallOptionsUI();
                if (!gameStarted) {
                    startGame();
                    gameStarted = true;
                }
            } else {
                startGame();
            }
        })
        .catch((error) => {
            showToast('Failed to load game: ' + error.message);
            startGame();
        });
}

function syncBallsWithCounts() {
    const currentCounts = {
        basic: balls.filter(b => b.type === 'basic').length,
        sniper: balls.filter(b => b.type === 'sniper').length,
        big: balls.filter(b => b.type === 'big').length,
        explosion: balls.filter(b => b.type === 'explosion').length,
        multiplying: balls.filter(b => b.type === 'multiplying').length,
        child: balls.filter(b => b.type === 'child').length,
        cannonball: balls.filter(b => b.type === 'cannonball').length,
        poison: balls.filter(b => b.type === 'poison').length,
        snowball: balls.filter(b => b.type === 'snowball').length
    };
    Object.keys(ballCounts).forEach(type => {
        while (currentCounts[type] > ballCounts[type]) {
            const index = balls.findIndex(b => b.type === type);
            if (index !== -1) {
                balls.splice(index, 1);
                currentCounts[type]--;
            }
        }
    });
    Object.keys(ballCounts).forEach(type => {
        while (currentCounts[type] < ballCounts[type] && balls.length < maxBalls) {
            const radius = type === 'big' ? 12 : type === 'child' ? 4 : 8;
            const speed = ballUpgrades[type].speed;
            const color = {
                basic: 'gray',
                sniper: 'blue',
                big: 'green',
                explosion: 'orange',
                multiplying: 'purple',
                child: 'purple',
                cannonball: 'darkgray',
                poison: 'lime',
                snowball: 'white'
            }[type];
            balls.push(new Ball(
                canvas.width / 2,
                canvas.height / 2,
                radius,
                speed * (Math.random() * 2 - 1),
                speed * (Math.random() * 2 - 1),
                color,
                type
            ));
            currentCounts[type]++;
        }
    });
    updateUI();
}

let gameStarted = false;

// Start the game
function startGame() {
    if (!gameStarted) {
        spawnBricks();
        gameLoop();
        setInterval(saveGameState, 30000);
        setInterval(updatePlayTime, 1000);
        setInterval(updateLeaderboard, 5000);
        saveButton.addEventListener('click', saveGameState);
        document.getElementById('my-balls-btn').addEventListener('click', showMyBallsPopup);
        document.getElementById('settings-btn').addEventListener('click', showSettingsPopup);
        document.getElementById('weapons-btn').addEventListener('click', () => {
            if (gold >= weaponCost) {
                gold -= weaponCost;
                deployRandomWeapon();
                updateUI();
            } else {
                showToast('Not enough gold!');
            }
        });
        updateLeaderboard();
        gameStarted = true;
    }
}

// Update play time
function updatePlayTime() {
    const currentTime = Date.now();
    stats.totalPlayTime += (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;
}

// Generate passive gold
function generatePassiveGold() {
    const multiplier = globalUpgrades.goldBoost.active ? 2 : 1;
    gold += idleGoldPerSecond * multiplier;
    updateUI();
    updateMilestones();
}
setInterval(generatePassiveGold, 1000);

// Simple spatial grid for collision optimization
const gridSize = 100;

function getGridCell(x, y) {
    return {
        col: Math.floor(x / gridSize),
        row: Math.floor(y / gridSize)
    };
}

function getNearbyBricks(ball) {
    const cell = getGridCell(ball.x, ball.y);
    const nearby = [];
    for (let row = cell.row - 1; row <= cell.row + 1; row++) {
        for (let col = cell.col - 1; col <= cell.col + 1; col++) {
            bricks.forEach(brick => {
                const brickCell = getGridCell(brick.x + brick.width / 2, brick.y + brick.height / 2);
                if (brickCell.row === row && brickCell.col === col) {
                    nearby.push(brick);
                }
            });
        }
    }
    return nearby;
}

// Ball class
class Ball {
    constructor(x, y, radius, dx, dy, color, type) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.dx = dx;
        this.dy = dy;
        this.color = color;
        this.type = type;
        this.powerUpUsed = false;
        this.hasBouncedWall = false;
        this.bounceCount = type === 'snowball' ? 0 : null; // Track bounces for snowball
        this.poisonedBricks = type === 'poison' ? new Set() : null; // Track poisoned bricks
    }

    move() {
        const speedMultiplier = globalUpgrades.speedBoost.active ? 2 : 1;
        this.x += this.dx * speedMultiplier;
        this.y += this.dy * speedMultiplier;
        let speed = ballUpgrades[this.type].speed;
        if (this.type === 'snowball') {
            speed += this.bounceCount * 0.1; // Increase speed per bounce
        }

        if (this.x + this.radius > canvas.width) {
            this.dx = -this.dx;
            this.x = canvas.width - this.radius - 2;
            if (this.type === 'snowball') this.bounceCount++;
            if (this.type === 'sniper') this.redirectToClosestBrick();
        } else if (this.x - this.radius < 0) {
            this.dx = -this.dx;
            this.x = this.radius + 2;
            if (this.type === 'snowball') this.bounceCount++;
            if (this.type === 'sniper') this.redirectToClosestBrick();
        }

        if (this.y + this.radius > canvas.height) {
            this.dy = -this.dy;
            this.y = canvas.height - this.radius - 2;
            if (this.type === 'snowball') this.bounceCount++;
            if (this.type === 'sniper') this.redirectToClosestBrick();
        } else if (this.y - this.radius < 0) {
            this.dy = -this.dy;
            this.y = this.radius + 2;
            if (this.type === 'snowball') this.bounceCount++;
            if (this.type === 'sniper') this.redirectToClosestBrick();
        }

        bricks.forEach(brick => {
            if (
                this.x + this.radius > brick.x &&
                this.x - this.radius < brick.x + brick.width &&
                this.y + this.radius > brick.y &&
                this.y - this.radius < brick.y + brick.height
            ) {
                const dx = this.x - (brick.x + brick.width / 2);
                const dy = this.y - (brick.y + brick.height / 2);
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.dx = -this.dx;
                } else {
                    this.dy = -this.dy;
                }
                this.handleBrickCollision(brick);
            }
        });
    }

    redirectToClosestBrick() {
        if (this.type === 'sniper') {
            const closestBrick = this.getClosestBrick();
            if (closestBrick) {
                const angle = Math.atan2(closestBrick.y + brickHeight / 2 - this.y, closestBrick.x + brickWidth / 2 - this.x);
                this.dx = Math.cos(angle) * ballUpgrades.sniper.speed;
                this.dy = Math.sin(angle) * ballUpgrades.sniper.speed;
            }
        }
    }

    getClosestBrick() {
        let closestBrick = null;
        let closestDistance = Infinity;
        bricks.forEach(brick => {
            const distance = Math.hypot(
                this.x - (brick.x + brick.width / 2),
                this.y - (brick.y + brick.height / 2)
            );
            if (distance < closestDistance) {
                closestDistance = distance;
                closestBrick = brick;
            }
        });
        return closestBrick;
    }

    handleBrickCollision(brick) {
        let damage = ballUpgrades[this.type].damage;
        if (this.type === 'snowball') {
            // Increase damage by 1.5x
            ballUpgrades[this.type].damage *= 1.0000000001;
            balls.push(
                // Keep existing snowball behavior
            );
        }
        if (this.type === 'cannonball') {
            brick.health -= damage; // High damage
            if (brick.health <= 0) {
                bricks = bricks.filter(b => b !== brick);
                gold += 5;
                if (powerUps.length < maxPowerUps) spawnPowerUp();
                updateUI();
            }
            return; // Cannonball smashes through without bouncing
        }
        if (this.type === 'explosion') {
            brick.health -= damage;
            const nearbyBricks = getNearbyBricks(this);
            nearbyBricks.forEach(b => {
                if (b !== brick) {
                    const distance = Math.hypot(b.x - brick.x, b.y - brick.y);
                    if (distance < 60) {
                        b.health -= Math.floor(damage / 2);
                        if (b.health < 0) b.health = 0; // Prevent negative health
                    }
                }
            });
        } else {
            brick.health -= damage;
        }
        if (brick.health <= 0) {
            stats.totalBricksBroken = (stats.totalBricksBroken || 0) + 1;

            bricks = bricks.filter(b => b !== brick);
            gold += 5;
            if (powerUps.length < maxPowerUps) spawnPowerUp();
            updateUI();
        }
        if (this.type === 'multiplying' && balls.length < maxBalls) {
            balls.push(new Ball(
                this.x,
                this.y,
                this.radius / 2,
                ballUpgrades.child.speed * (Math.random() * 2 - 1),
                ballUpgrades.child.speed * (Math.random() * 2 - 1),
                this.color,
                'child'
            ));
        } else if (this.type === 'child') {
            balls = balls.filter(ball => ball !== this);
        }
    }

    draw() {
        drawTrail(this);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();

        if (cosmetics.activeTrail) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = cosmetics.activeTrail === "legendary" ? "gold" :
                cosmetics.activeTrail === "rare" ? "blueviolet" :
                    cosmetics.activeTrail === "goofy" ? "pink" : "white";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
    }
}


// Brick class
/*      class Brick {
          constructor(x, y, health) {
              this.x = x;
              this.y = y;
              this.width = brickWidth;
              this.height = brickHeight;
              // Adjust health based on idleGoldPerSecond and totalUpgrades
              const difficultyFactor = 1 + (idleGoldPerSecond * 0.5) + (stats.totalUpgrades * 0.05);
              this.health = Math.floor((health + Math.floor(level / 2)) * difficultyFactor);
              this.formatHealth = formatNumber(health);
              this.hover = false;
              if (cosmetics.activeEffect) {
                  spawnMascotEffect(this.x, this.y, cosmetics.activeEffect);
              }
 
 
          }
 
          takeDamage(damage) {
              this.health -= damage;
              if (this.health <= 0) {
                  // Brick destroyed → increment counter
                  stats.totalBricksBroken = (stats.totalBricksBroken || 0) + 1;
                  // remove brick from game here if you already have logic for that
              }
          }
 
          isCursorHovering(mouseX, mouseY) {
              return (
                  mouseX > this.x &&
                  mouseX < this.x + this.width &&
                  mouseY > this.y &&
                  mouseY < this.y + this.height
              );
          }
 
 
          draw() {
              ctx.fillStyle = `rgba(255, 0, 0, ${this.health / (3 + level / 2)})`;
              ctx.fillRect(this.x, this.y, this.width, this.height);
 
              ctx.fillStyle = '#fff';
              ctx.font = '18px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
 
              // Use formatted number for display only
              ctx.fillText(formatNumber(this.health), this.x + this.width / 2, this.y + this.height / 2);
 
              ctx.strokeStyle = '#333';
              ctx.lineWidth = 2;
              ctx.strokeRect(this.x, this.y, this.width, this.height);
              updateParticles(ctx);
          }
 
      }
*/

class Brick {
    constructor(x, y, health) {
        this.x = x;
        this.y = y;
        this.width = brickWidth;
        this.height = brickHeight;
        // Adjust health based on idleGoldPerSecond and totalUpgrades
        const difficultyFactor = 1 + (idleGoldPerSecond * 0.5) + (stats.totalUpgrades * 0.05);
        this.health = Math.floor((health + Math.floor(level / 2)) * difficultyFactor);
        this.formatHealth = formatNumber(health);
        this.hover = false;
        if (cosmetics.activeEffect) {
            spawnMascotEffect(this.x, this.y, cosmetics.activeEffect);
        }
    }

    /** Apply damage to this brick */
    takeDamage(damage) {
        this.health -= damage;

        if (this.health <= 0) {
            // Increment stats & rewards
            stats.totalBricksBroken = (stats.totalBricksBroken || 0) + 1;
            const index = bricks.indexOf(this);
            if (index !== -1) bricks.splice(index, 1);

            const goldReward = Math.max(1, Math.floor(idleGoldPerSecond));
            gold += goldReward;
            if (powerUps.length < maxPowerUps) spawnPowerUp();
            showToast(`Brick destroyed, +${formatNumber(goldReward)} gold`);
        }

        updateUI();

    }

    /** Check if mouse is inside this brick */
    isCursorHovering(mouseX, mouseY) {
        return (
            mouseX > this.x &&
            mouseX < this.x + this.width &&
            mouseY > this.y &&
            mouseY < this.y + this.height
        );
    }

    /** Draw this brick (with hover highlight) */
    draw() {
        // Slightly brighten when hovered
        const baseAlpha = this.health / (3 + level / 2);
        ctx.fillStyle = this.hover
            ? `rgba(255, 80, 80, ${Math.min(baseAlpha + 0.2, 1)})`
            : `rgba(255, 0, 0, ${baseAlpha})`;

        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#fff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(formatNumber(this.health), this.x + this.width / 2, this.y + this.height / 2);

        ctx.strokeStyle = this.hover ? '#ff0' : '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        updateParticles(ctx);
    }
}

/* === Global mouse handling for hover + click damage === */
let mousePos = { x: 0, y: 0 };

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    // update hover flags
    bricks.forEach(b => (b.hover = b.isCursorHovering(mousePos.x, mousePos.y)));
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // find top-most brick hit
    for (let i = bricks.length - 1; i >= 0; i--) {
        const b = bricks[i];
        if (b.isCursorHovering(clickX, clickY)) {
            b.takeDamage(Math.max(1, Math.floor(idleGoldPerSecond)));
            break;
        }
    }
});

/* ---------- Robust brick click/hover patch  ----------
Paste AFTER your Brick class and after bricks + canvas exist.
It will:
- handle CSS/dpr scaling
- log helpful debug info
- guard against overlays or missing globals
-----------------------------------------------------*/
(function initBrickClick() {
    function getCanvasElement() {
        // prefer existing global `canvas` if present, otherwise find first <canvas>
        if (typeof canvas !== 'undefined' && canvas instanceof HTMLCanvasElement) return canvas;
        const el = document.querySelector('canvas') || document.getElementById('gameCanvas');
        return el instanceof HTMLCanvasElement ? el : null;
    }

    function toCanvasCoords(canvasEl, clientX, clientY) {
        const rect = canvasEl.getBoundingClientRect();
        // account for canvas internal resolution vs CSS size
        const scaleX = canvasEl.width / rect.width;
        const scaleY = canvasEl.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
            rect
        };
    }

    function addListeners(canvasEl) {
        canvasEl.style.touchAction = canvasEl.style.touchAction || 'none'; // avoid touch scroll interference

        canvasEl.addEventListener('mousemove', (e) => {
            // convert to canvas coords
            const { x, y } = toCanvasCoords(canvasEl, e.clientX, e.clientY);
            if (!Array.isArray(window.bricks)) return;
            let anyHover = false;
            for (let i = 0; i < bricks.length; i++) {
                const b = bricks[i];
                if (!b) continue;
                b.hover = !!b.isCursorHovering(x, y);
                if (b.hover) anyHover = true;
            }
            // small debug (comment out if noisy)
            // console.debug('mousemove -> canvas coords', Math.round(x), Math.round(y), 'hover?', anyHover);
        });

        canvasEl.addEventListener('click', (e) => {
            console.groupCollapsed('Brick click debug');
            console.log('Raw click client coords:', e.clientX, e.clientY);

            // detect top element at pointer (quick overlay check)
            const topEl = document.elementFromPoint(e.clientX, e.clientY);
            console.log('Top element at pointer:', topEl && (topEl.tagName + (topEl.id ? '#' + topEl.id : '')));

            // if something other than the canvas is on top, warn
            if (topEl !== canvasEl && !canvasEl.contains(topEl)) {
                console.warn('Pointer target is NOT the canvas — an overlay might intercept clicks.');
            }

            if (!Array.isArray(window.bricks)) {
                console.warn('`bricks` is not defined or not an array.');
                console.groupEnd();
                return;
            }

            const { x, y } = toCanvasCoords(canvasEl, e.clientX, e.clientY);
            console.log('Translated canvas coords:', Math.round(x), Math.round(y));
            let hit = false;

            // iterate backward so top-most bricks (drawn last) are hit first
            for (let i = bricks.length - 1; i >= 0; i--) {
                const b = bricks[i];
                if (!b) continue;
                if (typeof b.isCursorHovering !== 'function') {
                    console.warn('brick.isCursorHovering missing for item at index', i);
                    continue;
                }
                if (b.isCursorHovering(x, y)) {
                    hit = true;
                    console.log('Hit brick index', i, 'health before:', b.health);

                    // call takeDamage if available; otherwise modify directly
                    if (typeof b.takeDamage === 'function') {
                        b.takeDamage(Math.max(1, Math.floor(idleGoldPerSecond)));
                    } else {
                        b.health -= (e.shiftKey ? 5 : 1);
                        if (b.health <= 0) {
                            bricks.splice(i, 1);
                        }
                        if (typeof updateUI === 'function') updateUI();
                    }

                    console.log('After hit -> health:', b.health);
                    break; // only hit one brick per click
                }
            }

            if (!hit) console.log('No brick found at that point.');
            console.groupEnd();
        });
    }

    function readyInit() {
        const canvasEl = getCanvasElement();
        if (!canvasEl) {
            // if we don't find a canvas, wait a bit (maybe created later) and retry once
            console.warn('No canvas found yet. Retrying in 200ms...');
            setTimeout(() => {
                const next = getCanvasElement();
                if (next) addListeners(next);
                else console.error('Still no <canvas> found. Make sure your game canvas exists and has been created before this script runs.');
            }, 200);
            return;
        }
        addListeners(canvasEl);
        console.log('Brick click handlers attached to canvas:', canvasEl);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', readyInit);
    } else {
        // DOM already ready
        setTimeout(readyInit, 0);
    }
})();


// BossBrick class
class BossBrick extends Brick {
    constructor(x, y) {
        super(x, y, 10 + Math.floor(level / 2));
        this.width = 100;
        this.height = 40;
        // Adjust boss health based on idleGoldPerSecond and totalUpgrades
        const difficultyFactor = 1 + (idleGoldPerSecond * 0.5) + (stats.totalUpgrades * 0.05);
        this.health = Math.floor((10 + Math.floor(level / 2)) * difficultyFactor);
    }

    draw() {
        ctx.fillStyle = 'darkred';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#fff';
        ctx.font = '15px Arial';
        ctx.textAlign = 'center'; // Center text horizontally
        ctx.textBaseline = 'middle'; // Center text vertically
        ctx.fillText(`Boss: ${formatNumber(this.health)}`, this.x + this.width / 2, this.y + this.height / 2); // Center text vertically
    }
}

// PowerUp class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type;
        this.active = true;
        this.spawnTime = Date.now();
    }

    draw() {
        if (!this.active) return;
        const pulse = 1 + 0.1 * Math.sin(Date.now() / 200);
        const width = this.width * pulse;
        const height = this.height * pulse;
        ctx.fillStyle = {
            gold: 'gold',
            speed: 'cyan',
            multiBall: 'magenta'
        }[this.type];
        ctx.fillRect(this.x - (width - this.width) / 2, this.y - (height - this.height) / 2, width, height);
    }

    collect() {
        if (Date.now() - this.spawnTime > 20000) {
            this.active = false;
            return;
        }
        balls.forEach(ball => {
            if (ball.powerUpUsed) return;
            if (
                ball.x + ball.radius > this.x &&
                ball.x - ball.radius < this.x + this.width &&
                ball.y + ball.radius > this.y &&
                ball.y - ball.radius < this.y + this.height
            ) {
                this.activatePowerUp(ball);
            }
        });
    }

    activatePowerUp(ball) {
        ball.powerUpUsed = true;
        if (this.type === 'gold') gold += 50;
        if (this.type === 'speed') {
            ball.dx *= 1.5;
            ball.dy *= 1.5;
        }
        if (this.type === 'multiBall' && balls.length < maxBalls) {
            balls.push(new Ball(ball.x, ball.y, ball.radius, -ball.dx, -ball.dy, ball.color, ball.type));
        }
        this.active = false;
        updateUI();
    }
}

// AutoBall class
class AutoBall {
    constructor() {
        const maxCols = 6;
        const centerX = canvas.width / 2;
        const gridWidth = maxCols * brickWidth;
        const gridLeft = centerX - gridWidth / 2;
        this.x = gridLeft + Math.random() * gridWidth;
        this.y = canvas.height - 30;
        this.radius = 8;
        this.dy = -5;
        this.color = 'black';
    }

    move() {
        const isBoostTime = isAutoBallBoostTime();
        const speedMultiplier = isBoostTime ? 7 : 5;
        const damageMultiplier = isBoostTime ? 2000 : 1000;
        this.y += this.dy * speedMultiplier;
        if (this.y < 0) {
            this.y = canvas.height - 30;
            const maxCols = 6;
            const centerX = canvas.width / 2;
            const gridWidth = maxCols * brickWidth;
            const gridLeft = centerX - gridWidth / 2;
            this.x = gridLeft + Math.random() * gridWidth;
        }
        const nearbyBricks = getNearbyBricks(this);
        nearbyBricks.forEach(brick => {
            if (
                this.x > brick.x &&
                this.x < brick.x + brick.width &&
                this.y > brick.y &&
                this.y < brick.y + brick.height
            ) {
                brick.health -= 1 * damageMultiplier;
                if (brick.health <= 0) {
                    bricks = bricks.filter(b => b !== brick);
                    gold += 5;
                    if (powerUps.length < maxPowerUps) spawnPowerUp();
                    updateUI();
                }
                this.y = canvas.height - 30;
                const maxCols = 6;
                const centerX = canvas.width / 2;
                const gridWidth = maxCols * brickWidth;
                const gridLeft = centerX - gridWidth / 2;
                this.x = gridLeft + Math.random() * gridWidth;
            }
        });
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}


const tips = [
    "Listen to the new sound track by Modric! More in settings!",
    "Click bricks to reduce their health by 1!",
    "Basic balls are standard balls that bounce off walls and break bricks.",
    "Sniper balls target the nearest brick on wall hits.",
    "Bomb balls deal splash damage to nearby bricks.",
    "Clones balls spawn a child ball on brick hit.",
    "Cannonballs smash through bricks with high damage.",
    "Poison balls infect bricks to take double damage.",
    "Snowballs gain power and speed with every bounce.",
    "Auto balls respawn at the bottom if they miss bricks.",
    "Auto balls are 10x stronger from 11 AM to 2 PM!",
    "Rebirth at level 100 to keep upgrades, boost gold.",
    "Rebirths increase max upgrade levels by 5.",
    "Power-ups spawn randomly when bricks are destroyed.",
    "Gold power-ups grant 50 gold instantly.",
    "Mass Destruction weapons cost 1000 gold.",
    "Donate gold to players via the leaderboard.",
    "Cosmetic bundles include skins and power-ups.",
    "Idle gold per second grows with rebirths.",
    "Save progress to avoid losing gold and upgrades.",
    "Check the leaderboard to see global rankings.",
    "Upgrade balls for permanent speed and damage boosts.",
    "Speed and Gold Boosts last 1 minute, use wisely!",
    "Instant Brick Destroy eliminates one brick for gold.",
    "Time Warp slows balls for 10 seconds."
];

let currentTipIndex = 0;
const tipsText = document.getElementById('tips-text');

function showNextTip() {
    tipsText.style.opacity = 0;
    setTimeout(() => {
        tipsText.textContent = tips[currentTipIndex];
        tipsText.style.opacity = 1;
        currentTipIndex = (currentTipIndex + 1) % tips.length;
    }, 500);
    setTimeout(showNextTip, 4000);
}

showNextTip();

// Spawn power-up
function spawnPowerUp() {
    if (Math.random() < 0.05 && powerUps.length < maxPowerUps) {
        let x, y, isOverlapping;
        do {
            x = Math.random() * (canvas.width - 20);
            y = Math.random() * (canvas.height - 20);
            isOverlapping = bricks.some(brick => {
                return (
                    x < brick.x + brick.width &&
                    x + 20 > brick.x &&
                    y < brick.y + brick.height &&
                    y + 20 > brick.y
                );
            });
        } while (isOverlapping);
        const type = ['gold', 'speed', 'multiBall'][Math.floor(Math.random() * 3)];
        powerUps.push(new PowerUp(x, y, type));
    }
}

// Spawn bricks
function spawnBricks() {
    const maxRows = 11;
    const maxCols = 6;
    if (bricks.length < maxBricks) {
        const rows = Math.min(level, maxRows);
        const cols = Math.min(5, maxCols);
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = canvas.width / 2 - (cols * brickWidth) / 2 + col * brickWidth;
                const y = canvas.height / 2 - (rows * brickHeight) / 2 + row * brickHeight;
                if (!bricks.some(b => b.x === x && b.y === y)) {
                    bricks.push(new Brick(x, y, level));
                }
            }
        }
    } else {
        bricks.forEach(brick => {
            brick.health += Math.floor(level / 2);
        });
    }
    if (level % 5 === 0 && !bricks.some(b => b instanceof BossBrick)) {
        bricks.push(new BossBrick(canvas.width / 2 - 50, canvas.height / 4));
    }
}

// Draw ball preview
function drawBallPreview(canvasId, color, radius) {
    const previewCanvas = document.getElementById(canvasId);
    const previewCtx = previewCanvas.getContext('2d');
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.beginPath();
    previewCtx.arc(previewCanvas.width / 2, previewCanvas.height / 2, radius, 0, Math.PI * 2);
    previewCtx.fillStyle = color;
    previewCtx.fill();
    previewCtx.closePath();
}

function updateUI() {
    goldDisplay.textContent = formatNumber(gold);
    levelDisplay.textContent = level;
    rebirthDisplay.textContent = rebirthCount;
    document.getElementById('basicPrice').textContent = formatNumber(ballPrices.basic);
    document.getElementById('sniperPrice').textContent = formatNumber(ballPrices.sniper);
    document.getElementById('bigPrice').textContent = formatNumber(ballPrices.big);
    document.getElementById('explosionPrice').textContent = formatNumber(ballPrices.explosion);
    document.getElementById('multiplyingPrice').textContent = formatNumber(ballPrices.multiplying);
    document.getElementById('autoPrice').textContent = formatNumber(autoBallPrice);
    document.getElementById('cannonballPrice').textContent = formatNumber(ballPrices.cannonball);
    document.getElementById('poisonPrice').textContent = formatNumber(ballPrices.poison);
    document.getElementById('snowballPrice').textContent = formatNumber(ballPrices.snowball);
    document.getElementById("bricksBroken").innerText = formatNumber(stats.totalBricksBroken || 0);
    drawBallPreview('basic-preview', 'gray', 8);
    drawBallPreview('sniper-preview', 'blue', 8);
    drawBallPreview('big-preview', 'green', 12);
    drawBallPreview('explosion-preview', 'orange', 8);
    drawBallPreview('multiplying-preview', 'purple', 8);
    drawBallPreview('auto-preview', 'black', 8);
    drawBallPreview('cannonball-preview', 'darkgray', 8);
    drawBallPreview('poison-preview', 'lime', 8);
    drawBallPreview('snowball-preview', 'white', 8);

    // Update tooltips with current speed and damage
    const ballTooltips = {
        'basic-option': `Basic Ball: Standard ball that bounces off walls and breaks bricks. Speed: ${ballUpgrades.basic.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.basic.damage.toFixed(1))}`,
        'sniper-option': `Sniper Ball: Redirects to nearest brick on wall hit. Speed: ${ballUpgrades.sniper.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.sniper.damage.toFixed(1))}`,
        'big-option': `Big Ball: Larger size for more hitting surface. Speed: ${ballUpgrades.big.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.big.damage.toFixed(1))}`,
        'explosion-option': `Bomb Ball: Deals ${ballUpgrades.explosion.damage.toFixed(1)} damage to hit brick, ${Math.floor(ballUpgrades.explosion.damage / 2).toFixed(1)} to nearby bricks. Speed: ${ballUpgrades.explosion.speed.toFixed(1)}`,
        'multiplying-option': `Clones Ball: Spawns a small clone on brick hit. Speed: ${ballUpgrades.multiplying.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.multiplying.damage.toFixed(1))}`,
        'auto-option': `Auto Ball: Spawns at bottom, moves up, respawns if no brick hit. Speed: 5, Damage: 1000`,
        'cannonball-option': `Cannonball: Powerful ball that smashes through bricks. Speed: ${ballUpgrades.cannonball.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.cannonball.damage.toFixed(1))}`,
        'poison-option': `Poison Ball: Infects bricks to receive double damage. Speed: ${ballUpgrades.poison.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.poison.damage.toFixed(1))}`,
        'snowball-option': `Snowball: Gains power and speed with every bounce. Speed: ${ballUpgrades.snowball.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.snowball.damage.toFixed(1))}`
    };
    Object.keys(ballTooltips).forEach(id => {
        const element = document.getElementById(id);
        const tooltip = element.querySelector('.tooltip');
        if (tooltip) {
            tooltip.textContent = ballTooltips[id];
        }
    });
    const autoToggleContainer = document.getElementById('auto-rebirth-toggle-container');
    const autoToggle = document.getElementById('auto-rebirth-toggle');
    if (autoToggleContainer) autoToggleContainer.style.display = autoRebirthOwned ? 'block' : 'none';
    if (autoToggle) {
        autoToggle.checked = !!autoRebirthEnabled;
        autoToggle.disabled = isGuest || !autoRebirthOwned;
    }

}

// Buy ball
function buyBall(type) {
    if (gold >= ballPrices[type] && balls.length < maxBalls) {
        gold -= ballPrices[type];
        ballPrices[type] = Math.floor(ballPrices[type] * 1.2);
        stats.totalBallsPurchased++;
        ballCounts[type]++;
        const radius = type === 'big' ? 12 : type === 'child' ? 4 : 8;
        const speed = Math.min(ballUpgrades[type].speed, MAX_BALL_SPEED);
        const dx = speed * (Math.random() > 0.5 ? 1 : -1);
        const dy = speed * (Math.random() > 0.5 ? 1 : -1);
        const color = {
            basic: 'gray',
            sniper: 'blue',
            big: 'green',
            explosion: 'orange',
            multiplying: 'purple',
            cannonball: 'darkgray',
            poison: 'lime',
            snowball: 'white'
        }[type];
        balls.push(new Ball(canvas.width / 2, canvas.height / 2, radius, dx, dy, color, type));
        updateUI();
        updateMilestones();
    } else {
        showToast(balls.length >= maxBalls ? 'Max balls reached!' : 'Not enough gold!');
    }
}

// Buy auto ball
function buyAutoBall() {
    if (gold >= autoBallPrice && autoBalls.length < 10) {
        gold -= autoBallPrice;
        stats.totalBallsPurchased++;
        autoBalls.push(new AutoBall());
        autoBallPrice = Math.floor(autoBallPrice * 1.3);
        updateUI();
        updateMilestones();
    } else {
        showToast(autoBalls.length >= 10 ? 'Max auto-balls reached!' : 'Not enough gold!');
    }
}

/*      function upgradeBall(type) {
          const cost = getUpgradeCost(type);
          const maxUpgradeLevel = rebirthCount; // Max level increases by 5 per rebirth
          if (ballUpgrades[type].level >= maxUpgradeLevel) {
              showToast(`Max upgrade level (${maxUpgradeLevel}) reached for ${type} ball!`);
              return;
          }
          if (gold >= cost) {
              gold -= cost;
              ballUpgrades[type].level++;
              ballUpgrades[type].speed += 0.5;
              ballUpgrades[type].damage += type === 'explosion' ? 0.5 : 0.2;
              stats.totalUpgrades++;
              balls.forEach(ball => {
                  if (ball.type === type) {
                      ball.dx = (ball.dx / Math.abs(ball.dx)) * ballUpgrades[type].speed;
                      ball.dy = (ball.dy / Math.abs(ball.dy)) * ballUpgrades[type].speed;
                  }
              });
              updateUI();
              showToast(`Upgraded ${type} ball to level ${ballUpgrades[type].level}!`);
              // Refresh the My Balls popup to update costs and stats
              document.querySelector('.login-overlay')?.remove();
              showMyBallsPopup();
          } else {
              showToast('Not enough gold!');
          }
      }
*/

function upgradeBall(type) {
    const cost = getUpgradeCost(type);

    // Max upgrade level: scales with rebirths (5 levels per rebirth)
    const maxUpgradeLevel = rebirthCount * 5;
    if (ballUpgrades[type].level >= maxUpgradeLevel) {
        showToast(`Max upgrade level (${maxUpgradeLevel}) reached for ${type} ball!`);
        return;
    }

    if (gold < cost) {
        showToast('Not enough gold!');
        return;
    }

    // Deduct cost
    gold -= cost;

    // Level up
    const oldLevel = ballUpgrades[type].level;
    const newLevel = oldLevel + 1;
    ballUpgrades[type].level = newLevel;

    // ----------------------------
    // Damage scaling
    // ----------------------------
    const base = ballUpgrades[type].baseDamage || 1;
    const baseGrowth = ballUpgrades[type].damageGrowth || 1.10;

    // Rebirths boost damage scaling to roughly match idle gold growth
    // Use sqrt of idle gold multiplier so it doesn’t explode too fast
    const rebirthMultiplier = Math.pow(1.2, rebirthCount * 0.5);

    const oldDamage = ballUpgrades[type].damage;

    // Exponential growth by level, plus rebirth multiplier
    const rawDamage = base * Math.pow(baseGrowth, newLevel - 1) * rebirthMultiplier;

    // Soft cap taper after level 20 so damage doesn’t skyrocket
    const taperFactor = newLevel > 20 ? (20 / newLevel) : 1;
    const newDamage = rawDamage * taperFactor;

    ballUpgrades[type].damage = +newDamage.toFixed(6);

    // ----------------------------
    // Speed scaling
    // ----------------------------
    const currentSpeed = ballUpgrades[type].speed;
    let speedIncrease = 0;
    if (currentSpeed < 10) {
        speedIncrease = 0.5; // normal gain
    } else {
        // diminishing returns beyond speed 10
        speedIncrease = 0.5 / (1 + (currentSpeed - 10) * 0.1);
    }
    ballUpgrades[type].speed = Math.min(currentSpeed + speedIncrease, MAX_BALL_SPEED);

    // ----------------------------
    // Stats + active ball update
    // ----------------------------
    stats.totalUpgrades++;
    balls.forEach(ball => {
        if (ball.type === type) {
            ball.dx = (ball.dx / Math.abs(ball.dx)) * ballUpgrades[type].speed;
            ball.dy = (ball.dy / Math.abs(ball.dy)) * ballUpgrades[type].speed;
        }
    });

    updateUI();

    const damageGain = newDamage - oldDamage;
    showToast(
        `Upgraded ${type} ball to level ${newLevel}! ` +
        `Speed +${speedIncrease.toFixed(2)}, ` +
        `Damage +${formatNumber(damageGain.toFixed(2))} (now ${formatNumber(newDamage.toFixed(2))})`
    );

    // ✅ Preserve scroll properly
    const popup = document.querySelector('.my-balls-popup');
    let scrollPos = popup ? popup.scrollTop : 0;

    // Remove ALL overlays before recreating
    document.querySelectorAll('.login-overlay').forEach(el => el.remove());

    showMyBallsPopup();

    const newPopup = document.querySelector('.my-balls-popup');
    if (newPopup) newPopup.scrollTop = scrollPos;
}


// Apply global upgrade
function applyGlobalUpgrade(type) {
    if (gold >= globalUpgrades[type].cost && !globalUpgrades[type].active) {
        gold -= globalUpgrades[type].cost;
        globalUpgrades[type].active = true;
        globalUpgrades[type].activationTime = Date.now();
        ballUpgrades[type].speed = Math.min(ballUpgrades[type].speed, MAX_BALL_SPEED);
        stats.totalUpgrades++;
        setTimeout(() => {
            globalUpgrades[type].active = false;
            showToast(`${type} boost expired!`);
            // Refresh the My Balls popup to update boost status
            document.querySelector('.login-overlay')?.remove();
            showMyBallsPopup();
        }, 60000);
        updateUI();
        showToast(`${type} boost activated for 1 minute!`);
        // Refresh the My Balls popup to update costs and status
        document.querySelector('.login-overlay')?.remove();
        showMyBallsPopup();
    } else {
        showToast(globalUpgrades[type].active ? 'Upgrade already active!' : 'Not enough gold!');
    }
}

// Rebirth
function rebirth(skipConfirm = false, silent = false) {
    if (level >= 100 && (skipConfirm || confirm('Are you sure you want to rebirth? You will lose all balls and gold but keep ball upgrades.'))) {
        gold = 20;
        level = 1;
        balls = [];
        autoBalls = [];
        ballPrices.basic = 25;
        ballPrices.sniper = 50;
        ballPrices.big = 75;
        ballPrices.explosion = 100;
        ballPrices.multiplying = 125;
        ballPrices.cannonball = 150;
        ballPrices.poison = 175;
        ballPrices.snowball = 200;
        autoBallPrice = 200;
        idleGoldPerSecond *= 1.2;
        globalUpgrades.speedBoost.active = false;
        globalUpgrades.goldBoost.active = false;
        bricks = [];
        powerUps = [];
        // Increment local rebirth count
        rebirthCount += 1;

        const user = auth.currentUser;
        if (user) {
            const uid = user.uid;

            database.ref(`users/${uid}/gameState`).update({
                rebirthCount: rebirthCount,
                level: level,
                ballCounts: {
                    basic: 0,
                    sniper: 0,
                    big: 0,
                    explosion: 0,
                    multiplying: 0,
                    child: 0,
                    cannonball: 0,
                    poison: 0,
                    snowball: 0
                },
                ballPrices: {
                    basic: 25,
                    sniper: 50,
                    big: 75,
                    explosion: 100,
                    multiplying: 125,
                    cannonball: 150,
                    poison: 175,
                    snowball: 200
                },
                gold: gold,
                autoRebirthOwned: autoRebirthOwned,
                autoRebirthEnabled: autoRebirthEnabled
            });


            // 2️⃣ Find the team containing this user and update their memberRebirths entry
            database.ref('teams').once('value').then(snapshot => {
                snapshot.forEach(teamSnap => {
                    const members = teamSnap.child('members').val() || {};
                    if (members.hasOwnProperty(uid)) {
                        database.ref(`teams/${teamSnap.key}/memberRebirths/${uid}`).set(rebirthCount);
                    }
                });
            });
        }
        spawnBricks();
        updateUI();
        updateMilestones();
        updateBallOptionsUI();

        showToast('Rebirth successful! Starting from level 1 with retained ball upgrades.');
        saveGameState();

        // Refresh the My Balls popup to update rebirth info
        document.querySelector('.login-overlay')?.remove();

        // Only show popup on manual rebirths
        if (!silent) {
            showMyBallsPopup();
        }

    } else {
        showToast(level < 100 ? 'You need to reach level 100 to rebirth!' : 'Rebirth cancelled.');
    }
}

function syncRebirthCount(userId) {
    const userRebirthRef = database.ref(`users/${userId}/gameState/rebirthCount`);
    const teamsRef = database.ref("teams");

    // Watch the player's rebirthCount in their gameState
    userRebirthRef.on("value", (snapshot) => {
        const rebirthCount = snapshot.val();
        if (rebirthCount === null) return;

        // Check every team to see where this user belongs
        teamsRef.once("value").then((teamsSnap) => {
            teamsSnap.forEach((team) => {
                const memberRebirths = team.child("memberRebirths").val();
                if (memberRebirths && memberRebirths[userId] !== undefined) {
                    // Sync user’s rebirth count into this team
                    database.ref(`teams/${team.key}/memberRebirths/${userId}`).set(rebirthCount);
                }
            });
        });
    });
}

const powerUpsList = [{
    emoji: '⚡',
    name: 'Thunder Strike',
    description: 'Destroys 5 random bricks instantly.'
},
{
    emoji: '🛡️',
    name: 'Shield Boost',
    description: 'Protects balls from disappearing for 30 seconds.'
},
{
    emoji: '💥',
    name: 'Mega Explosion',
    description: 'Doubles explosion ball damage for 20 seconds.'
},
{
    emoji: '🌟',
    name: 'Star Shower',
    description: 'Spawns 3 auto balls for 15 seconds.'
},
{
    emoji: '🕒',
    name: 'Time Warp',
    description: 'Slows down time for 10 seconds.'
},
{
    emoji: '🌌',
    name: 'Cosmic Barrage',
    description: 'Unleashes a wave of energy, destroying 10 bricks and doubling ball speed for 15 seconds.'
}
];

// Game state variables
let cosmetics = {
    nebulaSkin: false,
    fireTrail: false,
    iceTrail: false,
    rainbowSkin: false,
    bundleSilver: false,
    bundleGold: false,
    bundlePlatinum: false
};

function deleteCosmetic(cosmeticName) {
    const user = auth.currentUser;
    if (!user || isGuest) {
        showLoginPopupForSave();
        return;
    }
    if (!cosmetics[cosmeticName]) {
        showToast('Cosmetic not owned!');
        return;
    }
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete ${cosmeticName.replace(/([A-Z])/g, ' $1').trim()}?`)) {
        return;
    }
    cosmetics[cosmeticName] = false;
    // If a bundle is deleted, remove associated cosmetics
    if (cosmeticName === 'bundleSilver') {
        cosmetics.nebulaSkin = false;
    } else if (cosmeticName === 'bundleGold') {
        cosmetics.nebulaSkin = false;
        cosmetics.fireTrail = false;
    } else if (cosmeticName === 'bundlePlatinum') {
        cosmetics.nebulaSkin = false;
        cosmetics.fireTrail = false;
        cosmetics.iceTrail = false;
        cosmetics.rainbowSkin = false;
    }
    database.ref('users/' + user.uid + '/gameState').update({
        cosmetics: cosmetics
    }).then(() => {
        document.querySelector('.login-overlay')?.remove();
        showToast(`${cosmeticName.replace(/([A-Z])/g, ' $1').trim()} deleted!`);
        updateUI();
        showMyBallsPopup();
    }).catch(error => {
        showToast('Failed to delete cosmetic: ' + error.message);
        cosmetics[cosmeticName] = true; // Revert on failure
        updateUI();
    });
}

// Update buyPowerup function to handle specific powerups
function buyPowerup(rebirthCost, powerupCount, specificPowerup = null) {
    if (rebirthCount >= rebirthCost) {
        const user = auth.currentUser;
        if (user && !isGuest) {
            rebirthCount -= rebirthCost;
            database.ref('users/' + user.uid + '/gameState').update({
                rebirthCount: rebirthCount
            }).then(() => {
                const loginOverlay = document.querySelector('.login-overlay');
                if (loginOverlay) loginOverlay.remove(); // Close My Balls popup
                showSpinner(powerupCount, specificPowerup);
                showToast('Rebirths spent successfully!');
                updateUI();
                updateLeaderboard(); // Update leaderboard after rebirth deduction
            }).catch(error => {
                showToast('Failed to update rebirths: ' + error.message);
                rebirthCount += rebirthCost; // Revert local change
                updateUI();
            });
        } else {
            showLoginPopupForSave();
        }
    } else {
        showToast('Not enough rebirths!');
    }
}

// Update showSpinner to handle specific powerups
function showSpinner(powerupCount, specificPowerup = null) {
    const overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';
    overlay.innerHTML = `
        <div class="spinner-container">
            <div class="spinner"></div>
            <p>Revealing ${powerupCount} Powerup${powerupCount > 1 ? 's' : ''}...</p>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        const powerups = [];
        if (specificPowerup) {
            const powerup = powerUpsList.find(p => p.name.toLowerCase() === specificPowerup.toLowerCase());
            if (powerup) powerups.push(powerup);
        } else {
            for (let i = 0; i < powerupCount; i++) {
                powerups.push(powerUpsList[Math.floor(Math.random() * (powerUpsList.length - 1))]);
            }
        }
        overlay.remove(); // Ensure spinner is removed
        showPowerupResult(powerups);
        powerups.forEach(powerup => applyPowerup(powerup));
    }, 5000);
}

// Switch tabs
document.addEventListener("click", e => {
    if (e.target.id === "global-tab") {
        document.getElementById("global-tab").classList.add("active");
        document.getElementById("team-tab").classList.remove("active");
        document.getElementById("global-leaderboard").style.display = "block";
        document.getElementById("team-leaderboard").style.display = "none";
    }
    if (e.target.id === "team-tab") {
        document.getElementById("team-tab").classList.add("active");
        document.getElementById("global-tab").classList.remove("active");
        document.getElementById("global-leaderboard").style.display = "none";
        document.getElementById("team-leaderboard").style.display = "block";
        fetchTeams();
    }
});

function fetchTeams() {
    const teamList = document.getElementById("team-list");
    teamList.innerHTML = "Loading teams...";
    database.ref("teams").once("value").then(snapshot => {
        const teams = [];
        snapshot.forEach(teamSnap => {
            const team = teamSnap.val();
            const memberCount = team.members ? Object.keys(team.members).length : 0;
            const totalRebirths = Object.keys(team.members || {}).reduce((sum, uid) => {
                return sum + (team.memberRebirths?.[uid] || 0);
            }, 0);
            teams.push({
                id: teamSnap.key,
                name: team.name,
                members: memberCount,
                maxMembers: team.maxMembers || 15,
                rebirths: totalRebirths
            });
        });
        teams.sort((a, b) => b.rebirths - a.rebirths);
        teamList.innerHTML = "";
        teams.forEach((t, index) => {
            const div = document.createElement("div");
            div.className = "team-card";
            div.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    <div class="team-rank-circle">${index + 1}</div>
                    <div style="font-size: 14px;">
                        <b>${t.name}</b><br>
                        ${t.rebirths} Rebirths | Members: ${t.members}/${t.maxMembers}
                    </div>
                </div>
            `;
            div.addEventListener("click", () => showTeamDetails(t.id, index + 1));
            teamList.appendChild(div);
        });
    });
}

function showTeamDetails(teamId, rank) {
    database.ref("teams/" + teamId).once("value").then(snap => {
        const team = snap.val();
        const overlay = document.createElement("div");
        overlay.className = "login-overlay";
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        // Sort members by rebirths
        const memberEntries = Object.entries(team.members || {}).map(([uid, name]) => ({
            uid,
            name,
            rebirths: team.memberRebirths?.[uid] || 0,
            role: team.admins?.[uid] || 'member'
        }));
        memberEntries.sort((a, b) => b.rebirths - a.rebirths);

        // Build settings menu for creator (delete team)
        const user = auth.currentUser;
        const isCreator = user && team.admins?.[user.uid] === 'creator';
        const settingsMenuHTML = isCreator ?
            `
                <div class="settings-container">
                    <button class="settings-team-btn" style="background:transparent;padding:0;">⚙️</button>
                    <div class="settings-menu" style="display: none;">
                        <button id="delete-team-btn">Delete Team</button>
                    </div>
                </div>
            ` :
            '';

        overlay.innerHTML = `
            <div class="login-popup" style="width:400px;max-height:80vh;overflow-y:auto;">
                <div style="display:flex;flex-direction:row;align-items:center;gap:10px;margin-bottom:10px;justify-content: space-between;">
                    <div style="display:flex;align-items:center;gap:5px;">
                        <div class="team-rank-circle">${rank}</div>
                        <div style="display: flex; flex-direction: column; gap: 0; text-align: left;">
                            <div style="display: flex; align-items: center; gap: 5px;">
                                <h2 id="team-name" style="margin:0;">${team.name}</h2>
                                ${user && team.admins?.[user.uid] ? '<button id="edit-name-btn" style="background:transparent;padding:0;">✏️</button>' : ''}
                            </div>
                            <p style="margin: 0;">Total Rebirths: ${memberEntries.reduce((sum, m) => sum + m.rebirths, 0)}</p>
                            <p style="margin: 0;">${team.isPrivate ? 'Private Team' : 'Public Team'}</p>
                        </div>
                    </div>
                    ${settingsMenuHTML}
                </div>
                <h3 style="text-align: left;font-weight: 600;font-size: 15px;margin-bottom: 10px;">Members:</h3>
                <div id="team-members"></div>
                <div style="margin-top:15px;">
                    <button id="join-leave-btn"></button>
                    <button id="close-team-btn">Close</button>
                </div>
            </div>
            <style>
                .settings-container {
                    position: relative;
                }
                .settings-team-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    background: transparent;
                    padding: 0;
                }
                .settings-menu {
                    position: absolute;
                    top: 40px;
                    right: 0;
                    background: #fff;
                    border: 1px solid #555;
                    border-radius: 4px;
                    padding: 5px;
                    z-index: 1000;
                    width: fit-content;
                }
                .settings-menu button {
                    display: block;
                    width: fit-content;
                    padding: 0;
                    background: none;
                    border: none;
                    color: #000;
                    text-align: center;
                    cursor: pointer;
                    margin: 0;
                    border-radius: 0;
                    min-width: 90px;
                }
                .settings-menu button:hover {
                    color: red;
                    background: transparent;
                }
                .member-menu-container {
                    position: relative;
                }
                .member-menu-btn {
                    font-size: 16px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #000;
                }
                .member-menu {
                    position: absolute;
                    right: 0;
                    background: #fff;
                    border: 1px solid #555;
                    border-radius: 4px;
                    padding: 5px;
                    z-index: 1000;
                    width: fit-content;
                }
                .member-menu button {
                    display: block;
                    width: fit-content;
                    padding: 0;
                    background: none;
                    border: none;
                    color: #000;
                    text-align: center;
                    cursor: pointer;
                    margin: 5px 0;
                    border-radius: 0;
                    min-width: 90px;
                }
                .member-menu button:hover {
                    background: transparent;
                    opacity: 0.5;
                }
                .edit-name-input {
                    font-size: 18px;
                    padding: 2px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    background: #222;
                    color: white;
                }
            </style>
        `;
        document.body.appendChild(overlay);

        // Populate members with leaderboard style and three-dot menu
        const memberList = overlay.querySelector("#team-members");
        memberEntries.forEach((m, i) => {
            const isAdmin = user && team.admins?.[user.uid];
            const canPromote = isCreator && m.role !== 'creator' && m.role !== 'admin';
            const canRemove = isAdmin && m.role !== 'creator' && m.uid !== user.uid;
            const showMenu = canPromote || canRemove;

            const card = document.createElement("div");
            card.className = `leaderboard-card rank-${i + 1}`;
            card.innerHTML = `
                <span class="rank">${i + 1}</span>
                <div class="user-and-info" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; text-align: left;">
                    <div>
                        <span class="username">${m.name || "Anonymous"}${m.role !== 'member' ? ` (${m.role})` : ''}</span>
                        <span class="info">Rebirths: ${m.rebirths}</span>
                    </div>
                    ${showMenu ? `
                        <div class="member-menu-container">
                            <button class="member-menu-btn" style="background:transparent;padding:0 10px;color:#000;">⋮</button>
                            <div class="member-menu" style="display: none;">
                                ${canPromote ? `<button class="promote-admin-btn" data-uid="${m.uid}">Make Admin</button>` : ''}
                                ${canRemove ? `<button class="remove-member-btn" data-uid="${m.uid}" style="color:red;">Remove</button>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            memberList.appendChild(card);
        });

        // Handle join/leave button
        if (!user) {
            overlay.querySelector("#join-leave-btn").textContent = "Login to Join";
            overlay.querySelector("#join-leave-btn").onclick = () => showLoginPopup();
        } else {
            database.ref("userTeams/" + user.uid).once("value").then(userSnap => {
                const currentTeamId = userSnap.val();
                if (currentTeamId === teamId) {
                    overlay.querySelector("#join-leave-btn").textContent = "Leave Team";
                    overlay.querySelector("#join-leave-btn").onclick = () => leaveTeam(teamId);
                } else if (currentTeamId) {
                    overlay.querySelector("#join-leave-btn").textContent = "Already in a Team";
                    overlay.querySelector("#join-leave-btn").disabled = true;
                } else {
                    overlay.querySelector("#join-leave-btn").textContent = "Join Team";
                    overlay.querySelector("#join-leave-btn").onclick = () => {
                        if (team.isPrivate) {
                            const password = prompt("Enter team password:");
                            if (password === null) return;
                            joinTeam(teamId, password);
                        } else {
                            joinTeam(teamId);
                        }
                    };
                }
            });
        }

        // Handle team name editing
        const editNameBtn = overlay.querySelector("#edit-name-btn");
        if (editNameBtn) {
            editNameBtn.onclick = () => {
                const teamNameEl = overlay.querySelector("#team-name");
                if (teamNameEl.tagName === 'H2') {
                    const input = document.createElement("input");
                    input.className = "edit-name-input";
                    input.value = team.name;
                    input.style.padding = '2px';
                    teamNameEl.replaceWith(input);
                    editNameBtn.textContent = "Save";
                    editNameBtn.style.color = '#fff';
                    editNameBtn.style.background = '#000';
                    editNameBtn.style.padding = '5px';
                    input.focus();
                    editNameBtn.onclick = () => {
                        const newName = input.value.trim();
                        if (newName) {
                            updateTeamName(teamId, user.uid, newName).then(() => {
                                const newH2 = document.createElement("h2");
                                newH2.id = "team-name";
                                newH2.style.margin = "0";
                                newH2.textContent = newName;
                                input.replaceWith(newH2);
                                editNameBtn.textContent = "✏️";
                            });
                        }
                    };
                }
            };
        }

        // Handle settings menu toggle
        const settingsBtn = overlay.querySelector(".settings-team-btn");
        if (settingsBtn) {
            const settingsMenuEl = overlay.querySelector(".settings-menu");
            settingsBtn.onclick = () => {
                settingsMenuEl.style.display = settingsMenuEl.style.display === 'none' ? 'block' : 'none';
            };
            overlay.addEventListener("click", e => {
                if (!settingsBtn.contains(e.target) && !settingsMenuEl.contains(e.target)) {
                    settingsMenuEl.style.display = 'none';
                }
            });
        }

        // Handle delete team
        const deleteTeamBtn = overlay.querySelector("#delete-team-btn");
        if (deleteTeamBtn) {
            deleteTeamBtn.onclick = () => {
                if (confirm("Are you sure you want to delete this team?")) {
                    deleteTeam(teamId, user.uid);
                }
            };
        }

        // Handle member menu toggle and actions
        overlay.querySelectorAll(".member-menu-btn").forEach(btn => {
            const menu = btn.nextElementSibling;
            btn.onclick = () => {
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            };
        });
        overlay.addEventListener("click", e => {
            overlay.querySelectorAll(".member-menu").forEach(menu => {
                if (!menu.contains(e.target) && !menu.previousElementSibling.contains(e.target)) {
                    menu.style.display = 'none';
                }
            });
        });
        overlay.querySelectorAll(".promote-admin-btn").forEach(btn => {
            btn.onclick = () => {
                promoteToAdmin(teamId, user.uid, btn.dataset.uid);
            };
        });
        overlay.querySelectorAll(".remove-member-btn").forEach(btn => {
            btn.onclick = () => {
                removeTeamMember(teamId, user.uid, btn.dataset.uid);
            };
        });

        overlay.querySelector("#close-team-btn").onclick = () => overlay.remove();
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                overlay.remove();
                playAsGuest();
            }
        });
    });
}
// Create Team (only if not in a team)
document.addEventListener("click", e => {
    if (e.target.id === "create-team-btn") {
        const user = auth.currentUser;
        if (!user) return showToast("Login first!");
        database.ref("userTeams/" + user.uid).once("value").then(snap => {
            if (snap.val()) return showToast("You already have or are in a team!");
            const teamName = prompt("Enter team name:");
            if (!teamName) return;
            const isPrivate = confirm("Make this team password-protected?");
            let password = '';
            if (isPrivate) {
                password = prompt("Enter team password:");
                if (!password) return showToast("Password required for private team!");
            }
            const newTeamRef = database.ref("teams").push();
            newTeamRef.set({
                name: teamName,
                members: {
                    [user.uid]: username
                },
                memberRebirths: {
                    [user.uid]: rebirthCount
                },
                admins: {
                    [user.uid]: 'creator'
                },
                maxMembers: 15,
                isPrivate: isPrivate,
                ...(isPrivate && {
                    password: password
                })
            }).then(() => {
                database.ref("userTeams/" + user.uid).set(newTeamRef.key);
                showToast("Team created!");
                fetchTeams();
            }).catch(error => {
                showToast("Error creating team: " + error.message);
            });
        });
    }
});

function joinTeam(teamId, password = '') {
    const user = auth.currentUser;
    if (!user) return showToast("Login first!");
    database.ref("userTeams/" + user.uid).once("value").then(userSnap => {
        if (userSnap.val()) return showToast("You are already in a team!");
        database.ref("teams/" + teamId).once("value").then(teamSnap => {
            const team = teamSnap.val();
            if (!team) return showToast("Team does not exist!");
            if (team.isPrivate && team.password !== password) {
                return showToast("Incorrect password!");
            }
            const updates = {
                [`members/${user.uid}`]: username,
                [`memberRebirths/${user.uid}`]: rebirthCount
            };
            database.ref("teams/" + teamId).update(updates).then(() => {
                database.ref("userTeams/" + user.uid).set(teamId);
                showToast("Joined team!");
                document.querySelector(".login-overlay")?.remove();
                fetchTeams();
            }).catch(error => {
                showToast("Error joining team: " + error.message);
            });
        });
    });
}

function leaveTeam(teamId) {
    const user = auth.currentUser;
    if (!user) return showToast("Login first!");
    database.ref("teams/" + teamId + "/admins/" + user.uid).once("value").then(snap => {
        if (snap.val() === 'creator') {
            return showToast("Creator cannot leave the team! Delete the team instead.");
        }
        const updates = {
            [`members/${user.uid}`]: null,
            [`memberRebirths/${user.uid}`]: null,
            [`admins/${user.uid}`]: null
        };
        database.ref("teams/" + teamId).update(updates).then(() => {
            database.ref("userTeams/" + user.uid).remove();
            showToast("Left team!");
            document.querySelector(".login-overlay")?.remove();
            fetchTeams();
        }).catch(error => {
            showToast("Error leaving team: " + error.message);
        });
    });
}

function updateTeamName(teamId, userId, newName) {
    return database.ref("teams/" + teamId + "/admins/" + userId).once("value").then(snap => {
        if (!snap.val()) return showToast("Only admins can change the team name!");
        return database.ref("teams/" + teamId).update({
            name: newName
        }).then(() => {
            showToast("Team name updated!");
            document.querySelector(".login-overlay")?.remove();
            fetchTeams();
        }).catch(error => {
            showToast("Error updating team name: " + error.message);
        });
    });
}

function removeTeamMember(teamId, adminId, userId) {
    database.ref("teams/" + teamId + "/admins/" + adminId).once("value").then(snap => {
        if (!snap.val()) return showToast("Only admins can remove members!");
        database.ref("teams/" + teamId + "/admins/" + userId).once("value").then(userSnap => {
            if (userSnap.val() === 'creator') return showToast("Cannot remove the team creator!");
            const updates = {
                [`members/${userId}`]: null,
                [`memberRebirths/${userId}`]: null,
                [`admins/${userId}`]: null
            };
            database.ref("teams/" + teamId).update(updates).then(() => {
                database.ref("userTeams/" + userId).remove();
                showToast("Member removed!");
                document.querySelector(".login-overlay")?.remove();
                fetchTeams();
            }).catch(error => {
                showToast("Error removing member: " + error.message);
            });
        });
    });
}

function deleteTeam(teamId, userId) {
    database.ref("teams/" + teamId + "/admins/" + userId).once("value").then(snap => {
        if (snap.val() !== 'creator') return showToast("Only the creator can delete the team!");
        database.ref("teams/" + teamId + "/members").once("value").then(memberSnap => {
            const members = memberSnap.val() || {};
            const updates = {};
            Object.keys(members).forEach(uid => {
                updates[`userTeams/${uid}`] = null;
            });
            database.ref().update(updates).then(() => {
                database.ref("teams/" + teamId).remove().then(() => {
                    showToast("Team deleted!");
                    document.querySelector(".login-overlay")?.remove();
                    fetchTeams();
                }).catch(error => {
                    showToast("Error deleting team: " + error.message);
                });
            });
        });
    });
}

function promoteToAdmin(teamId, creatorId, userId) {
    database.ref("teams/" + teamId + "/admins/" + creatorId).once("value").then(snap => {
        if (snap.val() !== 'creator') return showToast("Only the creator can promote admins!");
        database.ref("teams/" + teamId + "/members/" + userId).once("value").then(memberSnap => {
            if (!memberSnap.val()) return showToast("User is not a team member!");
            database.ref("teams/" + teamId + "/admins").update({
                [userId]: 'admin'
            }).then(() => {
                showToast("Member promoted to admin!");
                document.querySelector(".login-overlay")?.remove();
                fetchTeams();
            }).catch(error => {
                showToast("Error promoting admin: " + error.message);
            });
        });
    });
}


// New function to buy idle gold boost
function buyIdleGoldBoost() {
    // Base cost scales with idleGoldPerSecond, ensuring it's higher than rebirth's equivalent gain
    const baseCost = 1500; // Increased base cost for balance
    const rebirthEquivalentGain = idleGoldPerSecond * 0.2; // Rebirth gives 1.2x, so increase is 0.2x current rate
    const boostGain = 0.5; // Boost gives +0.5 gold/sec
    const costMultiplier = Math.max(1, Math.floor(idleGoldPerSecond / 0.5)) * 1.5; // Premium over rebirth
    const goldCost = Math.floor(baseCost * costMultiplier * (boostGain / rebirthEquivalentGain));

    if (gold >= goldCost) {
        const user = auth.currentUser;
        if (user && !isGuest) {
            gold -= goldCost;
            idleGoldPerSecond += 0.5;
            database.ref('users/' + user.uid + '/gameState').update({
                gold: gold,
                idleGoldPerSecond: idleGoldPerSecond
            }).then(() => {
                const loginOverlay = document.querySelector('.login-overlay');
                if (loginOverlay) loginOverlay.remove();
                showToast('Idle Gold Boost purchased! +0.5 gold/sec');
                updateUI();
                updateLeaderboard();
            }).catch(error => {
                showToast('Failed to update game state: ' + error.message);
                gold += goldCost;
                idleGoldPerSecond -= 0.5;
                updateUI();
            });
        } else {
            showLoginPopupForSave();
        }
    } else {
        showToast('Not enough gold!');
    }
}

// New function to buy cosmetic
function buyCosmetic(cosmeticName) {
    const costs = {
        nebulaSkin: {
            rebirths: 10
        },
        fireTrail: {
            gold: 500
        },
        iceTrail: {
            gold: 500
        },
        rainbowSkin: {
            rebirths: 15
        },
        bundleSilver: {
            rebirths: 20
        },
        bundleGold: {
            rebirths: 30
        },
        bundlePlatinum: {
            rebirths: 50
        }
    };
    const cost = costs[cosmeticName];
    const user = auth.currentUser;
    if (!user || isGuest) {
        showLoginPopupForSave();
        return;
    }
    if (cosmetics[cosmeticName]) {
        showToast('Cosmetic already owned!');
        return;
    }
    const canAfford = (cost.rebirths && rebirthCount >= cost.rebirths) || (cost.gold && gold >= cost.gold);
    if (!canAfford) {
        showToast(cost.rebirths ? 'Not enough rebirths!' : 'Not enough gold!');
        return;
    }
    if (cost.rebirths) rebirthCount -= cost.rebirths;
    if (cost.gold) gold -= cost.gold;
    cosmetics[cosmeticName] = true;
    // Apply bundle effects
    if (cosmeticName === 'bundleSilver') {
        cosmetics.nebulaSkin = true;
        showSpinner(2); // 2 random powerups
    } else if (cosmeticName === 'bundleGold') {
        cosmetics.nebulaSkin = true;
        cosmetics.fireTrail = true;
        showSpinner(3); // 3 random powerups
    } else if (cosmeticName === 'bundlePlatinum') {
        cosmetics.nebulaSkin = true;
        cosmetics.fireTrail = true;
        cosmetics.iceTrail = true;
        cosmetics.rainbowSkin = true;
        showSpinner(5); // 5 random powerups
    }
    database.ref('users/' + user.uid + '/gameState').update({
        rebirthCount: rebirthCount,
        gold: gold,
        cosmetics: cosmetics
    }).then(() => {
        document.querySelector('.login-overlay')?.remove();
        showToast(`${cosmeticName.replace(/([A-Z])/g, ' $1').trim()} unlocked!`);
        updateUI();
        updateLeaderboard();
        showMyBallsPopup();
    }).catch(error => {
        showToast('Failed to unlock cosmetic: ' + error.message);
        if (cost.rebirths) rebirthCount += cost.rebirths;
        if (cost.gold) gold += cost.gold;
        cosmetics[cosmeticName] = false;
        updateUI();
    });
}

// Buy Instant Brick Destroy
function buyInstantBrickDestroy() {
    const cost = getDynamicPrice(basePrices.instantBrickDestroy);
    if (gold >= cost && bricks.length > 0) {
        const user = auth.currentUser;
        if (user && !isGuest) {
            gold -= cost;
            database.ref('users/' + user.uid + '/gameState').update({
                gold: gold
            }).then(() => {
                for (let i = 0; i < 3; i++) { // Destroy 3 bricks instead of 1
                    const randomBrick = bricks[Math.floor(Math.random() * bricks.length)];
                    if (randomBrick) {
                        randomBrick.health = 0;
                        bricks = bricks.filter(b => b !== randomBrick);
                        gold += 5;
                        if (powerUps.length < maxPowerUps) spawnPowerUp();
                    }
                }
                showToast('Instant Brick Destroy: 3 bricks eliminated!');
                updateUI();
                updateLeaderboard();
                document.querySelector('.login-overlay')?.remove();
                showMyBallsPopup();
            }).catch(error => {
                showToast('Failed to purchase: ' + error.message);
                gold += cost;
                updateUI();
            });
        } else {
            showLoginPopupForSave();
        }
    } else {
        showToast(gold < cost ? 'Not enough gold!' : 'No bricks to destroy!');
    }
}
// Buy Double Damage
function buyDoubleDamage() {
    const cost = getDynamicPrice(basePrices.doubleDamage);
    if (gold >= cost) {
        const user = auth.currentUser;
        if (user && !isGuest) {
            gold -= cost;
            const originalDamages = {};
            Object.keys(ballUpgrades).forEach(type => {
                originalDamages[type] = ballUpgrades[type].damage;
                ballUpgrades[type].damage *= 2.5; // Increased from 2x to 2.5x
            });
            database.ref('users/' + user.uid + '/gameState').update({
                gold: gold,
                ballUpgrades: ballUpgrades
            }).then(() => {
                setTimeout(() => {
                    Object.keys(ballUpgrades).forEach(type => {
                        ballUpgrades[type].damage = originalDamages[type];
                    });
                    showToast('Double Damage expired!');
                    updateUI();
                    document.querySelector('.login-overlay')?.remove();
                    showMyBallsPopup();
                }, 60000); // Increased from 30s to 60s
                showToast('Double Damage: All ball damage increased by 2.5x for 60 seconds!');
                updateUI();
                updateLeaderboard();
                document.querySelector('.login-overlay')?.remove();
                showMyBallsPopup();
            }).catch(error => {
                showToast('Failed to purchase: ' + error.message);
                gold += cost;
                updateUI();
            });
        } else {
            showLoginPopupForSave();
        }
    } else {
        showToast('Not enough gold!');
    }
}
// Buy Extra Ball
function buyExtraBall() {
    const cost = getDynamicPrice(basePrices.extraBall);
    if (gold >= cost && balls.length < maxBalls) {
        const user = auth.currentUser;
        if (user && !isGuest) {
            gold -= cost;
            const type = ['basic', 'sniper', 'big', 'explosion', 'multiplying', 'cannonball', 'poison', 'snowball'][Math.floor(Math.random() * 8)];
            const radius = type === 'big' ? 12 : type === 'child' ? 4 : 8;
            const speed = ballUpgrades[type].speed;
            const dx = speed * (Math.random() > 0.5 ? 1 : -1);
            const dy = speed * (Math.random() > 0.5 ? 1 : -1);
            const color = {
                basic: 'gray',
                sniper: 'blue',
                big: 'green',
                explosion: 'orange',
                multiplying: 'purple',
                cannonball: 'darkgray',
                poison: 'lime',
                snowball: 'white'
            }[type];
            balls.push(new Ball(canvas.width / 2, canvas.height / 2, radius, dx, dy, color, type));
            ballCounts[type]++;
            stats.totalBallsPurchased++;
            database.ref('users/' + user.uid + '/gameState').update({
                gold: gold,
                ballCounts: ballCounts,
                stats: stats
            }).then(() => {
                showToast(`Extra Ball: Added 1 ${type} ball!`);
                updateUI();
                updateLeaderboard();
                document.querySelector('.login-overlay')?.remove();
                showMyBallsPopup();
            }).catch(error => {
                showToast('Failed to purchase: ' + error.message);
                gold += cost;
                balls.pop();
                ballCounts[type]--;
                stats.totalBallsPurchased--;
                updateUI();
            });
        } else {
            showLoginPopupForSave();
        }
    } else {
        showToast(gold < cost ? 'Not enough gold!' : 'Max balls reached!');
    }
}
// Buy Gold Magnet
function buyGoldMagnet() {
    const cost = getDynamicPrice(basePrices.goldMagnet);
    if (gold >= cost) {
        const user = auth.currentUser;
        if (user && !isGuest) {
            gold -= cost;
            database.ref('users/' + user.uid + '/gameState').update({
                gold: gold
            }).then(() => {
                powerUps.forEach(powerUp => {
                    if (powerUp.type === 'gold') {
                        powerUp.active = false;
                        gold += 100; // Increased from 50 to 100 gold per power-up
                    }
                });
                powerUps = powerUps.filter(p => p.active);
                setTimeout(() => {
                    showToast('Gold Magnet expired!');
                    updateUI();
                    document.querySelector('.login-overlay')?.remove();
                    showMyBallsPopup();
                }, 30000); // Increased from 20s to 30s
                showToast('Gold Magnet: Collecting all gold power-ups for 30 seconds, 100 gold each!');
                updateUI();
                updateLeaderboard();
                document.querySelector('.login-overlay')?.remove();
                showMyBallsPopup();
            }).catch(error => {
                showToast('Failed to purchase: ' + error.message);
                gold += cost;
                updateUI();
            });
        } else {
            showLoginPopupForSave();
        }
    } else {
        showToast('Not enough gold!');
    }
}
// Buy Brick Health Reduction
function buyBrickHealthReduction() {
    const cost = getDynamicPrice(basePrices.brickHealthReduction);
    if (gold >= cost && bricks.length > 0) {
        const user = auth.currentUser;
        if (user && !isGuest) {
            gold -= cost;
            bricks.forEach(brick => {
                brick.health = Math.max(1, Math.floor(brick.health * 0.3)); // Reduced to 30% instead of 50%
            });
            database.ref('users/' + user.uid + '/gameState').update({
                gold: gold
            }).then(() => {
                showToast('Brick Health Reduction: All brick health reduced to 30%!');
                updateUI();
                updateLeaderboard();
                document.querySelector('.login-overlay')?.remove();
                showMyBallsPopup();
            }).catch(error => {
                showToast('Failed to purchase: ' + error.message);
                gold += cost;
                updateUI();
            });
        } else {
            showLoginPopupForSave();
        }
    } else {
        showToast(gold < cost ? 'Not enough gold!' : 'No bricks to reduce!');
    }
}
// Buy Speed Surge
function buySpeedSurge() {
    const cost = getDynamicPrice(basePrices.speedSurge);
    if (gold >= cost) {
        const user = auth.currentUser;
        if (user && !isGuest) {
            gold -= cost;
            const originalSpeeds = balls.map(ball => ({
                dx: ball.dx,
                dy: ball.dy
            }));
            balls.forEach(ball => {
                ball.dx *= 3;
                ball.dy *= 3;
            });
            database.ref('users/' + user.uid + '/gameState').update({
                gold: gold
            }).then(() => {
                setTimeout(() => {
                    balls.forEach((ball, index) => {
                        ball.dx = originalSpeeds[index].dx;
                        ball.dy = originalSpeeds[index].dy;
                    });
                    showToast('Speed Surge expired!');
                    updateUI();
                    document.querySelector('.login-overlay')?.remove();
                    showMyBallsPopup();
                }, 15000);
                showToast('Speed Surge: Ball speed increased by 3x for 15 seconds!');
                updateUI();
                updateLeaderboard();
                document.querySelector('.login-overlay')?.remove();
                showMyBallsPopup();
            }).catch(error => {
                showToast('Failed to purchase: ' + error.message);
                gold += cost;
                updateUI();
            });
        } else {
            showLoginPopupForSave();
        }
    } else {
        showToast('Not enough gold!');
    }
}

// Update applyPowerup function to handle Cosmic Barrage
function applyPowerup(powerup) {
    switch (powerup.name) {
        case 'Thunder Strike':
            for (let i = 0; i < 10; i++) { // Increased from 5 to 10 bricks
                const randomBrick = bricks[Math.floor(Math.random() * bricks.length)];
                if (randomBrick) {
                    randomBrick.health = 0;
                    bricks = bricks.filter(b => b !== randomBrick);
                    gold += 5;
                    if (powerUps.length < maxPowerUps) spawnPowerUp();
                }
            }
            showToast('Thunder Strike: 10 bricks destroyed!');
            updateUI();
            break;
        case 'Shield Boost':
            balls.forEach(ball => ball.powerUpUsed = true);
            setTimeout(() => {
                balls.forEach(ball => ball.powerUpUsed = false);
                showToast('Shield Boost expired!');
            }, 60000); // Increased from 30s to 60s
            showToast('Shield Boost: Balls protected for 60 seconds!');
            break;
        case 'Mega Explosion':
            const originalExplosionDamage = ballUpgrades.explosion.damage;
            ballUpgrades.explosion.damage *= 3; // Increased from 2x to 3x
            setTimeout(() => {
                ballUpgrades.explosion.damage = originalExplosionDamage;
                showToast('Mega Explosion expired!');
            }, 30000); // Increased from 20s to 30s
            showToast('Mega Explosion: Explosion ball damage tripled for 30 seconds!');
            updateUI();
            break;
        case 'Star Shower':
            for (let i = 0; i < 5; i++) { // Increased from 3 to 5 auto balls
                if (autoBalls.length < 10) autoBalls.push(new AutoBall());
            }
            setTimeout(() => {
                autoBalls.splice(-5);
                showToast('Star Shower expired!');
            }, 30000); // Increased from 15s to 30s
            showToast('Star Shower: 5 auto balls spawned for 30 seconds!');
            updateUI();
            break;
        case 'Time Warp':
            const originalSpeeds = balls.map(ball => ({
                dx: ball.dx,
                dy: ball.dy
            }));
            balls.forEach(ball => {
                ball.dx *= 0.3; // Slower time (was 0.5)
                ball.dy *= 0.3;
            });
            setTimeout(() => {
                balls.forEach((ball, index) => {
                    ball.dx = originalSpeeds[index].dx;
                    ball.dy = originalSpeeds[index].dy;
                });
                showToast('Time Warp expired!');
            }, 15000); // Increased from 10s to 15s
            showToast('Time Warp: Time slowed for 15 seconds!');
            break;
        case 'Cosmic Barrage':
            for (let i = 0; i < 15; i++) { // Increased from 10 to 15 bricks
                const randomBrick = bricks[Math.floor(Math.random() * bricks.length)];
                if (randomBrick) {
                    randomBrick.health = 0;
                    bricks = bricks.filter(b => b !== brick);
                    gold += 5;
                    if (powerUps.length < maxPowerUps) spawnPowerUp();
                }
            }
            const originalBallSpeeds = balls.map(ball => ({
                dx: ball.dx,
                dy: ball.dy
            }));
            balls.forEach(ball => {
                ball.dx *= 3; // Increased from 2x to 3x speed
                ball.dy *= 3;
            });
            ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setTimeout(() => {
                balls.forEach((ball, index) => {
                    ball.dx = originalBallSpeeds[index].dx;
                    ball.dy = originalBallSpeeds[index].dy;
                });
                showToast('Cosmic Barrage expired!');
            }, 30000); // Increased from 15s to 30s
            showToast('Cosmic Barrage: 15 bricks destroyed, ball speed tripled for 30 seconds!');
            updateUI();
            break;
    }
}

function updateShopUI() {
    const ballShop = document.getElementById('ball-shop');
    ballShop.innerHTML = '';
    Object.keys(ballPrices).forEach(type => {
        const count = ballCounts[type] || 0;
        const price = ballPrices[type];
        const ballDiv = document.createElement('div');
        ballDiv.className = 'shop-item';
        ballDiv.innerHTML = `
            <span>${type.charAt(0).toUpperCase() + type.slice(1)} Ball: ${count}</span>
            <button onclick="buyBall('${type}')">Buy (${price}G)</button>
            ${count > 0 ? `<button onclick="removeBall('${type}')">Remove</button>` : ''}
        `;
        ballShop.appendChild(ballDiv);
    });

    const upgrades = [{
        name: 'Damage',
        key: 'damage',
        price: 100
    },
    {
        name: 'Speed',
        key: 'speed',
        price: 100
    },
    {
        name: 'Radius',
        key: 'radius',
        price: 100
    }
    ];
    const upgradeShop = document.getElementById('upgrade-shop');
    upgradeShop.innerHTML = '';
    upgrades.forEach(upgrade => {
        const level = upgradeLevels[upgrade.key] || 0;
        const upgradeDiv = document.createElement('div');
        upgradeDiv.className = 'shop-item';
        upgradeDiv.innerHTML = `
            <span>${upgrade.name} Upgrade: Level ${level}</span>
            <button onclick="buyUpgrade('${upgrade.key}')">Buy (${upgrade.price}G)</button>
            ${level > 0 ? `<button onclick="removeUpgrade('${upgrade.key}')">Remove</button>` : ''}
        `;
        upgradeShop.appendChild(upgradeDiv);
    });

    const powerupShop = document.getElementById('powerup-shop');
    powerupShop.innerHTML = `
        <div class="shop-item">
            <span>Powerup (5 balls)</span>
            <button onclick="buyPowerup(10, 5)">Buy (10R)</button>
        </div>
        <div class="shop-item">
            <span>Idle Gold Boost (+0.5/sec)</span>
            <button onclick="buyIdleGoldBoost()">Buy (${Math.floor(1500 * Math.max(1, Math.floor(idleGoldPerSecond / 0.5)) * 1.5 * (0.5 / (idleGoldPerSecond * 0.2 || 0.1)))} Gold)</button>
        </div>
        <div class="shop-item">
            <span>Nebula Ball Skin</span>
            <button onclick="buyCosmetic('nebulaSkin')">Buy (10R)</button>
        </div>
    `;
}

function removeBall(type) {
    const user = auth.currentUser;
    if (!user || isGuest) {
        showLoginPopupForSave();
        return;
    }
    if (ballCounts[type] <= 0) {
        showToast(`No ${type} balls to remove!`);
        return;
    }
    const refundGold = Math.floor(ballPrices[type] * 0.5); // Refund 50% of purchase price
    ballCounts[type]--;
    const index = balls.findIndex(b => b.type === type);
    if (index !== -1) balls.splice(index, 1);
    gold += refundGold;
    database.ref('users/' + user.uid + '/gameState').update({
        ballCounts: ballCounts,
        gold: gold
    }).then(() => {
        showToast(`Removed 1 ${type} ball, refunded ${refundGold} gold!`);
        updateUI();
        updateShopUI();
        updateLeaderboard();
    }).catch(error => {
        showToast('Failed to remove ball: ' + error.message);
        ballCounts[type]++;
        gold -= refundGold;
        balls.push(new Ball(
            canvas.width / 2,
            canvas.height / 2,
            type === 'big' ? 12 : type === 'child' ? 4 : 8,
            ballUpgrades[type].speed * (Math.random() > 0.5 ? 1 : -1),
            ballUpgrades[type].speed * (Math.random() > 0.5 ? 1 : -1), {
                basic: 'gray',
                sniper: 'blue',
                big: 'green',
                explosion: 'orange',
                multiplying: 'purple',
                child: 'purple',
                cannonball: 'darkgray',
                poison: 'lime',
                snowball: 'white'
            }[type],
            type
        ));
        updateUI();
        updateShopUI();
    });
}

function removeUpgrade(key) {
    const user = auth.currentUser;
    if (!user || isGuest) {
        showLoginPopupForSave();
        return;
    }
    if (upgradeLevels[key] <= 0) {
        showToast(`No ${key} upgrades to remove!`);
        return;
    }
    const refundGold = Math.floor(100 * 0.5); // Refund 50% of upgrade price
    upgradeLevels[key]--;
    gold += refundGold;
    // Recalculate ball upgrades based on new level
    Object.keys(ballUpgrades).forEach(type => {
        ballUpgrades[type][key] = (ballUpgrades[type][`base${key.charAt(0).toUpperCase() + key.slice(1)}`] || 1) * (1 + upgradeLevels[key] * 0.1);
    });
    database.ref('users/' + user.uid + '/gameState').update({
        upgradeLevels: upgradeLevels,
        gold: gold,
        ballUpgrades: ballUpgrades
    }).then(() => {
        showToast(`Removed 1 ${key} upgrade, refunded ${refundGold} gold!`);
        updateUI();
        updateShopUI();
        updateLeaderboard();
    }).catch(error => {
        showToast('Failed to remove upgrade: ' + error.message);
        upgradeLevels[key]++;
        gold -= refundGold;
        Object.keys(ballUpgrades).forEach(type => {
            ballUpgrades[type][key] = (ballUpgrades[type][`base${key.charAt(0).toUpperCase() + key.slice(1)}`] || 1) * (1 + upgradeLevels[key] * 0.1);
        });
        updateUI();
        updateShopUI();
    });
}

function showPowerupResult(powerups) {
    const overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';
    let resultHTML = '<div class="spinner-container"><h2>Your Powerups</h2><div class="powerup-result">';
    powerups.forEach(powerup => {
        resultHTML += `<div><span>${powerup.emoji}</span><span><b>${powerup.name}</b>: ${powerup.description}</span></div>`;
    });
    resultHTML += '</div><button class="close-btn"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button></div>';
    overlay.innerHTML = resultHTML;
    document.body.appendChild(overlay);
    overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}


Ball.prototype.draw = function () {
    drawTrail(this);
    ctx.beginPath();
    if (cosmetics.rainbowSkin) {
        const gradient = ctx.createLinearGradient(this.x - this.radius, this.y, this.x + this.radius, this.y);
        gradient.addColorStop(0, 'red');
        gradient.addColorStop(0.2, 'orange');
        gradient.addColorStop(0.4, 'yellow');
        gradient.addColorStop(0.6, 'green');
        gradient.addColorStop(0.8, 'blue');
        gradient.addColorStop(1, 'violet');
        ctx.fillStyle = gradient;
    } else if (cosmetics.nebulaSkin) {
        const gradient = ctx.createRadialGradient(this.x, this.y, this.radius / 2, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#4b0082');
        gradient.addColorStop(1, '#00b7eb');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = this.color;
    }
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
};

function showMyBallsPopup() {
    const maxUpgradeLevel = rebirthCount;
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    const basicCost = getUpgradeCost('basic');
    const sniperCost = getUpgradeCost('sniper');
    const bigCost = getUpgradeCost('big');
    const explosionCost = getUpgradeCost('explosion');
    const multiplyingCost = getUpgradeCost('multiplying');
    const childCost = getUpgradeCost('child');
    const cannonballCost = getUpgradeCost('cannonball');
    const poisonCost = getUpgradeCost('poison');
    const snowballCost = getUpgradeCost('snowball');
    overlay.innerHTML = `
        <div class="my-balls-popup">
            <h2>Upgrades (Max Level: ${maxUpgradeLevel})</h2>
            <button class="close-btn"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /> </svg></button>
            <div class="nav-tabs">
                <button class="tab-btn active" data-tab="my-balls">My Balls</button>
                <button class="tab-btn" data-tab="upgrades">Boosts</button>
                <button class="tab-btn" data-tab="rebirth">Rebirth</button>
                <button class="tab-btn" data-tab="shop">Shop</button>
            </div>
            <div class="tab-content active" id="my-balls">
                <div class="ball-stats">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="basic-stats-preview" width="40" height="40"></canvas>
                            <span><b>Basic</b>: ${balls.filter(b => b.type === 'basic').length} balls, Level: ${ballUpgrades.basic.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.basic.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.basic.damage.toFixed(1))}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < basicCost || ballUpgrades.basic.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('basic')">Upgrade<br>(${formatNumber(basicCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="sniper-stats-preview" width="40" height="40"></canvas>
                            <span><b>Sniper</b>: ${balls.filter(b => b.type === 'sniper').length} balls, Level: ${ballUpgrades.sniper.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.sniper.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.sniper.damage.toFixed(1))}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < sniperCost || ballUpgrades.sniper.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('sniper')">Upgrade<br>(${formatNumber(sniperCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="big-stats-preview" width="40" height="40"></canvas>
                            <span><b>Big</b>: ${balls.filter(b => b.type === 'big').length} balls, Level: ${ballUpgrades.big.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.big.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.big.damage.toFixed(1))}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < bigCost || ballUpgrades.big.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('big')">Upgrade<br>(${formatNumber(bigCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="explosion-stats-preview" width="40" height="40"></canvas>
                            <span><b>Bomb</b>: ${balls.filter(b => b.type === 'explosion').length} balls, Level: ${ballUpgrades.explosion.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.explosion.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.explosion.damage.toFixed(1))}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < explosionCost || ballUpgrades.explosion.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('explosion')">Upgrade<br>(${formatNumber(explosionCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="multiplying-stats-preview" width="40" height="40"></canvas>
                            <span><b>Clones</b>: ${balls.filter(b => b.type === 'multiplying').length} balls, Level: ${ballUpgrades.multiplying.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.multiplying.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.multiplying.damage.toFixed(1))}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < multiplyingCost || ballUpgrades.multiplying.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('multiplying')">Upgrade<br>(${formatNumber(multiplyingCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="child-stats-preview" width="40" height="40"></canvas>
                            <span><b>Child</b>: ${balls.filter(b => b.type === 'child').length} balls, Level: ${ballUpgrades.child.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.child.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.child.damage.toFixed(1))}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < childCost || ballUpgrades.child.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('child')">Upgrade<br>(${formatNumber(childCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="cannonball-stats-preview" width="40" height="40"></canvas>
                            <span><b>Cannon</b>: ${balls.filter(b => b.type === 'cannonball').length} balls, Level: ${ballUpgrades.cannonball.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.cannonball.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.cannonball.damage.toFixed(1))}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < cannonballCost || ballUpgrades.cannonball.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('cannonball')">Upgrade<br>(${formatNumber(cannonballCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="poison-stats-preview" width="40" height="40"></canvas>
                            <span><b>Poison</b>: ${balls.filter(b => b.type === 'poison').length} balls, Level: ${ballUpgrades.poison.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.poison.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.poison.damage.toFixed(1))}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < poisonCost || ballUpgrades.poison.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('poison')">Upgrade<br>(${formatNumber(poisonCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="snowball-stats-preview" width="40" height="40"></canvas>
                            <span><b>Snowball</b>: ${balls.filter(b => b.type === 'snowball').length} balls, Level: ${ballUpgrades.snowball.level}/${maxUpgradeLevel}, Speed: ${ballUpgrades.snowball.speed.toFixed(1)}, Damage: ${formatNumber(ballUpgrades.snowball.damage)}</span>
                        </div>
                        <button class="upgrade-btn" ${gold < snowballCost || ballUpgrades.snowball.level >= maxUpgradeLevel ? 'disabled' : ''} onclick="upgradeBall('snowball')">Upgrade<br>(${formatNumber(snowballCost)})</button>
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <canvas id="auto-stats-preview" width="40" height="40"></canvas>
                            <span><b>Auto</b>: ${autoBalls.length} balls, Speed: 10, Damage: Instant Destroy</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tab-content" id="upgrades">
                <div class="upgrades-list">
                    <div style="display: flex; align-items: center; gap: 10px; background: linear-gradient(145deg, #f4eed6, #e9dcaf); padding: 12px; border-radius: 8px; border: 0 solid #333;">
                        <div style="width: 40px; height: 40px; background: cyan; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">🚀</div>
                        <span style="flex: 1;">Speed Boost: Increase all ball speed by 2x for 1 minute</span>
                        <button class="upgrade-btn" ${globalUpgrades.speedBoost.active || gold < globalUpgrades.speedBoost.cost ? 'disabled' : ''} onclick="applyGlobalUpgrade('speedBoost')">${globalUpgrades.speedBoost.active ? 'Active' : 'Activate'}<br>(${globalUpgrades.speedBoost.cost} gold)</button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; background: linear-gradient(145deg, #f4eed6, #e9dcaf); padding: 12px; border-radius: 8px; border: 0 solid #333;">
                        <div style="width: 40px; height: 40px; background: gold; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">💰</div>
                        <span style="flex: 1;">Gold Boost: Increase gold production by 2x for 1 minute</span>
                        <button class="upgrade-btn" ${globalUpgrades.goldBoost.active || gold < globalUpgrades.goldBoost.cost ? 'disabled' : ''} onclick="applyGlobalUpgrade('goldBoost')">${globalUpgrades.goldBoost.active ? 'Active' : 'Activate'}<br>(${globalUpgrades.goldBoost.cost} gold)</button>
                    </div>
                </div>
            </div>
            <div class="tab-content" id="rebirth">
                <div class="rebirth-info">
                    <p>Rebirth at level 100 to start from level 1, losing all balls and gold but keeping ball upgrades.</p>
                    <p>Current Idle Gold Per Second: <b>${formatNumber(idleGoldPerSecond)}</b></p>
                    <p>Each rebirth increases idle gold per second by 1.2 times and max upgrade level by 5.</p>
                    <button class="rebirth-btn" ${level < 100 ? 'disabled' : ''} onclick="rebirth()">Rebirth (Level ${level}/100)</button>
                </div>
            </div>
            <div class="tab-content" id="shop">
<div class="shop-option">
    <span>Auto Rebirth (Cost: 10 rebirths)</span>
    <button id="buy-auto-rebirth-btn">Buy</button>
</div>
<div id="auto-rebirth-toggle-container" style="display:none; margin-top:10px;">
    <label>
        <input type="checkbox" id="auto-rebirth-toggle">
        Enable Auto Rebirth
    </label>
</div>
                <div class="shop-options">
                    <h3>Powerups</h3>
                    <div class="shop-option">
                        <span>🎲 Random Powerup</span>
                        <span class="tooltip">Grants 1 random powerup (e.g., Thunder Strike, Shield Boost).</span>
                        <button onclick="buyPowerup(1, 1)" ${rebirthCount < 1 ? 'disabled' : ''}>Buy (1 Rebirth)</button>
                    </div>
                    <div class="shop-option">
                        <span>💰 Idle Gold Boost</span>
                        <span class="tooltip">Permanently increases idle gold by +0.5/sec.</span>
                        <button onclick="buyIdleGoldBoost()" ${gold < Math.floor(1500 * Math.max(1, Math.floor(idleGoldPerSecond / 0.5)) * 1.5 * (0.5 / (idleGoldPerSecond * 0.2 || 0.1))) ? 'disabled' : ''}>Buy (${formatNumber(Math.floor(1500 * Math.max(1, Math.floor(idleGoldPerSecond / 0.5)) * 1.5 * (0.5 / (idleGoldPerSecond * 0.2 || 0.1))))} Gold)</button>
                    </div>
                    <div class="shop-option">
                        <span>🌌 Cosmic Barrage</span>
                        <span class="tooltip">Destroys 15 bricks and triples ball speed for 30 seconds.</span>
                        <button onclick="buyPowerup(5, 1, 'cosmicBarrage')" ${rebirthCount < 5 ? 'disabled' : ''}>Buy (5 Rebirths)</button>
                    </div>
                    <h3>Skins & Trails</h3>
                    <div class="shop-option">
                        <span>🌌 Nebula Ball Skin</span>
                        <span class="tooltip">Cosmic-themed ball skin with a starry gradient.</span>
                        <button class="cosmetic-btn" data-cosmetic="nebulaSkin" onmouseenter="toggleCosmeticButton(this, 'nebulaSkin')" onmouseleave="toggleCosmeticButton(this, 'nebulaSkin')" onclick="${cosmetics.nebulaSkin ? "deleteCosmetic('nebulaSkin')" : "buyCosmetic('nebulaSkin')"}" ${!cosmetics.nebulaSkin && rebirthCount < 10 ? 'disabled' : ''}>${cosmetics.nebulaSkin ? 'Delete' : 'Buy (10 Rebirths)'}</button>
                    </div>
                    <div class="shop-option">
                        <span>🔥 Fire Trail</span>
                        <span class="tooltip">Leaves a fiery trail behind balls.</span>
                        <button class="cosmetic-btn" data-cosmetic="fireTrail" onmouseenter="toggleCosmeticButton(this, 'fireTrail')" onmouseleave="toggleCosmeticButton(this, 'fireTrail')" onclick="${cosmetics.fireTrail ? "deleteCosmetic('fireTrail')" : "buyCosmetic('fireTrail')"}" ${!cosmetics.fireTrail && gold < 500 ? 'disabled' : ''}>${cosmetics.fireTrail ? 'Delete' : 'Buy (500 Gold)'}</button>
                    </div>
                    <div class="shop-option">
                        <span>❄️ Ice Trail</span>
                        <span class="tooltip">Leaves a frosty trail behind balls.</span>
                        <button class="cosmetic-btn" data-cosmetic="iceTrail" onmouseenter="toggleCosmeticButton(this, 'iceTrail')" onmouseleave="toggleCosmeticButton(this, 'iceTrail')" onclick="${cosmetics.iceTrail ? "deleteCosmetic('iceTrail')" : "buyCosmetic('iceTrail')"}" ${!cosmetics.iceTrail && gold < 500 ? 'disabled' : ''}>${cosmetics.iceTrail ? 'Delete' : 'Buy (500 Gold)'}</button>
                    </div>
                    <div class="shop-option">
                        <span>🌈 Rainbow Ball Skin</span>
                        <span class="tooltip">Vibrant, color-shifting ball skin.</span>
                        <button class="cosmetic-btn" data-cosmetic="rainbowSkin" onmouseenter="toggleCosmeticButton(this, 'rainbowSkin')" onmouseleave="toggleCosmeticButton(this, 'rainbowSkin')" onclick="${cosmetics.rainbowSkin ? "deleteCosmetic('rainbowSkin')" : "buyCosmetic('rainbowSkin')"}" ${!cosmetics.rainbowSkin && rebirthCount < 15 ? 'disabled' : ''}>${cosmetics.rainbowSkin ? 'Delete' : 'Buy (15 Rebirths)'}</button>
                    </div>
                    <h3>Bundles</h3>
                    <div class="shop-option">
                        <span>🥈 Silver Bundle</span>
                        <span class="tooltip">Includes Nebula Skin and 2 Random Powerups.</span>
                        <button class="cosmetic-btn" data-cosmetic="bundleSilver" onmouseenter="toggleCosmeticButton(this, 'bundleSilver')" onmouseleave="toggleCosmeticButton(this, 'bundleSilver')" onclick="${cosmetics.bundleSilver ? "deleteCosmetic('bundleSilver')" : "buyCosmetic('bundleSilver')"}" ${!cosmetics.bundleSilver && rebirthCount < 20 ? 'disabled' : ''}>${cosmetics.bundleSilver ? 'Delete' : 'Buy (20 Rebirths)'}</button>
                    </div>
                    <div class="shop-option">
                        <span>🥇 Gold Bundle</span>
                        <span class="tooltip">Includes Nebula Skin, Fire Trail, and 3 Random Powerups.</span>
                        <button class="cosmetic-btn" data-cosmetic="bundleGold" onmouseenter="toggleCosmeticButton(this, 'bundleGold')" onmouseleave="toggleCosmeticButton(this, 'bundleGold')" onclick="${cosmetics.bundleGold ? "deleteCosmetic('bundleGold')" : "buyCosmetic('bundleGold')"}" ${!cosmetics.bundleGold && rebirthCount < 30 ? 'disabled' : ''}>${cosmetics.bundleGold ? 'Delete' : 'Buy (30 Rebirths)'}</button>
                    </div>
                    <div class="shop-option">
                        <span>💎 Platinum Bundle</span>
                        <span class="tooltip">Includes Nebula Skin, Fire Trail, Ice Trail, Rainbow Skin, and 5 Random Powerups.</span>
                        <button class="cosmetic-btn" data-cosmetic="bundlePlatinum" onmouseenter="toggleCosmeticButton(this, 'bundlePlatinum')" onmouseleave="toggleCosmeticButton(this, 'bundlePlatinum')" onclick="${cosmetics.bundlePlatinum ? "deleteCosmetic('bundlePlatinum')" : "buyCosmetic('bundlePlatinum')"}" ${!cosmetics.bundlePlatinum && rebirthCount < 50 ? 'disabled' : ''}>${cosmetics.bundlePlatinum ? 'Delete' : 'Buy (50 Rebirths)'}</button>
                    </div>
                    <h3>Boosts</h3>
                    <div class="shop-option">
                        <span>💥 Instant Brick Destroy</span>
                        <span class="tooltip">Destroys 3 random bricks instantly, grants 5 gold each.</span>
                        <button onclick="buyInstantBrickDestroy()" ${gold < getDynamicPrice(basePrices.instantBrickDestroy) ? 'disabled' : ''}>Buy (${formatNumber(getDynamicPrice(basePrices.instantBrickDestroy))} Gold)</button>
                    </div>
                    <div class="shop-option">
                        <span>⚡ Double Damage</span>
                        <span class="tooltip">Increases all ball damage by 2.5x for 60 seconds.</span>
                        <button onclick="buyDoubleDamage()" ${gold < getDynamicPrice(basePrices.doubleDamage) ? 'disabled' : ''}>Buy (${formatNumber(getDynamicPrice(basePrices.doubleDamage))} Gold)</button>
                    </div>
                    <div class="shop-option">
                        <span>🏀 Extra Ball</span>
                        <span class="tooltip">Adds 1 random ball (Sniper, Big, Bomb, or Clones).</span>
                        <button onclick="buyExtraBall()" ${gold < getDynamicPrice(basePrices.extraBall) || balls.length >= maxBalls ? 'disabled' : ''}>Buy (${formatNumber(getDynamicPrice(basePrices.extraBall))} Gold)</button>
                    </div>
                    <div class="shop-option">
                        <span>🧲 Gold Magnet</span>
                        <span class="tooltip">Collects all gold power-ups for 30 seconds, 100 gold each.</span>
                        <button onclick="buyGoldMagnet()" ${gold < getDynamicPrice(basePrices.goldMagnet) ? 'disabled' : ''}>Buy (${formatNumber(getDynamicPrice(basePrices.goldMagnet))} Gold)</button>
                    </div>
                    <div class="shop-option">
                        <span>🛠️ Brick Health Reduction</span>
                        <span class="tooltip">Reduces all brick health to 30% (minimum 1).</span>
                        <button onclick="buyBrickHealthReduction()" ${gold < getDynamicPrice(basePrices.brickHealthReduction) ? 'disabled' : ''}>Buy (${formatNumber(getDynamicPrice(basePrices.brickHealthReduction))} Gold)</button>
                    </div>
                    <div class="shop-option">
                        <span>🚀 Speed Surge</span>
                        <span class="tooltip">Increases ball speed by 4x for 30 seconds.</span>
                        <button onclick="buySpeedSurge()" ${gold < getDynamicPrice(basePrices.speedSurge) ? 'disabled' : ''}>Buy (${formatNumber(getDynamicPrice(basePrices.speedSurge))} Gold)</button>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .cosmetic-btn:hover:not(:disabled) {
                background: #ff4d4d;
                color: white;
            }
        </style>
    `;
    document.body.appendChild(overlay);
    drawBallPreview('basic-stats-preview', 'gray', 8);
    drawBallPreview('sniper-stats-preview', 'blue', 8);
    drawBallPreview('big-stats-preview', 'green', 12);
    drawBallPreview('explosion-stats-preview', 'orange', 8);
    drawBallPreview('multiplying-stats-preview', 'purple', 8);
    drawBallPreview('child-stats-preview', 'purple', 4);
    drawBallPreview('cannonball-stats-preview', 'darkgray', 8);
    drawBallPreview('poison-stats-preview', 'lime', 8);
    drawBallPreview('snowball-stats-preview', 'white', 8);
    drawBallPreview('auto-stats-preview', 'black', 8);

    const tabs = overlay.querySelectorAll('.tab-btn');
    const contents = overlay.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            overlay.querySelector(`#${tab.dataset.tab}`).classList.add('active');
        });
    });
    overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    document.getElementById('buy-auto-rebirth-btn')?.addEventListener('click', buyAutoRebirth);
}

function toggleCosmeticButton(button, cosmeticName) {
    if (!cosmetics[cosmeticName] && !button.disabled) {
        button.textContent = button.textContent === `Buy (${getCosmeticCostText(cosmeticName)})` ? 'Buy' : `Buy (${getCosmeticCostText(cosmeticName)})`;
    }
}

function getCosmeticCostText(cosmeticName) {
    const costs = {
        nebulaSkin: '10 Rebirths',
        fireTrail: '500 Gold',
        iceTrail: '500 Gold',
        rainbowSkin: '15 Rebirths',
        bundleSilver: '20 Rebirths',
        bundleGold: '30 Rebirths',
        bundlePlatinum: '50 Rebirths'
    };
    return costs[cosmeticName] || '';
}
// Base prices for gold-based shop options
const basePrices = {
    instantBrickDestroy: 100,
    doubleDamage: 150,
    extraBall: 200,
    goldMagnet: 250,
    brickHealthReduction: 300,
    speedSurge: 350
};

// Function to calculate dynamic price based on idle gold rate
function getDynamicPrice(basePrice) {
    const multiplier = Math.max(1, Math.floor(idleGoldPerSecond / 0.5)); // Scale price based on idle gold per second
    const dynamicPrice = Math.round(basePrice * (1 + multiplier * 0.1)); // Increase by 10% per 0.5 gold/sec
    return Math.max(basePrice, dynamicPrice); // Ensure price doesn't go below base
}

let settings = {
    backgroundMusic: true,
    backgroundMusicVolume: 0.5
};

const bgMusic = new Audio("./public/LevelWave.m4a");
bgMusic.loop = true;
bgMusic.volume = settings.backgroundMusicVolume;

function applyMusicSettings() {
    bgMusic.volume = settings.backgroundMusicVolume;
    if (settings.backgroundMusic) {
        bgMusic.play().catch(() => {
            // Autoplay blocked: unlock on first user gesture
            document.addEventListener("pointerdown", resumeAudioOnce, { once: true, passive: true });
        });
    } else {
        bgMusic.pause();
    }
}

function resumeAudioOnce() {
    bgMusic.play().catch(() => { });
}

function persistSettings() {
    // Local
    const local = JSON.parse(localStorage.getItem("brickerGameState")) || {};
    local.settings = {
        ...(local.settings || {}),
        backgroundMusic: settings.backgroundMusic,
        backgroundMusicVolume: settings.backgroundMusicVolume
    };
    localStorage.setItem("brickerGameState", JSON.stringify(local));

    // DB (if logged in)
    const user = auth.currentUser;
    if (user && !isGuest) {
        database.ref("users/" + user.uid + "/gameState/settings").update({
            backgroundMusic: settings.backgroundMusic,
            backgroundMusicVolume: settings.backgroundMusicVolume
        });
    }
}

function setBackgroundMusicEnabled(enabled) {
    settings.backgroundMusic = !!enabled;
    persistSettings();
    applyMusicSettings();
}

function setBackgroundMusicVolume(vol) {
    const v = Math.max(0, Math.min(1, Number(vol)));
    settings.backgroundMusicVolume = isNaN(v) ? 1 : v;
    persistSettings();
    applyMusicSettings();
}

// Show settings popup
function showSettingsPopup() {
    const user = auth.currentUser;
    const email = user ? user.email : 'Guest';
    const rankSettings = getRankName(rebirthCount);
    const rankNameSettings = rankSettings.name;

    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
        <div class="settings-popup">
            <h2>Settings</h2>
            <button class="close-btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
                    stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" 
                        d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>

            <div style="display:flex; gap:15px;">
                <!-- Sidebar -->
                <div class="nav-tabs" style="flex-direction:column; min-width:120px;">
                    <button class="active" data-tab="profile-tab">Profile</button>
                    <button data-tab="stats-tab">Stats</button>
                    <button data-tab="theme-tab">Theme</button>
                    <button data-tab="danger-tab">Danger</button>
                </div>

                <!-- Tab Content -->
                <div style="flex:1;">
                    <div id="profile-tab" class="tab-content active">
                        <div class="settings-info">
                            <p>Email: ${email}</p>
                            <p>Username: <span id="username-display">${username || 'Not set'}</span>
                                <span class="edit-icon" onclick="editUsername()">✏️</span>
                            </p>
                            <div id="username-input" style="display:none;">
                                <input type="text" id="username-field" value="${username || ''}" placeholder="Enter username">
                                <button onclick="saveUsername()">Save</button>
                            </div>
                        </div>
                    </div>

                    <div id="stats-tab" class="tab-content">
                        <div class="settings-info">
                            <p>Total Play Time: ${(stats.totalPlayTime / 3600).toFixed(2)} hours</p>
                            <p>Total Balls Purchased: ${stats.totalBallsPurchased}</p>
                            <p>Total Upgrades Purchased: ${stats.totalUpgrades}</p>
                            <p>Total Bricks Destroyed: ${stats.totalBricksBroken}</p>
                            <p>Total Rebirths: ${rebirthCount || 0}</p>
                            <p>Donated: ${formatNumber(stats.totalDonated || 0)} Gold</p>
                            <p>Rank: ${rankNameSettings}</p>
                        </div>
                    </div>

<div id="theme-tab" class="tab-content"> 
    <div class="settings-info" style="display:flex; flex-direction:column; gap:12px;"> 
        <!-- Background music toggle --> 
        <label style="display:flex; flex-direction:row; align-items:center; justify-content:flex-start; gap:8px;"> 
            <input type="checkbox" id="bg-music-toggle"> 
            Toggle LevelWave (by Modric) 
            
        </label> 
            
            <!-- Volume control --> 
            <label style="display:flex; align-items:center; gap:8px;"> 
                Volume: <input type="range" id="bg-music-volume" min="0" max="1" step="0.01" style="flex:1;"> 
                <span id="bg-music-volume-display">100%</span> 
            </label>

        <!-- Credits -->
        <p style="margin-top:10px; font-size:14px; font-weight:500;">
            Song by 
            <a href="https://whatsapp.com/channel/0029VbBPOpPEFeXouOvHCY1D" 
               target="_blank" 
               style="color:#0053a6; font-weight:700; text-decoration:none;">
               Modric
            </a>
        </p>
    </div>
</div>



                    <div id="danger-tab" class="tab-content">
                        <div class="settings-info">
                            ${user ? `
                                <button onclick="auth.signOut().then(() => location.reload())">Log Out</button>
                                <button onclick="deleteAccount()">Delete Account</button>
                            ` : `<p>You must be logged in to manage account.</p>`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Music toggle
    const toggle = overlay.querySelector('#bg-music-toggle');
    toggle.checked = !!settings.backgroundMusic;
    toggle.addEventListener('change', (e) => {
        setBackgroundMusicEnabled(e.target.checked);
    });

    // Volume control
    const volumeSlider = overlay.querySelector('#bg-music-volume');
    const volumeDisplay = overlay.querySelector('#bg-music-volume-display');

    volumeSlider.value = settings.backgroundMusicVolume;
    volumeDisplay.textContent = Math.round(settings.backgroundMusicVolume * 100) + "%";

    volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        setBackgroundMusicVolume(vol);
        volumeDisplay.textContent = Math.round(settings.backgroundMusicVolume * 100) + "%";
    });



    // Close functionality
    overlay.querySelector('.close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    // Tab switching
    overlay.querySelectorAll('.nav-tabs button').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            overlay.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
            overlay.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

            // Activate this
            btn.classList.add('active');
            overlay.querySelector(`#${btn.dataset.tab}`).classList.add('active');
        });
    });
}

/*function toggleBackgroundMusic(enabled) {
    bgMusicEnabled = enabled;
 
    if (enabled) {
        bgMusic.play().catch(() => { }); // browsers may block until user interacts
    } else {
        bgMusic.pause();
    }
 
    // Save instantly to localStorage
    const currentState = JSON.parse(localStorage.getItem("brickerGameState")) || {};
    currentState.settings = currentState.settings || {};
    currentState.settings.backgroundMusic = enabled;
    localStorage.setItem("brickerGameState", JSON.stringify(currentState));
 
    // If logged in, update DB
    const user = auth.currentUser;
    if (user && !isGuest) {
        database.ref("users/" + user.uid + "/gameState/settings").update({
            backgroundMusic: enabled
        });
    }
}*/



// Edit username
function editUsername() {
    document.getElementById('username-display').style.display = 'none';
    document.getElementById('username-input').style.display = 'block';
    document.querySelector('.edit-icon').style.display = 'none';
}

function saveUsername() {
    username = document.getElementById('username-field').value;
    document.getElementById('username-display').textContent = username || 'Not set';
    document.getElementById('username-display').style.display = 'inline';
    document.getElementById('username-input').style.display = 'none';
    document.querySelector('.edit-icon').style.display = 'inline';
    saveGameState();
}

function saveUsername() {
    const newUsername = document.getElementById('username-field').value;
    if (!newUsername) {
        showToast('Please enter a valid username.');
        return;
    }
    const user = auth.currentUser;
    if (!user) {
        showToast('No user logged in.');
        return;
    }
    username = newUsername;
    document.getElementById('username-display').textContent = username;
    document.getElementById('username-display').style.display = 'inline';
    document.getElementById('username-input').style.display = 'none';
    document.querySelector('.edit-icon').style.display = 'inline';

    const updates = {
        [`users/${user.uid}/gameState/username`]: username
    };

    // Update username in all teams the user is part of
    database.ref('teams').orderByChild(`members/${user.uid}`).startAt('').once('value')
        .then(snap => {
            const teams = snap.val() || {};
            Object.keys(teams).forEach(teamId => {
                updates[`teams/${teamId}/members/${user.uid}`] = username;
            });

            // Check if user is online and set reload flag
            database.ref(`presence/${user.uid}`).once('value').then(presenceSnap => {
                const isOnline = presenceSnap.val() === true;
                if (isOnline) {
                    updates[`reload/${user.uid}`] = true;
                }
                database.ref().update(updates)
                    .then(() => {
                        showToast('Username updated successfully!');
                        saveGameState();
                    })
                    .catch(error => {
                        showToast(`Failed to update username: ${error.message}`);
                    });
            }).catch(error => {
                showToast(`Error checking presence: ${error.message}`);
            });
        })
        .catch(error => {
            showToast(`Error fetching team data: ${error.message}`);
        });
    saveGameState();

}

function deleteAccount() {
    const user = auth.currentUser;
    if (!user) {
        showToast('No user logged in.');
        return;
    }
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
    }

    const updates = {};

    // Remove user from all teams
    database.ref('teams').orderByChild(`members/${user.uid}`).startAt('').once('value')
        .then(snap => {
            const teams = snap.val() || {};
            Object.keys(teams).forEach(teamId => {
                updates[`teams/${teamId}/members/${user.uid}`] = null;
            });

            // Remove user data 
            updates[`users/${user.uid}`] = null;
            updates[`presence/${user.uid}`] = null;
            updates[`reload/${user.uid}`] = null;

            database.ref().update(updates)
                .then(() => {
                    user.delete()
                        .then(() => {
                            showToast('Account deleted successfully.');
                            updateLeaderboard();
                            location.reload();
                        })
                        .catch(error => {
                            showToast(`Failed to delete account: ${error.message}`);
                        });
                })
                .catch(error => {
                    showToast(`Failed to delete game data or team membership: ${error.message}`);
                });
        })
        .catch(error => {
            showToast(`Error fetching team data: ${error.message}`);
        });
}

const weaponCost = 1000;

// Deploy random weapon
function deployRandomWeapon() {
    const weapons = ['nuke', 'airstrike', 'gravity', 'laser', 'blackhole'];
    const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
    switch (randomWeapon) {
        case 'nuke':
            deployNuke();
            break;
        case 'airstrike':
            deployAirstrike();
            break;
        case 'gravity':
            manipulateGravity();
            break;
        case 'laser':
            deployLaser();
            break;
        case 'blackhole':
            createBlackhole();
            break;
    }
}

// Deploy nuke
function deployNuke() {
    showToast('Nuke deployed! All bricks destroyed!');
    setTimeout(() => {
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 200, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fill();
        ctx.closePath();
        bricks.forEach(brick => {
            brick.health = 0;
            bricks = bricks.filter(b => b !== brick);
            gold += 5;
            if (powerUps.length < maxPowerUps) spawnPowerUp();
        });
        updateUI();
    }, 0);
}

// Deploy airstrike
function deployAirstrike() {
    showToast('Airstrike deployed! 3 random bricks destroyed!');
    ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
    ctx.fillRect(canvas.width / 2 - 150, 0, 300, 50);
    for (let i = 0; i < 3; i++) {
        const randomBrick = bricks[Math.floor(Math.random() * bricks.length)];
        if (randomBrick) {
            randomBrick.health = 0;
            bricks = bricks.filter(b => b !== randomBrick);
            gold += 5;
            if (powerUps.length < maxPowerUps) spawnPowerUp();
            updateUI();
        }
    }
}

// Manipulate gravity
function manipulateGravity() {
    showToast('Gravity increased! Balls fall faster for 10 seconds!');
    const originalDy = balls.map(ball => ball.dy);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 150, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.fill();
    ctx.closePath();
    balls.forEach(ball => {
        ball.dy *= 1.5;
    });
    setTimeout(() => {
        balls.forEach((ball, index) => {
            ball.dy = originalDy[index];
        });
    }, 10000);
}

// Deploy laser
function deployLaser() {
    showToast('Laser deployed! Destroys bricks for 5 seconds!');
    const laser = {
        x: canvas.width / 2,
        y: 0,
        width: 5,
        height: canvas.height,
        color: 'red'
    };
    const laserInterval = setInterval(() => {
        ctx.fillStyle = laser.color;
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        const nearbyBricks = getNearbyBricks({
            x: laser.x + laser.width / 2,
            y: laser.height / 2
        });
        nearbyBricks.forEach(brick => {
            if (laser.x + laser.width > brick.x && laser.x < brick.x + brick.width) {
                brick.health = 0;
                bricks = bricks.filter(b => b !== brick);
                gold += 5;
                if (powerUps.length < maxPowerUps) spawnPowerUp();
                updateUI();
            }
        });
    }, 50);
    setTimeout(() => clearInterval(laserInterval), 5000);
}

// Create blackhole
function createBlackhole() {
    showToast('Blackhole created! Pulls balls and bricks for 5 seconds!');
    const blackhole = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 50
    };
    const blackholeInterval = setInterval(() => {
        ctx.beginPath();
        ctx.arc(blackhole.x, blackhole.y, blackhole.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fill();
        ctx.closePath();
        balls.forEach(ball => {
            const angle = Math.atan2(blackhole.y - ball.y, blackhole.x - ball.x);
            ball.x += Math.cos(angle) * 2;
            ball.y += Math.sin(angle) * 2;
        });
        bricks.forEach((brick, index) => {
            const angle = Math.atan2(blackhole.y - brick.y, blackhole.x - brick.x);
            brick.x += Math.cos(angle) * 0.5;
            brick.y += Math.sin(angle) * 0.5;
            const distance = Math.sqrt(Math.pow(blackhole.x - brick.x, 2) + Math.pow(blackhole.y - brick.y, 2));
            if (distance < blackhole.radius) {
                brick.health = 0;
                bricks = bricks.filter(b => b !== brick);
                gold += 5;
                if (powerUps.length < maxPowerUps) spawnPowerUp();
                updateUI();
            }
        });
    }, 30);
    setTimeout(() => clearInterval(blackholeInterval), 5000);
}

// Draw trail
function drawTrail(ball) {
    const speed = Math.sqrt(ball.dx ** 2 + ball.dy ** 2);
    const trailLength = Math.min(5, Math.max(3, speed * 2));
    if (!ball.trail) ball.trail = [];
    ball.trail.push({
        x: ball.x,
        y: ball.y
    });
    if (ball.trail.length > trailLength) ball.trail.shift();
    ball.trail.forEach((position, index) => {
        const alpha = index / ball.trail.length;
        ctx.beginPath();
        ctx.arc(position.x, position.y, ball.radius * 1.2, 0, Math.PI * 2);
        let fillStyle = `rgba(255, 255, 255, ${0.2 * alpha})`;
        if (cosmetics.fireTrail) {
            fillStyle = `rgba(255, 69, 0, ${0.4 * alpha})`;
        } else if (cosmetics.iceTrail) {
            fillStyle = `rgba(135, 206, 235, ${0.4 * alpha})`;
        }
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.closePath();
    });
}

// Next level
function nextLevel() {
    if (bricks.length === 0) {
        level++;
        updateBallOptionsUI();
        updateUI();
        if (level >= 100 && autoRebirthOwned && autoRebirthEnabled) {
            rebirth(true, true); // skipConfirm=true, silent=true
        } else {
            spawnBricks();
            updateUI();
        }
    }
}

// Game loop
function gameLoop() {
    let lastTime = performance.now();

    function loop(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (document.hidden) {
            generatePassiveGold();
            updatePlayTime();
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            balls.forEach(ball => {
                drawTrail(ball);
                ball.move();
                ball.draw();
            });
            effects.forEach(effect => {
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 0, ${effect.timer / 10})`;
                ctx.fill();
                ctx.closePath();
                effect.timer--;
            });
            effects = effects.filter(effect => effect.timer > 0);
            powerUps = powerUps.filter(p => p.active);
            powerUps.forEach(powerUp => {
                if (powerUp.active) {
                    powerUp.draw();
                    powerUp.collect();
                }
            });
            autoBalls.forEach(autoBall => {
                autoBall.move();
                autoBall.draw();
            });
            bricks.forEach(brick => brick.draw());
            nextLevel();
            updateMilestones();
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

function isAutoBallBoostTime() {
    const now = new Date();
    const hours = now.getHours();
    return hours >= 11 && hours < 14; // 11 AM to 2 PM
}

function showSG60GiveawayPopup(userId) {
    const giveawayRedeemed = localStorage.getItem(`sg60Giveaway_${userId}`);
    if (!giveawayRedeemed && document.querySelector('#gameCanvas')) {
        const overlay = document.createElement('div');
        overlay.className = 'sg60-overlay';
        overlay.innerHTML = `
                <div class="sg60-popup">
                    <button class="close-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2>SG60 GIVEAWAY!</h2>
                    <div class="sg60-content">
                        <div class="sg60-gift-box">
                            <canvas id="giftBoxCanvas" width="80" height="80"></canvas>
                        </div>
                        <p>Redeem your exclusive SG60 gift of <strong>500,000 Gold</strong> now and dominate the Bricker leaderboard!</p>
                        <div class="button-group">
                            <button id="redeem-giveaway">Claim Now</button>
                            <button id="cancel-giveaway">Later</button>
                        </div>
                    </div>
                </div>
            `;
        document.body.appendChild(overlay);

        // Draw simple gift box on canvas to match game style
        const canvas = overlay.querySelector('#giftBoxCanvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f4eed6';
        ctx.fillRect(15, 25, 50, 40); // Gift body
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, 25, 50, 40);
        ctx.fillStyle = '#e9dcaf';
        ctx.fillRect(10, 15, 60, 10); // Gift lid
        ctx.strokeRect(10, 15, 60, 10);
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('500K', 40, 45); // Gold text

        const redeemBtn = overlay.querySelector('#redeem-giveaway');
        const cancelBtn = overlay.querySelector('#cancel-giveaway');
        const closeBtn = overlay.querySelector('.close-btn');

        redeemBtn.addEventListener('click', () => {
            redeemBtn.disabled = true;
            redeemSG60Giveaway(userId);
            overlay.remove();
        });
        cancelBtn.addEventListener('click', () => overlay.remove());
        closeBtn.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }
}

function redeemSG60Giveaway(userId) {
    const user = auth.currentUser;
    if (user) {
        gold += 500000;
        localStorage.setItem(`sg60Giveaway_${userId}`, 'true');
        database.ref('users/' + userId + '/gameState').update({
            gold: gold
        }).then(() => {
            showToast('SG60 Giveaway redeemed! 500,000 Gold added!');
            updateUI();
        }).catch(error => {
            showToast('Failed to redeem giveaway: ' + error.message);
            gold -= 500000;
            localStorage.removeItem(`sg60Giveaway_${userId}`);
            updateUI();
        });
    }
}

// Simple confetti animation
function triggerConfetti(container) {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
        container.appendChild(confetti);
    }
}

function migrateNewBalls() {
    const user = auth.currentUser;
    if (!user || isGuest) {
        return; // Skip migration for guests or unauthenticated users
    }

    const migrationKey = `newBallsMigrated_${user.uid}`;
    if (localStorage.getItem(migrationKey)) {
        return; // Migration already completed
    }

    database.ref('users/' + user.uid + '/gameState').once('value', (snapshot) => {
        const data = snapshot.val() || {};
        const ballCounts = data.ballCounts || {};
        const ballPrices = data.ballPrices || {};
        const ballUpgrades = data.ballUpgrades || {};

        // Check if any new ball type is missing
        const newBallTypes = ['basic', 'cannonball', 'poison', 'snowball'];
        const needsMigration = newBallTypes.some(type => !(type in ballCounts));

        if (needsMigration) {
            // Set default counts (add 1 of each new ball type)
            ballCounts.basic = (ballCounts.basic || 0) + 1;
            ballCounts.cannonball = (ballCounts.cannonball || 0) + 1;
            ballCounts.poison = (ballCounts.poison || 0) + 1;
            ballCounts.snowball = (ballCounts.snowball || 0) + 1;

            // Set default prices
            ballPrices.basic = ballPrices.basic || 25;
            ballPrices.cannonball = ballPrices.cannonball || 150;
            ballPrices.poison = ballPrices.poison || 175;
            ballPrices.snowball = ballPrices.snowball || 200;

            // Set default upgrades
            ballUpgrades.basic = ballUpgrades.basic || {
                level: 1,
                speed: 3.5,
                damage: 1
            };
            ballUpgrades.cannonball = ballUpgrades.cannonball || {
                level: 1,
                speed: 3.0,
                damage: 3
            };
            ballUpgrades.poison = ballUpgrades.poison || {
                level: 1,
                speed: 3.5,
                damage: 1
            };
            ballUpgrades.snowball = ballUpgrades.snowball || {
                level: 1,
                speed: 3.5,
                damage: 1
            };

            // Update Firebase database
            database.ref('users/' + user.uid + '/gameState').update({
                ballCounts: ballCounts,
                ballPrices: ballPrices,
                ballUpgrades: ballUpgrades
            }).then(() => {
                // Mark migration as complete in local storage
                localStorage.setItem(migrationKey, 'true');
                showToast('Added new ball types: Basic, Cannonball, Poison, and Snowball!');
                // Update local game state
                Object.assign(window.ballCounts, ballCounts);
                Object.assign(window.ballPrices, ballPrices);
                Object.assign(window.ballUpgrades, ballUpgrades);
                syncBallsWithCounts(); // Ensure balls array reflects new counts
                updateUI();
            }).catch(error => {
                showToast('Failed to migrate new balls: ' + error.message);
            });
        } else {
            // Mark migration as complete if no update is needed
            localStorage.setItem(migrationKey, 'true');
        }
    }, (error) => {
        showToast('Failed to check game state: ' + error.message);
    });
}

// Canvas click event
canvas.addEventListener('click', (e) => {
    const mouseX = e.clientX - canvas.offsetLeft;
    const mouseY = e.clientY - canvas.offsetTop;
    let isHovering = false;
    bricks.forEach(brick => {
        if (brick.isCursorHovering(mouseX, mouseY)) {
            brick.health -= 1;
            if (brick.health <= 0) {
                bricks = bricks.filter(b => b !== brick);
                gold += 5;
                if (powerUps.length < maxPowerUps) spawnPowerUp();
                updateUI();
            }
            isHovering = true;
        }
    });
    canvas.style.cursor = isHovering ? 'pointer' : 'default';
});

function showInviteSignupPopup(inviterId) {
    // Remove any existing login overlays to prevent stacking
    document.querySelectorAll('.login-overlay').forEach(el => el.remove());

    const overlay = document.createElement("div");
    overlay.className = "login-overlay";

    // Lookup inviter’s username for display
    database.ref("users/" + inviterId + "/gameState/username").once("value")
        .then(snap => {
            const inviterName = snap.val() || "a player";

            overlay.innerHTML = `
                <div class="login-popup">
                    <h2>Sign Up</h2>
                    <p>Signing up with <strong>${inviterName}</strong>’s invitation!</p>
                    <p>You’ll start with <strong>50,000 Gold</strong> 🎁</p>
                    <input type="email" id="invite-email" placeholder="Email">
                    <input type="password" id="invite-password" placeholder="Password">
                    <input type="password" id="invite-confirm" placeholder="Confirm Password">
                    <button id="invite-signup-btn">Sign Up</button>
                </div>
            `;
            document.body.appendChild(overlay);

            const signupBtn = overlay.querySelector("#invite-signup-btn");
            signupBtn.addEventListener("click", () => {
                const email = overlay.querySelector("#invite-email").value.trim();
                const pass = overlay.querySelector("#invite-password").value;
                const confirm = overlay.querySelector("#invite-confirm").value;

                if (!email || !pass) {
                    alert("Please fill in all fields.");
                    return;
                }
                if (pass !== confirm) {
                    alert("Passwords do not match.");
                    return;
                }

                auth.createUserWithEmailAndPassword(email, pass)
                    .then(cred => {
                        const newUserId = cred.user.uid;

                        // Initialize new user with 50k gold + 5 invites
                        database.ref("users/" + newUserId).set({
                            gameState: {
                                gold: 50000,
                                level: 1,
                                rebirthCount: 0,
                                username: email.split("@")[0] // temp username
                            },
                            invitesLeft: 5
                        });

                        // Reward inviter with +150k gold and -1 invite
                        const inviterRef = database.ref("users/" + inviterId);
                        inviterRef.once("value").then(snap => {
                            const inviterData = snap.val();
                            if (!inviterData) return;

                            //const currentGold = inviterData.gameState?.gold || 0;
                            const currentRebirth = inviterData.gameState?.rebirthCount || 0;
                            const invitesLeft = inviterData.invitesLeft || 0;

                            inviterRef.child("gameState").update({
                                rebirthCount: currentRebirth + 1
                            });

                            inviterRef.update({
                                invitesLeft: Math.max(invitesLeft - 1, 0)
                            });
                        });

                        overlay.remove();
                        alert("Account created! Enjoy your 50,000 gold bonus 🎉");
                    })
                    .catch(err => alert(err.message));
            });
        });
}


// Mascot system globals
const MASCOT_VARIANTS = ["cursor", "background", "trail", "effect"]; // can expand later
let mascotsOwned = [];         // hydrated from DB
let selectedMascotId = null;   // currently equipped mascot id
let particles = [];

function updateParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


// Mascots popup logic
const mascotsBtn = document.getElementById("mascots-btn");
const mascotsPopup = document.getElementById("mascotsPopup");
const closeMascotsBtn = document.getElementById("closeMascotsBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

mascotsBtn.addEventListener("click", () => {
    mascotsPopup.style.display = "flex";
});

closeMascotsBtn.addEventListener("click", () => {
    mascotsPopup.style.display = "none";
});

// Tab switching
tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        // Remove active
        tabButtons.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));

        // Add active
        btn.classList.add("active");
        const target = btn.getAttribute("data-tab");
        document.getElementById(`tab-${target}`).classList.add("active");
    });
});

function renderMyMascots() {
    const container = document.getElementById("tab-my-mascots");
    if (!container) return;
    container.innerHTML = "";

    if (!mascotsOwned.length) {
        container.innerHTML = `<p>You don’t own any mascots yet.</p>`;
        return;
    }

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, 1fr)";
    grid.style.gap = "10px";

    mascotsOwned
        .slice() // copy
        .sort((a, b) => b.obtainedAt - a.obtainedAt)
        .forEach(o => {
            const card = document.createElement("div");
            card.style.background = "#eef7ff";
            card.style.border = "2px solid #335";
            card.style.borderRadius = "10px";
            card.style.padding = "10px";
            card.style.textAlign = "center";

            // build button depending on whether this mascot is selected
            const isSelected = selectedMascotId === o.id;
            const buttonHTML = isSelected
                ? `<button class="unequip-mascot-btn" data-id="${o.id}">Unequip</button>`
                : `<button class="equip-mascot-btn" data-id="${o.id}">Equip</button>`;

            card.innerHTML = `
                <img src="${o.image}" alt="${o.baseName}" style="width:80px;height:80px;object-fit:contain;">
                <h4 style="margin:8px 0 4px;">${o.baseName}</h4>
                <div style="font-size:12px;opacity:.85;margin-bottom:6px;">
                    <span style="text-transform:capitalize;">${o.type}</span> 
                    <span style="display:none;">${o.variant}</span>
                </div>
                ${buttonHTML}
            `;

            grid.appendChild(card);
        });

    container.appendChild(grid);

    // attach event listeners after rendering
    container.querySelectorAll(".equip-mascot-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            selectedMascotId = id;
            renderMyMascots(); // re-render to switch to Unequip button
        });
    });

    container.querySelectorAll(".unequip-mascot-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            selectedMascotId = null;
            renderMyMascots(); // re-render to switch back to Equip button
        });
    });
}

function renderMascots() {
    const types = ["normal", "rare", "legendary", "goofy"];
    types.forEach(type => {
        const container = document.getElementById(`tab-${type}`);
        if (!container) return;
        container.innerHTML = "";

        const filtered = mascots.filter(m => (m.type || "").toLowerCase() === type);
        if (filtered.length === 0) {
            container.innerHTML = `<p>No ${type} mascots available.</p>`;
            return;
        }

        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "repeat(3, 1fr)";
        grid.style.gap = "10px";

        filtered.forEach(m => {
            const alreadyHaveAnyVariant = mascotsOwned.some(o => o.baseName === m.name);
            const card = document.createElement("div");
            card.style.background = "#f4eed6";
            card.style.border = "2px solid #444";
            card.style.borderRadius = "10px";
            card.style.padding = "10px";
            card.style.textAlign = "center";
            card.innerHTML = `
        <img src="${m.image}" alt="${m.name}" style="width:80px;height:80px;object-fit:contain;">
        <h4 style="margin:8px 0 4px;">${m.name}</h4>
        <div style="font-size:12px;opacity:.85;margin-bottom:6px;text-transform:capitalize;">Type: ${m.type}</div>
        <p style="margin:0 0 8px;">Cost: ${m.cost} rebirths</p>
        <button class="buy-mascot-btn" data-name="${m.name}" ${isGuest ? "disabled" : ""}>
          ${isGuest ? "Login to Buy" : "Buy"}
        </button>
        ${alreadyHaveAnyVariant ? '<div style="font-size:11px;opacity:.7;margin-top:4px;">You own variant(s)</div>' : ''}
      `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    });
}

// Handle mascot buying
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("buy-mascot-btn")) {
        const mascotName = e.target.getAttribute("data-name");
        const mascot = mascots.find(m => m.name === mascotName);

        if (!mascot) return;

        // Example: check rebirths
        if (rebirthCount >= mascot.cost) {
            rebirthCount -= mascot.cost;
            alert(`🎉 You bought ${mascot.name}!`);
            // TODO: Save to DB / add to user's mascots
        } else {
            alert("❌ Not enough rebirths!");
        }
    }
});

// Call once on load
renderMascots();

// Open/close crate popup
const mascotCratePopup = document.getElementById("mascotCratePopup");
const crateStage = document.getElementById("crateStage");
const crateBox = document.getElementById("crateBox");
const crateLid = document.getElementById("crateLid");
const revealCard = document.getElementById("revealCard");
const revealImg = document.getElementById("revealImg");
const revealName = document.getElementById("revealName");
const revealBadges = document.getElementById("revealBadges");
const equipMascotBtn = document.getElementById("equipMascotBtn");
const closeCrateBtn = document.getElementById("closeCrateBtn");

let _pendingOwnedMascot = null; // set during reveal, finalized on close/equip

function openCrate() {
    mascotCratePopup.style.display = "flex";
    // reset visuals
    revealCard.style.display = "none";
    revealCard.classList.remove("pop-in");
    crateBox.style.display = "block";
    crateBox.style.transform = "translateY(0)";
    crateLid.style.transform = "translateY(0) rotate(0deg)";
    document.getElementById("crateHint").textContent = "Click the crate to open!";
}

function closeCrate() {
    mascotCratePopup.style.display = "none";
    // finalize save if we created an item and haven’t saved yet (we do save immediately already, so this is just safety)
    _pendingOwnedMascot = null;
}

// Clicking the crate → reveal animation
crateStage.addEventListener("click", () => {
    if (revealCard.style.display === "block") return; // already revealed

    // lid pop
    crateLid.style.transform = "translateY(-60px) rotate(-12deg)";
    crateBox.style.transform = "translateY(6px)";

    setTimeout(() => {
        crateBox.style.display = "none";
        revealCard.style.display = "block";
        revealCard.classList.add("pop-in");
    }, 280);
});

closeCrateBtn.addEventListener("click", closeCrate);

// Buy handler
document.addEventListener("click", async (e) => {
    const buyBtn = e.target.closest(".buy-mascot-btn");
    if (!buyBtn) return;

    if (isGuest) {
        showLoginPopupForSave();
        return;
    }

    const mascotName = buyBtn.getAttribute("data-name");
    const base = mascots.find(m => m.name === mascotName);
    if (!base) return;

    if (rebirthCount < base.cost) {
        showToast("❌ Not enough rebirths!");
        return;
    }

    // Spend, update UI immediately
    rebirthCount -= base.cost;
    updateUI();

    // Roll variant & create owned entry
    const variant = MASCOT_VARIANTS[Math.floor(Math.random() * MASCOT_VARIANTS.length)];
    const owned = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        baseName: base.name,
        image: base.image,
        type: (base.type || "").toLowerCase(),
        variant,                // cursor/background/trail/effect
        obtainedAt: Date.now()
    };

    // Persist mascots & rebirthCount atomically-ish (update both fields)
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No user");
        mascotsOwned.push(owned);

        await database.ref(`users/${user.uid}/gameState`).update({
            mascotsOwned,
            rebirthCount
        });

        // Open crate UI with this reward
        _pendingOwnedMascot = owned;
        revealImg.src = owned.image;
        revealName.textContent = owned.baseName;
        revealBadges.innerHTML = `
      <span style="padding:2px 6px;border:1px solid #999;border-radius:999px;margin-right:6px;text-transform:capitalize;">${owned.type}</span>
      <span style="padding:2px 6px;border:1px solid #999;border-radius:999px;text-transform:capitalize;display:none;">${owned.variant}</span>
    `;
        openCrate();

        // refresh UIs
        renderMyMascots();
        renderMascots();
        showToast(`🎉 You bought ${base.name}!`);
    } catch (err) {
        // rollback on failure
        rebirthCount += base.cost;
        mascotsOwned = mascotsOwned.filter(x => x !== owned);
        updateUI();
        showToast("Save failed: " + err.message);
    }
});

// Equip handler
document.addEventListener("click", async (e) => {
    const equipBtn = e.target.closest(".equip-mascot-btn");
    if (!equipBtn) return;
    if (isGuest) {
        showLoginPopupForSave();
        return;
    }

    const id = equipBtn.getAttribute("data-id");
    selectedMascotId = id;

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No user");
        await database.ref(`users/${user.uid}/gameState`).update({ selectedMascotId });
        showToast("Mascot equipped!");
        window.location.reload(); // 🔥 refresh after equip
    } catch (err) {
        showToast("Failed to equip: " + err.message);
    }
});


// Unequip handler
document.addEventListener("click", async (e) => {
    const unequipBtn = e.target.closest(".unequip-mascot-btn");
    if (!unequipBtn) return;
    if (isGuest) {
        showLoginPopupForSave();
        return;
    }

    selectedMascotId = null;

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No user");
        await database.ref(`users/${user.uid}/gameState`).update({ selectedMascotId: null });
        showToast("Mascot unequipped!");
        window.location.reload(); // 🔥 refresh after unequip
    } catch (err) {
        showToast("Failed to unequip: " + err.message);
    }
});



// Also wire the Equip button inside the reveal card
equipMascotBtn.addEventListener("click", async () => {
    if (!_pendingOwnedMascot) return;

    if (isGuest) {
        showLoginPopupForSave();
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No user");
        selectedMascotId = _pendingOwnedMascot.id;
        await database.ref(`users/${user.uid}/gameState`).update({ selectedMascotId });
        renderMyMascots();
        showToast("Mascot equipped!");
        closeCrate();
    } catch (err) {
        showToast("Failed to equip: " + err.message);
    }
});

function updateMascotsPreview() {
    const container = document.getElementById("mascots-preview");
    if (!container) return;

    const equipped = mascotsOwned.find(m => m.id === selectedMascotId);
    if (!equipped) {
        container.innerHTML = `<p style="font-size:12px;color:#444;">No mascots yet</p>`;
        return;
    }
    container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <img src="${equipped.image}" alt="${equipped.baseName}" style="width:36px;height:36px;object-fit:contain;">
      <div>
        <div style="font-weight:600;">${equipped.baseName}</div>
        <div style="font-size:11px;opacity:.8;text-transform:capitalize;display:none;">${equipped.type} • ${equipped.variant}</div>
      </div>
    </div>
  `;
}

function getEquippedMascot() {
    if (!selectedMascotId) return null;
    return mascotsOwned.find(m => m.id === selectedMascotId) || null;
}

function applyMascotEffects() {
    const canvas = document.getElementById('gameCanvas');
    const mascot = getEquippedMascot();
    if (!mascot) return;

    switch (mascot.variant) {
        case "cursor":
            document.body.style.cursor = `url(${mascot.image}), auto`;
            break;
        case "background":
            canvas.style.background = `url(${mascot.image}) center/cover no-repeat fixed`;
            break;
        case "trail":
            cosmetics.activeTrail = mascot.type;
            break;
        case "effect":
            cosmetics.activeEffect = mascot.type;
            break;
        default:
            break;
    }
}

function spawnMascotEffect(x, y, effectType) {
    switch (effectType) {
        case "rare":
            spawnParticles(x, y, "blueviolet");
            break;
        case "legendary":
            spawnParticles(x, y, "gold");
            break;
        case "goofy":
            spawnParticles(x, y, "pink");
            break;
        default:
            spawnParticles(x, y, "white");
            break;
    }
}

function spawnParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        const particle = {
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            color
        };
        particles.push(particle);
    }
}

// ========= TROLLS: UI + backend =========

document.getElementById('trolls-btn')?.addEventListener('click', showTrollsPopup);
startTrollsListener();

// Show feature popup
// Show feature popup
function showTrollsPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
      <div class="login-popup" style="max-width:520px">
        <h2>👹 Trolls</h2>
        <p style="margin-top:6px">Set a background on everyone's canvas for <b>5 seconds</b>.<br><b>Cost: 1 rebirth</b>.</p>

        <div style="margin:10px 0">
          <label style="font-weight:600;">Image/GIF URL</label>
          <input id="troll-url" placeholder="https://... (png, jpg, gif)" style="width:100%;margin-top:6px;padding:6px;border:1px solid #ccc;border-radius:6px;" />
        </div>
      
        <div style="display:flex; flex-direction: column; gap:12px; align-items:center; margin-top:12px;">
          <canvas id="trollPreview" width="320" height="180"
                  style="width:100%;max-width:320px;height:180px;
                         border:2px dashed #555;border-radius:12px;
                         background-size:cover;background-position:center;
                         background-repeat:no-repeat;"></canvas>
          <button id="troll-buy-btn" style="width:100%;padding:10px;border-radius:8px;">Buy (1 rebirth)</button>
        </div>

        <div class="button-group" style="margin-top:16px;display: flex; align-items: center; justify-content:center;">
          <button id="troll-close">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const urlInput = overlay.querySelector('#troll-url');
    const previewCanvas = overlay.querySelector('#trollPreview');
    const buyBtn = overlay.querySelector('#troll-buy-btn');

    // Update buy button state
    const updateBuyBtn = () => {
        buyBtn.disabled = isGuest || rebirthCount < 1;
        buyBtn.title = isGuest ? 'Login required' : (rebirthCount < 1 ? 'You need at least 1 rebirth' : '');
    };
    updateBuyBtn();

    // Auto-preview on input
    urlInput.addEventListener('input', () => {
        const url = (urlInput.value || '').trim();
        previewCanvas.style.backgroundImage = url ? `url('${url}')` : '';
    });

    buyBtn.addEventListener('click', () => purchaseCanvasTroll((urlInput.value || '').trim(), overlay));
    overlay.querySelector('#troll-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}


// Deduct 1 rebirth, push the troll, auto-hide by creator
function purchaseCanvasTroll(url, overlay) {
    if (!url) { showToast('Please paste an image/GIF URL.'); return; }
    if (isGuest || !auth.currentUser) { overlay?.remove(); showLoginPopupForSave(); return; }
    if (rebirthCount < 1) { showToast('You need at least 1 rebirth.'); return; }

    const user = auth.currentUser;
    const trollsRef = database.ref('trolls').push();
    const payload = {
        id: trollsRef.key,
        type: 'canvasBackground',
        url,
        createdBy: user.uid,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        visibility: true
    };


    // Deduct 1 rebirth (local + DB)
    rebirthCount -= 1;
    updateUI();
    database.ref('users/' + user.uid + '/gameState').update({
        rebirthCount: rebirthCount
    });

    trollsRef.set(payload).then(() => {
        overlay?.remove();
        showToast('Troll sent! 👹');

        // After server sets createdAt, schedule auto-hide (creator only)
        database.ref('trolls/' + trollsRef.key + '/createdAt').once('value').then(s => {
            const t = s.val();
            const remaining = 5000 - Math.max(0, Date.now() - (typeof t === 'number' ? t : Date.now()));
            setTimeout(() => {
                // Only the creator flips visibility to false
                database.ref('trolls/' + trollsRef.key + '/visibility').set(false);
            }, Math.max(0, remaining));
        });
    }).catch(err => {
        showToast('Failed to send troll: ' + err.message);
    });
}

// Listen for active trolls and apply to canvas
function startTrollsListener() {
    const ref = database.ref('trolls');

    const handle = (snap) => {
        const t = snap.val();
        if (!t || t.type !== 'canvasBackground' || !t.visibility || !t.url) return;

        const createdAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now();
        const elapsed = Date.now() - createdAt;
        const remaining = 5000 - elapsed;
        if (remaining <= 0) return; // already expired

        applyCanvasBackgroundTroll(t.url, remaining, snap.key, t.createdBy);
    };

    ref.on('child_added', (snap) => handleTroll(snap, true));   // show toast
    ref.on('child_changed', (snap) => handleTroll(snap, false)); // no toast
}

function handleTroll(snap, isNew) {
    const t = snap.val();
    if (!t || t.type !== 'canvasBackground' || !t.visibility || !t.url) return;

    const createdAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now();
    const elapsed = Date.now() - createdAt;
    const remaining = 5000 - elapsed;
    if (remaining <= 0) return;

    applyCanvasBackgroundTroll(t.url, remaining, snap.key, t.createdBy, isNew);
}

function applyCanvasBackgroundTroll(url, durationMs, trollKey, creatorId) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    database.ref('users/' + creatorId + '/gameState/username').once('value').then(snap => {
        const creatorName = snap.val() || "Someone";
        showTrollToast(`👹 You got trolled by ${creatorName}`);
    });

    const prev = {
        bg: canvas.style.backgroundImage,
        size: canvas.style.backgroundSize,
        pos: canvas.style.backgroundPosition,
        rep: canvas.style.backgroundRepeat
    };

    canvas.style.backgroundImage = `url('${url}')`;
    canvas.style.backgroundSize = 'cover';
    canvas.style.backgroundPosition = 'center';
    canvas.style.backgroundRepeat = 'no-repeat';

    if (window.__trollTimer) clearTimeout(window.__trollTimer);

    window.__trollTimer = setTimeout(() => {
        if (auth.currentUser && auth.currentUser.uid === creatorId) {
            database.ref('trolls/' + trollKey + '/visibility').set(false)
                .then(() => location.reload());
        } else {
            canvas.style.backgroundImage = prev.bg;
            canvas.style.backgroundSize = prev.size;
            canvas.style.backgroundPosition = prev.pos;
            canvas.style.backgroundRepeat = prev.rep;
        }
    }, Math.max(0, durationMs));
}



function showTrollToast(message) {
    const container = document.getElementById("troll-toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
    background: rgba(30,30,30,0.95);
    color: #fff;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    animation: fadeIn 0.3s ease, fadeOut 0.5s ease 3.5s forwards;
  `;

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("whatsappInviteIgnored") === "true") {
        showCollapsedWhatsApp();
    }
});

function ignoreWhatsAppInvite() {
    const invite = document.getElementById("whatsappInvite");
    const collapsed = document.getElementById("whatsappCollapsed");
    if (invite && collapsed) {
        invite.style.display = "none";
        collapsed.style.display = "block";
        localStorage.setItem("whatsappInviteIgnored", "true");
    }
}

function restoreWhatsAppInvite() {
    const invite = document.getElementById("whatsappInvite");
    const collapsed = document.getElementById("whatsappCollapsed");
    if (invite && collapsed) {
        invite.style.display = "block";
        collapsed.style.display = "none";
        localStorage.setItem("whatsappInviteIgnored", "false");
    }
}

function showCollapsedWhatsApp() {
    const invite = document.getElementById("whatsappInvite");
    const collapsed = document.getElementById("whatsappCollapsed");
    if (invite && collapsed) {
        invite.style.display = "none";
        collapsed.style.display = "block";
    }
}




















let tempSetSelection = {};

// Initialize tempSetSelection
function initializeTempSetSelection() {
    tempSetSelection = {};
}

// Open the Custom Balls modal
function openCustomBallModal() {
    const modal = document.getElementById('custom-balls-modal');
    if (!modal) {
        showToast('Error: Custom Sets modal not found.');
        return;
    }
    modal.style.display = 'flex';
    renderCustomBallsModal();
}

// Close the Custom Balls modal
function closeCustomBallModal() {
    const modal = document.getElementById('custom-balls-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Render the modal content based on customBought status
function renderCustomBallsModal() {
    const modalContent = document.querySelector('#custom-balls-modal .modal-content');
    if (!modalContent) {
        showToast('Error: Modal content not found.');
        return;
    }

    modalContent.innerHTML = '<p class="modal-text">Loading...</p>';
    const user = auth.currentUser;

    if (!user) {
        modalContent.innerHTML = `
            <span class="close" onclick="closeCustomBallModal()">&times;</span>
            <h2 class="modal-title">Custom Sets</h2>
            <p class="modal-text">Please log in to access Custom Sets.</p>
            <div class="modal-button-group">
                <button class="modal-button primary" onclick="showLoginPopupForSave()">Log In</button>
                <button class="modal-button secondary" onclick="closeCustomBallModal()">Close</button>
            </div>
        `;
        return;
    }

    database.ref(`users/${user.uid}/gameState/customBought`).once('value')
        .then(snapshot => {
            const customBought = snapshot.val() === true;
            modalContent.innerHTML = '';
            if (customBought) {
                renderCustomSetsPurchased(modalContent);
            } else {
                renderCustomSetsLocked(modalContent);
            }
        })
        .catch(error => {
            modalContent.innerHTML = `
                <span class="close" onclick="closeCustomBallModal()">&times;</span>
                <h2 class="modal-title">Custom Sets</h2>
                <p class="modal-text">Error loading Custom Sets: ${error.message}</p>
                <button class="modal-button secondary" onclick="closeCustomBallModal()">Close</button>
            `;
        });
}

// Ball type to color mapping (matching updateUI)
const ballColors = {
    basic: 'gray',
    sniper: 'blue',
    big: 'green',
    explosion: 'orange',
    multiplying: 'purple',
    cannonball: 'darkgray',
    poison: 'lime',
    snowball: 'white'
};

// Render UI for when Custom Sets is unlocked
function renderCustomSetsPurchased(modalContent) {
    modalContent.innerHTML = `
        <span class="close" onclick="closeCustomBallModal()">&times;</span>
        <h2 class="modal-title">Custom Sets</h2>
        <p class="modal-text">Buy a set to add powerful balls</p>
        <div id="custom-sets-container"></div>
    `;

    const setsContainer = document.getElementById('custom-sets-container');
    const setGroups = [
        {
            group: 'Normal',
            sets: [
                { id: 'normal-1', balls: { basic: 100 }, multiplier: 1, description: 'Steady damage for beginners' },
                { id: 'normal-2', balls: { sniper: 50 }, multiplier: 1.5, description: 'Precision hits for accuracy' },
                { id: 'normal-3', balls: { basic: 75, snowball: 25 }, multiplier: 1.2, description: 'Balanced mix for versatility' },
                { id: 'normal-4', balls: { big: 30 }, multiplier: 2, description: 'Fast heavy hits' },
            ]
        },
        {
            group: 'Advanced',
            sets: [
                { id: 'advanced-1', balls: { explosion: 50 }, multiplier: 2, description: 'Area damage for clusters' },
                { id: 'advanced-2', balls: { sniper: 40, poison: 20 }, multiplier: 1.8, description: 'Toxic precision combo' },
                { id: 'advanced-3', balls: { big: 30, cannonball: 30 }, multiplier: 2.2, description: 'Heavy-duty destruction' },
                { id: 'advanced-4', balls: { basic: 100 }, multiplier: 3, description: 'Rapid-fire basic barrage' },
            ]
        },
        {
            group: 'Elite',
            sets: [
                { id: 'elite-1', balls: { multiplying: 25 }, multiplier: 2.5, description: 'Exponential damage growth' },
                { id: 'elite-2', balls: { explosion: 30, snowball: 20 }, multiplier: 2.3, description: 'Freeze and blast combo' },
                { id: 'elite-3', balls: { poison: 40 }, multiplier: 2, description: 'Fast toxic spread' },
                { id: 'elite-4', balls: { big: 20, multiplying: 20 }, multiplier: 2.7, description: 'Heavy multiplying power' },
            ]
        },
        {
            group: 'Powerful',
            sets: [
                { id: 'powerful-1', balls: { multiplying: 15, cannonball: 15 }, multiplier: 3, description: 'Ultimate combo for elites' },
                { id: 'powerful-2', balls: { explosion: 20 }, multiplier: 4, description: 'Rapid explosive chaos' },
                { id: 'powerful-3', balls: { poison: 10, multiplying: 10 }, multiplier: 3.5, description: 'Toxic multiplying mayhem' },
                { id: 'powerful-4', balls: { sniper: 50, big: 25 }, multiplier: 3.2, description: 'Precision and power mix' },
            ]
        }
    ];

    setGroups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = `set-group ${group.group.toLowerCase()}`;
        groupDiv.innerHTML = `
            <h3 class="set-group-title">${group.group}</h3>
            <div class="sets-list" id="sets-list-${group.group.toLowerCase()}"></div>
        `;
        setsContainer.appendChild(groupDiv);

        const setsList = document.getElementById(`sets-list-${group.group.toLowerCase()}`);
        group.sets.forEach(set => {
            const price = calculateSetPrice(set);
            const canAfford = gold >= price;
            const ballEntries = Object.entries(set.balls).slice(0, 2); // Limit to two ball types
            const div = document.createElement('div');
            div.className = `set-option ${group.group.toLowerCase()}`;
            div.id = `set-${set.id}`;
            div.innerHTML = `
                <div class="set-preview-container">
                    ${ballEntries.map(([type, count], index) => `
                        <div class="set-preview">
                            <canvas id="set-${set.id}-${type}-preview" width="60" height="60"></canvas>
                            <div class="multiplier">x${count}${set.multiplier > 1 ? ` <br>${set.multiplier}x speed` : ''}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="set-price">${formatNumber(price)} Gold</div>
                <button class="set-buy-button" onclick="buySet('${set.id}')" ${!canAfford ? 'disabled' : ''}>Buy</button>
                <div class="tooltip">${set.description}</div>
            `;
            setsList.appendChild(div);

            // Draw previews for each ball type
            ballEntries.forEach(([type]) => {
                const canvasId = `set-${set.id}-${type}-preview`;
                const color = ballColors[type] || 'gray';
                const size = type === 'big' ? 12 : 8; // Match updateUI sizes
                drawBallPreview(canvasId, color, size);
            });
        });
    });
}

// Render UI for when Custom Sets is locked
function renderCustomSetsLocked(modalContent) {
    modalContent.innerHTML = `
        <span class="close" onclick="closeCustomBallModal()">&times;</span>
        <h2 class="modal-title">Unlock Custom Sets</h2>
        <p class="modal-text">Unlock powerful sets to enhance your gameplay!</p>
        <ul class="modal-list">
            <li>Choose from Normal to Powerful sets</li>
            <li>Sets let you spawn a variety of balls instantly</li>
            <li>Enables strategic combinations for any playstyle</li>
        </ul>
        <p class="modal-text">Cost: 100 Rebirths (You have: ${formatNumber(rebirthCount)})</p>
        <div class="modal-button-group">
            <button class="modal-button primary" onclick="unlockCustomSets()" ${rebirthCount < 100 ? 'disabled' : ''}>Unlock Now</button>
            <button class="modal-button secondary" onclick="closeCustomBallModal()">Close</button>
        </div>
    `;
}

// Calculate dynamic price for a set
function calculateSetPrice(set) {
    const basePrice = Object.entries(set.balls).reduce((sum, [type, count]) => {
        return sum + (ballPrices[type] || 100) * count;
    }, 0);
    return Math.round(basePrice * set.multiplier * 0.07 * (1 + idleGoldPerSecond / 10));
}

// Buy a specific set
function buySet(setId) {
    const set = getSetById(setId);
    if (!set) {
        showToast('Invalid set selected!');
        return;
    }

    const price = calculateSetPrice(set);
    if (gold < price) {
        showToast('Not enough gold!');
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        showLoginPopupForSave();
        return;
    }

    gold -= price;
    Object.entries(set.balls).forEach(([type, count]) => {
        ballCounts[type] = (ballCounts[type] || 0) + count;
        stats.totalBallsPurchased = (stats.totalBallsPurchased || 0) + count;
    });
    syncBallsWithCounts();
    saveGameState();
    updateUI();
    showToast(`Purchased set: ${Object.entries(set.balls).map(([type, count]) => `${count} ${type.charAt(0).toUpperCase() + type.slice(1)}`).join(' + ')}!`);
    closeCustomBallModal();
}

// Helper to get set by ID
function getSetById(setId) {
    const setGroups = [
        {
            sets: [
                { id: 'normal-1', balls: { basic: 100 }, multiplier: 1, description: 'Steady damage for beginners' },
                { id: 'normal-2', balls: { sniper: 50 }, multiplier: 1.5, description: 'Precision hits for accuracy' },
                { id: 'normal-3', balls: { basic: 75, snowball: 25 }, multiplier: 1.2, description: 'Balanced mix for versatility' },
                { id: 'normal-4', balls: { big: 30 }, multiplier: 2, description: 'Fast heavy hits' },
            ]
        },
        {
            sets: [
                { id: 'advanced-1', balls: { explosion: 50 }, multiplier: 2, description: 'Area damage for clusters' },
                { id: 'advanced-2', balls: { sniper: 40, poison: 20 }, multiplier: 1.8, description: 'Toxic precision combo' },
                { id: 'advanced-3', balls: { big: 30, cannonball: 30 }, multiplier: 2.2, description: 'Heavy-duty destruction' },
                { id: 'advanced-4', balls: { basic: 100 }, multiplier: 3, description: 'Rapid-fire basic barrage' },
            ]
        },
        {
            sets: [
                { id: 'elite-1', balls: { multiplying: 25 }, multiplier: 2.5, description: 'Exponential damage growth' },
                { id: 'elite-2', balls: { explosion: 30, snowball: 20 }, multiplier: 2.3, description: 'Freeze and blast combo' },
                { id: 'elite-3', balls: { poison: 40 }, multiplier: 2, description: 'Fast toxic spread' },
                { id: 'elite-4', balls: { big: 20, multiplying: 20 }, multiplier: 2.7, description: 'Heavy multiplying power' },
            ]
        },
        {
            sets: [
                { id: 'powerful-1', balls: { multiplying: 15, cannonball: 15 }, multiplier: 3, description: 'Ultimate combo for elites' },
                { id: 'powerful-2', balls: { explosion: 20 }, multiplier: 4, description: 'Rapid explosive chaos' },
                { id: 'powerful-3', balls: { poison: 10, multiplying: 10 }, multiplier: 3.5, description: 'Toxic multiplying mayhem' },
                { id: 'powerful-4', balls: { sniper: 50, big: 25 }, multiplier: 3.2, description: 'Precision and power mix' },
            ]
        }
    ];

    return setGroups.flatMap(group => group.sets).find(set => set.id === setId);
}

// Unlock Custom Sets feature
function unlockCustomSets() {
    if (rebirthCount < 100) {
        showToast('You need 100 Rebirths to unlock Custom Sets!');
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        showLoginPopupForSave();
        return;
    }

    // Deduct rebirths
    rebirthCount -= 100;

    // Update Firebase
    database.ref(`users/${user.uid}/gameState`).update({
        customBought: true,
        rebirthCount: rebirthCount
    })
        .then(() => {
            // Save locally and update UI
            saveGameState();
            updateUI();

            showToast('Custom Sets unlocked! Powerful ball combinations now available.');

            // Close and immediately reopen the modal to show the new content
            closeCustomBallModal();
            setTimeout(() => {
                openCustomBallModal();
            }, 300); // Small delay for smooth transition
        })
        .catch(error => {
            showToast('Error unlocking Custom Sets: ' + error.message);
            // Revert the local change on error
            rebirthCount += 100;
            updateUI();
        });
}
