/**
 * Bricker - Compatibility Fixes
 * 
 * This file contains fixes for cross-device compatibility issues including:
 * - Device capability detection
 * - CSS transform fallback for low-end devices
 * - Toast system improvements
 * - Modal visibility checks
 * - Cursor trail performance optimization
 */

(function() {
    'use strict';
    
    // ============================================
    // DEVICE CAPABILITY DETECTION
    // ============================================
    const DeviceCapabilities = {
        isLowEnd: false,
        isTouchDevice: false,
        supportsCSSTransform: true,
        maxZIndex: 9999,
        
        init: function() {
            this.detectLowEndDevice();
            this.detectTouchDevice();
            this.testCSSTransform();
            this.applyOptimizations();
        },
        
        detectLowEndDevice: function() {
            // Check for low memory devices
            const isLowMemory = (navigator.deviceMemory !== undefined && navigator.deviceMemory < 4);
            
            // Check for low CPU devices
            const isLowCPU = (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency < 4);
            
            // Check user agent for known low-end devices
            const ua = navigator.userAgent.toLowerCase();
            const isChromebook = ua.includes('chromebook');
            
            this.isLowEnd = isLowMemory || isLowCPU || isChromebook;
            
            if (this.isLowEnd) {
                console.log('Low-end device detected. Applying performance optimizations.');
            }
        },
        
        detectTouchDevice: function() {
            this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        },
        
        testCSSTransform: function() {
            try {
                const testEl = document.createElement('div');
                testEl.style.transform = 'scale(1)';
                document.body.appendChild(testEl);
                const computed = window.getComputedStyle(testEl);
                this.supportsCSSTransform = computed.transform !== 'none';
                document.body.removeChild(testEl);
            } catch (e) {
                this.supportsCSSTransform = false;
            }
        },
        
        applyOptimizations: function() {
            if (this.isLowEnd) {
                // Disable cursor trail on low-end devices
                if (window.cursorTrailEnabled !== false) {
                    window.cursorTrailEnabled = false;
                    console.log('Cursor trail disabled for performance');
                }
                
                // Reduce animation quality
                document.documentElement.classList.add('reduced-animations');
                
                // Lower canvas quality
                if (window.canvas) {
                    window.canvas.imageSmoothingEnabled = false;
                }
            }
            
            if (!this.supportsCSSTransform) {
                // Disable the autoScaleMainContainer transform-based scaling
                console.log('CSS transforms not fully supported. Using fallback layout.');
                document.documentElement.classList.add('no-css-transforms');
            }
        }
    };
    
    // ============================================
    // TOAST SYSTEM IMPROVEMENTS
    // ============================================
    const ToastFix = {
        timeoutId: null,
        queue: [],
        isProcessing: false,
        
        init: function() {
            // Replace the original showToast function
            window.showToast = this.fixedShowToast.bind(this);
        },
        
        fixedShowToast: function(message, duration) {
            duration = duration || 2000;
            
            // Create toast element directly
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = message;
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.zIndex = '10000';
            
            document.body.appendChild(toast);
            
            // Trigger reflow
            toast.offsetHeight;
            
            // Show
            toast.classList.add('show');
            
            // Auto-remove
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }
    };
    
    // ============================================
    // MODAL VISIBILITY FIX
    // ============================================
    const ModalFix = {
        init: function() {
            // Replace element display checks with more robust methods
            this.patchModalFunctions();
        },
        
        patchModalFunctions: function() {
            // Fix showUserDetails donation container toggle
            const originalToggleDonation = window.toggleDonationInput;
            window.toggleDonationInput = function(recipientUid) {
                const container = document.getElementById('donation-container');
                const donateBtn = document.getElementById('donate-btn');
                
                if (container && donateBtn) {
                    // Use computed style for visibility check
                    const display = window.getComputedStyle(container).display;
                    const isHidden = display === 'none';
                    
                    if (isHidden) {
                        container.style.display = 'block';
                        const input = document.getElementById('donation-amount');
                        if (input) {
                            input.focus();
                            input.addEventListener('input', function() {
                                const amount = parseInt(this.value) || 0;
                                donateBtn.textContent = `Donate ${amount}G`;
                                donateBtn.onclick = function() {
                                    showDonationConfirm(recipientUid, amount);
                                };
                            });
                        }
                    } else {
                        const amount = parseInt(document.getElementById('donation-amount').value) || 0;
                        showDonationConfirm(recipientUid, amount);
                    }
                }
            };
        }
    };
    
    // ============================================
    // AUTO SCALE FIX FOR LOW-END DEVICES
    // ============================================
    const AutoScaleFix = {
        originalFunction: null,
        
        init: function() {
            this.originalFunction = window.autoScaleMainContainer;
            
            if (DeviceCapabilities.supportsCSSTransform && !DeviceCapabilities.isLowEnd) {
                // Use original function on capable devices
                window.autoScaleMainContainer = this.originalFunction;
            } else {
                // Use fallback on low-end devices
                window.autoScaleMainContainer = this.fallbackScale.bind(this);
            }
        },
        
        fallbackScale: function() {
            const container = document.querySelector(".main-main-container");
            if (!container) return;
            
            // Instead of CSS transform, adjust font sizes and padding proportionally
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Base dimensions
            const baseWidth = 1500;
            const baseHeight = 750;
            
            // Calculate scale factor
            const scaleX = windowWidth / baseWidth;
            const scaleY = windowHeight / baseHeight;
            const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
            
            // Apply font scaling only (no transform)
            const fontScale = scale < 0.8 ? scale : 1;
            const containerElements = container.querySelectorAll('*');
            
            containerElements.forEach(el => {
                if (el.style && el.style.fontSize) {
                    const currentSize = parseFloat(el.style.fontSize);
                    if (currentSize > 10) {
                        el.style.fontSize = (currentSize * fontScale) + 'px';
                    }
                }
            });
            
            // Just ensure container fits
            container.style.width = '100%';
            container.style.height = 'auto';
            container.style.maxWidth = '100%';
        }
    };
    
    // ============================================
    // INITIALIZATION
    // ============================================
    function initialize() {
        // Run after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', runInit);
        } else {
            setTimeout(runInit, 0);
        }
    }
    
    function runInit() {
        DeviceCapabilities.init();
        ToastFix.init();
        ModalFix.init();
        AutoScaleFix.init();
    }
    
    // Start initialization
    initialize();
    
    // Export for debugging
    window.__brickerCompatFixes = {
        DeviceCapabilities,
        ToastFix,
        ModalFix,
        AutoScaleFix
    };
    
})();

