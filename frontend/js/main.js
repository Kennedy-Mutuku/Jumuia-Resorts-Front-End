// js/main.js - Main Firebase Integration for Jumuia Resorts

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the entire application
    initializeApplication();
});

// Main application initialization
async function initializeApplication() {
    try {
        console.log('Initializing Jumuia Resorts Application...');

        // Initialize Firebase FIRST
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

// Initialize Firebase - DISABLED FOR NODE.JS MIGRATION
async function initializeFirebase() {
    console.log('Firebase initialization bypassed. Using Node.js API instead.');
    return;
}

// Load Firebase scripts dynamically (fallback) - DISABLED
async function loadFirebaseScripts() {
    return Promise.resolve();
}

// Initialize UI components - NO CHANGES
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

// Initialize mobile menu functionality - NO CHANGES
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');

    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', function () {
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

// Initialize booking buttons - NO CHANGES
function initializeBookingButtons() {
    document.querySelectorAll('.btn[href*="booking.html"], a[href*="booking.html"]').forEach(button => {
        button.addEventListener('click', function (e) {
            // Check if we're on a resort page or main page
            const href = this.getAttribute('href');

            // Track booking click
            trackBookingClick(this);

            // Allow normal navigation
            return true;
        });
    });
}

// Initialize resort explore buttons - NO CHANGES
function initializeResortButtons() {
    document.querySelectorAll('a[href*="resorts/"]:not([href*="booking"])').forEach(link => {
        link.addEventListener('click', function () {
            // Track resort view locally or to Node API if analytics exist
        });
    });
}

// Initialize smooth scrolling - NO CHANGES
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
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

// Check authentication state - FIXED FOR NODE.JS MIGRATION
function checkAuthState() {
    const session = localStorage.getItem('jumuia_resort_session');

    if (session) {
        try {
            const sessionData = JSON.parse(session);
            const expiryTime = new Date(sessionData.expiryTime);

            if (new Date() < expiryTime) {
                // User is authenticated
                console.log('User session active:', sessionData.email);
                updateAuthUI(sessionData);
                return;
            } else {
                // Session expired
                console.log('User session expired');
                localStorage.removeItem('jumuia_resort_session');
            }
        } catch (error) {
            console.error('Session parsing error:', error);
            localStorage.removeItem('jumuia_resort_session');
        }
    }

    // User is signed out or session invalid
    updateAuthUI(null);

    // Redirect to login if trying to access protected admin pages
    const currentPath = window.location.pathname;
    const protectedPaths = ['/admin/', '/admin/index.html', '/admin/dashboard.html'];
    const isProtectedPath = protectedPaths.some(path => currentPath.includes(path));

    if (isProtectedPath && !currentPath.includes('index.html')) {
        window.location.href = 'index.html';
    }
}

// Update UI based on authentication state - NO CHANGES
function updateAuthUI(user) {
    // Update admin login button text on main pages
    const adminButtons = document.querySelectorAll('a[href*="admin"]');
    adminButtons.forEach(adminButton => {
        if (!adminButton.closest('footer')) {
            // Always lead to the login page for manual authentication as per user request
            adminButton.textContent = 'Log In';
            adminButton.href = 'admin/index.html';

            if (adminButton.classList.contains('btn-primary')) {
                adminButton.classList.replace('btn-primary', 'btn-secondary');
            } else {
                adminButton.classList.add('btn-secondary');
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

// Handle user logout - FIXED FOR NODE.JS MIGRATION
async function handleLogout() {
    try {
        // Clear session
        localStorage.removeItem('jumuia_resort_session');
        sessionStorage.removeItem('jumuia_auth');

        // Clear cookies
        document.cookie = "jumuia_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

        showSuccessToast('Logged out successfully');

        // Redirect
        setTimeout(() => {
            if (window.location.pathname.includes('admin/')) {
                window.location.href = 'index.html';
            } else {
                window.location.reload();
            }
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showErrorToast('Logout failed. Please try again.');
    }
}

// Load offers via API
async function loadOffers() {
    try {
        const offersContainer = document.getElementById('offersContainer');

        if (!offersContainer) return;

        // Show loading state
        offersContainer.innerHTML = '<div class="loading" style="text-align: center; padding: 40px; color: var(--text-light);">Loading offers...</div>';

        const apiUrl = (window.API_CONFIG && window.API_CONFIG.API_URL) ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/offers`);

        let offersList = [];
        if (response.ok) {
            offersList = await response.json();
            offersList = offersList.filter(o => o.status === 'active').slice(0, 10);
            offersList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        if (offersList.length === 0) {
            offersContainer.innerHTML = '<div class="no-offers" style="text-align: center; padding: 40px; color: var(--text-light);">No current offers available. Check back soon!</div>';
            return;
        }

        // Render offers
        let offersHTML = '';
        offersList.forEach(offer => {
            const offerId = offer._id || offer.id;

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

// Setup feedback form - FIXED VERSION
function setupFeedbackForm() {
    const feedbackForm = document.getElementById('feedbackForm');

    if (!feedbackForm) return;

    feedbackForm.addEventListener('submit', async function (e) {
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

            // Submit to Node API
            const apiUrl = (window.API_CONFIG && window.API_CONFIG.API_URL) ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';
            const response = await fetch(`${apiUrl}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackData)
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            // Reset form
            this.reset();

            // Show success
            showSuccessToast('Thank you for your feedback!');

            // Analytics tracked server-side typically


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

// Track booking button clicks - NO CHANGES
function trackBookingClick(button) {
    // Analytics removed here, handled server-side / locally
}

// Share offer function - NO CHANGES
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

// Copy text to clipboard - NO CHANGES
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showSuccessToast('Link copied to clipboard!'))
        .catch(() => showErrorToast('Failed to copy link'));
}

// Utility functions - NO CHANGES
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
    toast.querySelector('.toast-close').addEventListener('click', function () {
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

// Add toast styles to document - NO CHANGES
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

// Firebase Service Helper Functions (for booking pages) - MIGRATED TO NODE API
window.FirebaseBookingService = {
    saveBooking: async function (bookingData) {
        try {
            const apiUrl = (window.API_CONFIG && window.API_CONFIG.API_URL) ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';
            const response = await fetch(`${apiUrl}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            if (!response.ok) {
                throw new Error('Failed to create booking over API');
            }

            const savedBooking = await response.json();

            return {
                success: true,
                bookingId: savedBooking.bookingId || bookingData.bookingId,
                firestoreId: savedBooking._id || savedBooking.id,
                data: savedBooking
            };
        } catch (error) {
            console.error('API save failed', error);
            throw error;
        }
    }
};

window.shareOffer = shareOffer;
window.handleLogout = handleLogout;
window.copyToClipboard = copyToClipboard;
window.initializeFirebase = initializeFirebase;

window.addEventListener('error', function (e) {
    console.error('Global error:', e.error);
});

console.log('Jumuia Resorts Main JS loaded successfully');

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApplication,
        FirebaseBookingService,
        showSuccessToast,
        showErrorToast,
        getResortName
    };
}