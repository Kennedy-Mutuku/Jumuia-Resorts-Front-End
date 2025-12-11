// js/main.js - Main Firebase Integration for Jumuia Resorts

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the entire application
    initializeApplication();
});

// Main application initialization
async function initializeApplication() {
    try {
        console.log('Initializing Jumuia Resorts Application...');
        
        // Initialize Firebase
        await initializeFirebase();
        
        // Initialize UI components
        initializeUI();
        
        // Check if user is already logged in (for admin)
        checkAuthState();
        
        // Load offers if on offers page
        if (window.location.pathname.includes('offers.html')) {
            loadOffers();
        }
        
        // Load feedback if on feedback page
        if (window.location.pathname.includes('feedback.html')) {
            setupFeedbackForm();
        }
        
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Application initialization error:', error);
        showErrorToast('Failed to initialize application. Please refresh the page.');
    }
}

// Initialize Firebase with your config
async function initializeFirebase() {
    try {
        // Check if Firebase is already initialized
        if (firebase.apps.length > 0) {
            console.log('Firebase already initialized');
            return;
        }

        // Your Firebase configuration - IMPORTANT: This should be the same as in firebase-config.js
        const firebaseConfig = {
            apiKey: "AIzaSyBn1SicsFR40N8-E_sosNjylvIy9Kt1L7I",
            authDomain: "jumuia-resort-limited.firebaseapp.com",
            projectId: "jumuia-resort-limited",
            storageBucket: "jumuia-resort-limited.firebasestorage.app",
            messagingSenderId: "152170552230",
            appId: "1:152170552230:web:8b67a5dd6b71f59b044d67",
            measurementId: "G-Q7BWHJ9C3M"
        };
        
        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);
        
        // Get Firebase services
        const auth = firebase.auth();
        const db = firebase.firestore();
        const storage = firebase.storage();
        const analytics = firebase.analytics();
        
        // Store services globally
        window.FirebaseServices = {
            app: app,
            auth: auth,
            db: db,
            storage: storage,
            analytics: analytics
        };
        
        // Enable offline persistence (optional)
        db.enablePersistence()
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code == 'unimplemented') {
                    console.warn('The current browser doesn\'t support persistence.');
                }
            });
        
        console.log('Firebase initialized successfully');
        
        // Log analytics event
        analytics.logEvent('page_view', {
            page_title: document.title,
            page_location: window.location.href,
            page_path: window.location.pathname
        });
        
    } catch (error) {
        console.error('Firebase initialization error:', error);
        
        // If Firebase scripts aren't loaded, try to load them dynamically
        if (error.code === 'app/no-app') {
            console.log('Firebase not loaded, attempting to load scripts...');
            await loadFirebaseScripts();
            // Retry initialization
            await initializeFirebase();
        } else {
            throw error;
        }
    }
}

// Load Firebase scripts dynamically (fallback)
async function loadFirebaseScripts() {
    return new Promise((resolve, reject) => {
        const scripts = [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'
        ];
        
        let loadedCount = 0;
        
        scripts.forEach((scriptUrl, index) => {
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            
            script.onload = () => {
                loadedCount++;
                console.log(`Firebase script ${index + 1}/${scripts.length} loaded`);
                if (loadedCount === scripts.length) {
                    console.log('All Firebase scripts loaded successfully');
                    resolve();
                }
            };
            
            script.onerror = (error) => {
                console.error(`Failed to load Firebase script: ${scriptUrl}`, error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    });
}

// Initialize UI components
function initializeUI() {
    // Initialize mobile menu
    initializeMobileMenu();
    
    // Initialize booking buttons
    initializeBookingButtons();
    
    // Initialize resort explore buttons
    initializeResortButtons();
    
    // Initialize smooth scrolling for anchor links
    initializeSmoothScrolling();
    
    // Add CSS for toast notifications if not already present
    addToastStyles();
}

// Initialize mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');
    
    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            // Toggle icon
            const icon = this.querySelector('i');
            if (icon) {
                if (icon.classList.contains('fa-bars')) {
                    icon.classList.replace('fa-bars', 'fa-times');
                } else {
                    icon.classList.replace('fa-times', 'fa-bars');
                }
            }
        });
        
        // Close mobile menu when clicking on a link
        document.querySelectorAll('.main-nav a, .resort-nav a, .hotel-nav a').forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    const icon = mobileMenuBtn.querySelector('i');
                    if (icon && icon.classList.contains('fa-times')) {
                        icon.classList.replace('fa-times', 'fa-bars');
                    }
                }
            });
        });
    }
}

// Initialize booking buttons
function initializeBookingButtons() {
    document.querySelectorAll('.btn[href*="booking.html"], a[href*="booking.html"]').forEach(button => {
        button.addEventListener('click', function(e) {
            // Check if we're on a resort page or main page
            const href = this.getAttribute('href');
            
            // Track booking click
            trackBookingClick(this);
            
            // Allow normal navigation
            return true;
        });
    });
}

// Initialize resort explore buttons
function initializeResortButtons() {
    document.querySelectorAll('a[href*="resorts/"]:not([href*="booking"])').forEach(link => {
        link.addEventListener('click', function() {
            const resortName = this.closest('.resort-card') ? 
                this.closest('.resort-card').querySelector('h3')?.textContent : 
                'Unknown Resort';
            
            // Track resort view
            if (window.FirebaseServices && window.FirebaseServices.analytics) {
                window.FirebaseServices.analytics.logEvent('resort_click', {
                    resort_name: resortName,
                    page_location: this.href,
                    button_text: this.textContent?.trim()
                });
            }
        });
    });
}

// Initialize smooth scrolling
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Calculate header height
                const headerHeight = document.querySelector('header')?.offsetHeight || 90;
                
                window.scrollTo({
                    top: targetElement.offsetTop - headerHeight,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                const mainNav = document.getElementById('mainNav');
                if (mainNav && mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    if (mobileMenuBtn) {
                        const icon = mobileMenuBtn.querySelector('i');
                        if (icon && icon.classList.contains('fa-times')) {
                            icon.classList.replace('fa-times', 'fa-bars');
                        }
                    }
                }
            }
        });
    });
}

// Check authentication state
function checkAuthState() {
    if (!window.FirebaseServices || !window.FirebaseServices.auth) {
        console.log('Firebase auth not available');
        return;
    }
    
    const auth = window.FirebaseServices.auth;
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User signed in:', user.email);
            
            // Update UI for signed-in user
            updateAuthUI(user);
            
            // Check if we're on login page, redirect to admin dashboard
            if (window.location.pathname.includes('admin/login.html')) {
                window.location.href = 'admin/index.html';
            }
        } else {
            // User is signed out
            console.log('User signed out');
            
            // Update UI for signed-out user
            updateAuthUI(null);
            
            // Redirect to login if trying to access protected admin pages
            const currentPath = window.location.pathname;
            const protectedPaths = ['/admin/', '/admin/index.html', '/admin/dashboard.html'];
            const isProtectedPath = protectedPaths.some(path => currentPath.includes(path));
            
            if (isProtectedPath && !currentPath.includes('login.html')) {
                window.location.href = 'admin/login.html';
            }
        }
    });
}

// Update UI based on authentication state
function updateAuthUI(user) {
    // Update admin login button text on main pages
    const adminButtons = document.querySelectorAll('a[href*="admin"]');
    adminButtons.forEach(adminButton => {
        if (!adminButton.closest('footer')) { // Don't modify footer links
            if (user) {
                adminButton.textContent = 'Admin Dashboard';
                adminButton.href = 'admin/index.html';
                if (adminButton.classList.contains('btn-secondary')) {
                    adminButton.classList.replace('btn-secondary', 'btn-primary');
                } else {
                    adminButton.classList.add('btn-primary');
                }
            } else {
                adminButton.textContent = 'Admin Login';
                adminButton.href = 'admin/login.html';
                if (adminButton.classList.contains('btn-primary')) {
                    adminButton.classList.replace('btn-primary', 'btn-secondary');
                } else {
                    adminButton.classList.add('btn-secondary');
                }
            }
        }
    });
    
    // Show/hide logout button if it exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = user ? 'block' : 'none';
        if (user) {
            logoutBtn.onclick = handleLogout;
        }
    }
}

// Handle user logout
async function handleLogout() {
    try {
        if (!window.FirebaseServices || !window.FirebaseServices.auth) {
            throw new Error('Firebase auth not available');
        }
        
        const auth = window.FirebaseServices.auth;
        await auth.signOut();
        showSuccessToast('Logged out successfully');
        
        // Redirect based on current page
        if (window.location.pathname.includes('admin/')) {
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);
        }
    } catch (error) {
        console.error('Logout error:', error);
        showErrorToast('Logout failed. Please try again.');
    }
}

// Load offers from Firestore
async function loadOffers() {
    try {
        if (!window.FirebaseServices || !window.FirebaseServices.db) {
            throw new Error('Firebase not initialized');
        }
        
        const db = window.FirebaseServices.db;
        const offersContainer = document.getElementById('offersContainer');
        
        if (!offersContainer) return;
        
        // Show loading state
        offersContainer.innerHTML = '<div class="loading" style="text-align: center; padding: 40px; color: var(--text-light);">Loading offers...</div>';
        
        // Get offers from Firestore
        const offersSnapshot = await db.collection('offers')
            .where('active', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (offersSnapshot.empty) {
            offersContainer.innerHTML = '<div class="no-offers" style="text-align: center; padding: 40px; color: var(--text-light);">No current offers available. Check back soon!</div>';
            return;
        }
        
        // Render offers
        let offersHTML = '';
        offersSnapshot.forEach(doc => {
            const offer = doc.data();
            const offerId = doc.id;
            
            offersHTML += `
                <div class="offer-card" style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div class="offer-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--primary-green);">${offer.title || 'Special Offer'}</h3>
                        <span class="offer-badge" style="background: var(--primary-orange); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                            ${offer.type || 'Offer'}
                        </span>
                    </div>
                    <div class="offer-content">
                        <p style="color: var(--text-light); margin-bottom: 15px;">${offer.description || ''}</p>
                        <div class="offer-details" style="display: flex; gap: 20px; margin-bottom: 15px; color: var(--text-light); font-size: 0.9rem;">
                            ${offer.validUntil ? `<span><i class="fas fa-calendar"></i> Valid until: ${formatDate(offer.validUntil)}</span>` : ''}
                            ${offer.resort ? `<span><i class="fas fa-hotel"></i> Resort: ${getResortName(offer.resort)}</span>` : ''}
                        </div>
                        <div class="offer-actions" style="display: flex; gap: 10px;">
                            <a href="${offer.bookingLink || 'booking.html'}" class="btn btn-primary" style="padding: 8px 20px;">Book Now</a>
                            <button class="btn btn-secondary" onclick="shareOffer('${offer.title || 'Jumuia Resorts Offer'}', '${window.location.origin}')" style="padding: 8px 20px;">
                                <i class="fas fa-share"></i> Share
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        offersContainer.innerHTML = offersHTML;
        
    } catch (error) {
        console.error('Error loading offers:', error);
        const offersContainer = document.getElementById('offersContainer');
        if (offersContainer) {
            offersContainer.innerHTML = '<div class="error" style="text-align: center; padding: 40px; color: #dc3545;">Failed to load offers. Please try again later.</div>';
        }
    }
}

// Setup feedback form
function setupFeedbackForm() {
    const feedbackForm = document.getElementById('feedbackForm');
    
    if (!feedbackForm) return;
    
    feedbackForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const feedbackData = {
            name: formData.get('name'),
            email: formData.get('email'),
            resort: formData.get('resort'),
            rating: parseInt(formData.get('rating')) || 5,
            message: formData.get('message'),
            createdAt: new Date().toISOString(),
            status: 'pending',
            type: 'feedback'
        };
        
        // Validate
        if (!feedbackData.name || !feedbackData.message || !feedbackData.resort) {
            showErrorToast('Please fill in all required fields');
            return;
        }
        
        try {
            // Show loading
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitBtn.disabled = true;
            
            // Save to Firestore
            const db = window.FirebaseServices.db;
            await db.collection('feedback').add(feedbackData);
            
            // Reset form
            this.reset();
            
            // Show success
            showSuccessToast('Thank you for your feedback!');
            
            // Track analytics
            if (window.FirebaseServices.analytics) {
                window.FirebaseServices.analytics.logEvent('feedback_submitted', {
                    resort: feedbackData.resort,
                    rating: feedbackData.rating
                });
            }
            
        } catch (error) {
            console.error('Error submitting feedback:', error);
            showErrorToast('Failed to submit feedback. Please try again.');
        } finally {
            // Reset button
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    });
}

// Track booking button clicks
function trackBookingClick(button) {
    // Determine resort from button context
    let resort = 'general';
    const resortCard = button.closest('.resort-card');
    if (resortCard) {
        const resortTitle = resortCard.querySelector('h3');
        if (resortTitle) {
            const title = resortTitle.textContent;
            if (title.includes('Limuru')) resort = 'limuru';
            else if (title.includes('Kanamai')) resort = 'kanamai';
            else if (title.includes('Kisumu')) resort = 'kisumu';
        }
    }
    
    // Also check from URL
    const currentPath = window.location.pathname;
    if (currentPath.includes('/resorts/')) {
        if (currentPath.includes('/limuru/')) resort = 'limuru';
        else if (currentPath.includes('/kanamai/')) resort = 'kanamai';
        else if (currentPath.includes('/kisumu/')) resort = 'kisumu';
    }
    
    // Track in analytics
    if (window.FirebaseServices && window.FirebaseServices.analytics) {
        window.FirebaseServices.analytics.logEvent('booking_click', {
            resort: resort,
            button_text: button.textContent?.trim() || 'Book Now',
            page_location: window.location.pathname,
            timestamp: new Date().toISOString()
        });
    }
}

// Share offer function
function shareOffer(title, url) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: `Check out this special offer from Jumuia Resorts!`,
            url: url
        }).then(() => {
            console.log('Offer shared successfully');
        }).catch(err => {
            console.error('Error sharing:', err);
            copyToClipboard(`${title} - ${url}`);
        });
    } else {
        // Fallback: copy to clipboard
        copyToClipboard(`${title} - ${url}`);
    }
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showSuccessToast('Link copied to clipboard!'))
        .catch(() => showErrorToast('Failed to copy link'));
}

// Utility functions
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-KE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function getResortName(resortCode) {
    const resorts = {
        'limuru': 'Limuru Conference & Country Home',
        'kanamai': 'Kanamai Beach Resort',
        'kisumu': 'Kisumu Hotel',
        'all': 'All Resorts'
    };
    return resorts[resortCode] || resortCode;
}

function showSuccessToast(message) {
    showToast(message, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    // Add click handler for close button
    toast.querySelector('.toast-close').addEventListener('click', function() {
        toast.remove();
    });
    
    // Add to document
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Add toast styles to document
function addToastStyles() {
    if (document.querySelector('#toast-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'toast-styles';
    styles.textContent = `
        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            max-width: 400px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            border-left: 4px solid #006994;
        }
        .toast-success {
            border-left-color: #28a745;
        }
        .toast-error {
            border-left-color: #dc3545;
        }
        .toast-content {
            display: flex;
            align-items: center;
            gap: 10px;
            flex: 1;
        }
        .toast-content i {
            font-size: 1.2rem;
        }
        .toast-success .toast-content i {
            color: #28a745;
        }
        .toast-error .toast-content i {
            color: #dc3545;
        }
        .toast-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
            padding: 0 0 0 15px;
            line-height: 1;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @media (max-width: 576px) {
            .toast {
                min-width: auto;
                width: calc(100% - 40px);
                left: 20px;
                right: 20px;
            }
        }
    `;
    document.head.appendChild(styles);
}

// Firebase Service Helper Functions (for booking pages)
window.FirebaseBookingService = {
    saveBooking: async function(bookingData) {
        try {
            if (!window.FirebaseServices || !window.FirebaseServices.db) {
                throw new Error('Firebase not initialized');
            }
            
            const db = window.FirebaseServices.db;
            
            // Generate booking ID
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const resortCode = bookingData.resort ? bookingData.resort.toUpperCase().slice(0, 3) : 'GEN';
            bookingData.bookingId = `JUM-${resortCode}-${timestamp}${random}`;
            
            // Add metadata
            bookingData.createdAt = new Date().toISOString();
            bookingData.status = 'pending';
            bookingData.paymentStatus = 'awaiting_payment';
            
            // Save to Firestore
            const docRef = await db.collection('bookings').add(bookingData);
            
            console.log('Booking saved:', docRef.id);
            
            // Track analytics
            if (window.FirebaseServices.analytics) {
                window.FirebaseServices.analytics.logEvent('booking_created', {
                    booking_id: bookingData.bookingId,
                    resort: bookingData.resort,
                    room_type: bookingData.roomType,
                    amount: bookingData.totalAmount || 0,
                    nights: bookingData.nights || 1
                });
            }
            
            return {
                success: true,
                bookingId: bookingData.bookingId,
                firestoreId: docRef.id
            };
            
        } catch (error) {
            console.error('Error saving booking:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    checkBookingAvailability: async function(resort, checkIn, checkOut, roomType) {
        try {
            if (!window.FirebaseServices || !window.FirebaseServices.db) {
                throw new Error('Firebase not initialized');
            }
            
            const db = window.FirebaseServices.db;
            
            // Convert dates to strings for Firestore query
            const checkInStr = typeof checkIn === 'string' ? checkIn : checkIn.toISOString().split('T')[0];
            const checkOutStr = typeof checkOut === 'string' ? checkOut : checkOut.toISOString().split('T')[0];
            
            // Query for conflicting bookings
            const bookingsSnapshot = await db.collection('bookings')
                .where('resort', '==', resort)
                .where('status', 'in', ['confirmed', 'pending'])
                .where('roomType', '==', roomType)
                .get();
            
            // Filter bookings that conflict with our dates
            const conflictingBookings = [];
            bookingsSnapshot.forEach(doc => {
                const booking = doc.data();
                const bookingCheckIn = booking.checkIn;
                const bookingCheckOut = booking.checkOut;
                
                // Check for date overlap
                if (!(checkOutStr <= bookingCheckIn || checkInStr >= bookingCheckOut)) {
                    conflictingBookings.push(booking);
                }
            });
            
            // For demo: assume max 5 rooms of each type
            const maxRooms = 5;
            const available = conflictingBookings.length < maxRooms;
            
            return {
                available: available,
                conflictingBookings: conflictingBookings.length,
                maxRooms: maxRooms,
                availableRooms: maxRooms - conflictingBookings.length
            };
            
        } catch (error) {
            console.error('Availability check error:', error);
            return {
                available: false,
                error: error.message
            };
        }
    },
    
    getBooking: async function(bookingId) {
        try {
            if (!window.FirebaseServices || !window.FirebaseServices.db) {
                throw new Error('Firebase not initialized');
            }
            
            const db = window.FirebaseServices.db;
            
            // Query by booking ID
            const querySnapshot = await db.collection('bookings')
                .where('bookingId', '==', bookingId)
                .limit(1)
                .get();
            
            if (querySnapshot.empty) {
                return { success: false, error: 'Booking not found' };
            }
            
            const doc = querySnapshot.docs[0];
            return {
                success: true,
                booking: { id: doc.id, ...doc.data() }
            };
            
        } catch (error) {
            console.error('Error getting booking:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

// Expose necessary functions globally
window.shareOffer = shareOffer;
window.handleLogout = handleLogout;
window.copyToClipboard = copyToClipboard;

// Add a global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

// Make sure Firebase is initialized on all pages
console.log('Jumuia Resorts Main JS loaded successfully');

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApplication,
        FirebaseBookingService,
        showSuccessToast,
        showErrorToast
    };
}