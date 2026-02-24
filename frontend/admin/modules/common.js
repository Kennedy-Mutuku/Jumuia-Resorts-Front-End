// admin/modules/common.js
// Common utilities and Firebase configuration for all modules

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBn1SicsFR40N8-E_sosNjylvIy9Kt1L7I",
    authDomain: "jumuia-resort-limited.firebaseapp.com",
    projectId: "jumuia-resort-limited",
    storageBucket: "jumuia-resort-limited.firebasestorage.app",
    messagingSenderId: "152170552230",
    appId: "1:152170552230:web:8b67a5dd6b71f59b044d67",
    measurementId: "G-Q7BWHJ9C3M"
};

// Initialize Firebase if not already initialized
let app, auth, db, storage;
try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Current user data
let currentUser = null;
let currentProperty = 'all';

// Collection names
const COLLECTIONS = {
    OFFERS: 'offers',
    BOOKINGS: 'bookings',
    MESSAGES: 'messages',
    FEEDBACK: 'feedback',
    ADMINS: 'admins',
    ACTIVITIES: 'activities',
    PROPERTIES: 'properties',
    ROOMS: 'rooms',
    SETTINGS: 'settings'
};

// Initialize current user data
function initCurrentUser() {
    try {
        const userData = JSON.parse(localStorage.getItem('jumuiaAdminUser'));
        if (userData) {
            currentUser = userData;
            currentProperty = userData.property === 'all' ? 'all' : userData.property;
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error initializing current user:", error);
        return false;
    }
}

// Check user permissions
function checkPermission(requiredPermission) {
    if (!currentUser || !currentUser.permissions) return false;
    
    const permissions = currentUser.permissions;
    
    // Check based on permission type
    switch(requiredPermission) {
        case 'viewAll':
            return permissions.canViewAll;
        case 'editAll':
            return permissions.canEditAll;
        case 'delete':
            return permissions.canDelete;
        case 'manageUsers':
            return permissions.canManageUsers;
        case 'manageSettings':
            return permissions.canManageSettings;
        default:
            return false;
    }
}

// Check if user can access property
function canAccessProperty(property) {
    if (!currentUser || !currentUser.permissions) return false;
    
    if (currentUser.permissions.properties.includes('all')) {
        return true;
    }
    
    return currentUser.permissions.properties.includes(property);
}

// Format currency
function formatCurrency(amount) {
    return `KES ${amount?.toLocaleString('en-KE') || '0'}`;
}

// Format date
function formatDate(date, includeTime = false) {
    if (!date) return 'N/A';
    
    try {
        let dateObj;
        
        // Handle Firestore timestamp
        if (date.toDate) {
            dateObj = date.toDate();
        } else if (typeof date === 'string') {
            dateObj = new Date(date);
        } else if (date.seconds) {
            dateObj = new Date(date.seconds * 1000);
        } else {
            dateObj = new Date(date);
        }
        
        if (includeTime) {
            return dateObj.toLocaleString('en-KE', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return dateObj.toLocaleDateString('en-KE', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    } catch (error) {
        console.error("Date formatting error:", error);
        return 'Invalid Date';
    }
}

// Get time ago
function getTimeAgo(date) {
    if (!date) return 'Just now';
    
    let dateObj;
    if (date.toDate) {
        dateObj = date.toDate();
    } else if (date.seconds) {
        dateObj = new Date(date.seconds * 1000);
    } else {
        dateObj = new Date(date);
    }
    
    const seconds = Math.floor((new Date() - dateObj) / 1000);
    let interval = seconds / 31536000;
    
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#cce5ff'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#004085'};
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    // Add close button styles
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    return notification;
}

// Show loading overlay
function showLoading(show = true, message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
            
            // Add styles
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9998;
            `;
            
            const loadingContent = overlay.querySelector('.loading-content');
            loadingContent.style.cssText = `
                background: white;
                padding: 40px;
                border-radius: var(--radius);
                text-align: center;
                box-shadow: var(--shadow);
            `;
            
            const spinner = overlay.querySelector('.loading-spinner');
            spinner.style.cssText = `
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid var(--primary-orange);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            `;
            
            // Add spin animation
            if (!document.querySelector('#loadingStyles')) {
                const spinStyle = document.createElement('style');
                spinStyle.id = 'loadingStyles';
                spinStyle.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(spinStyle);
            }
            
            document.body.appendChild(overlay);
        }
    } else {
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }
}

// Confirm dialog
function showConfirm(message, onConfirm, onCancel = null) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-content">
            <div class="confirm-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="confirm-message">${message}</div>
            <div class="confirm-buttons">
                <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
                <button class="btn btn-danger" id="confirmOk">Confirm</button>
            </div>
        </div>
    `;
    
    // Add styles
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9997;
        animation: fadeIn 0.3s ease;
    `;
    
    const content = dialog.querySelector('.confirm-content');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: var(--radius);
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: var(--shadow);
    `;
    
    const icon = dialog.querySelector('.confirm-icon');
    icon.style.cssText = `
        font-size: 3rem;
        color: var(--primary-orange);
        margin-bottom: 20px;
    `;
    
    const buttons = dialog.querySelector('.confirm-buttons');
    buttons.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 25px;
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners
    dialog.querySelector('#confirmOk').addEventListener('click', () => {
        if (dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        if (onConfirm) onConfirm();
    });
    
    dialog.querySelector('#confirmCancel').addEventListener('click', () => {
        if (dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
        if (onCancel) onCancel();
    });
    
    // Close on background click
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
            if (onCancel) onCancel();
        }
    });
    
    return dialog;
}

// Export to CSV
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    try {
        // Get headers from first object
        const headers = Object.keys(data[0]);
        
        // Convert data to CSV rows
        const csvRows = [
            headers.join(','), // Header row
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Handle values that might contain commas or quotes
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ];
        
        const csvContent = csvRows.join('\n');
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        showNotification('Data exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export data', 'error');
    }
}

// Pagination helper
function createPagination(totalItems, itemsPerPage, currentPage, onPageChange) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) return '';
    
    let paginationHTML = `
        <div class="pagination">
            <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    ${currentPage === 1 ? 'disabled' : ''}
                    onclick="${onPageChange}(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    // Calculate page range to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Adjust if we're near the beginning
    if (currentPage <= 3) {
        endPage = Math.min(totalPages, 5);
    }
    
    // Adjust if we're near the end
    if (currentPage >= totalPages - 2) {
        startPage = Math.max(1, totalPages - 4);
    }
    
    // Show first page and ellipsis if needed
    if (startPage > 1) {
        paginationHTML += `
            <button class="page-btn" onclick="${onPageChange}(1)">1</button>
            ${startPage > 2 ? '<span class="page-ellipsis">...</span>' : ''}
        `;
    }
    
    // Show page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="${onPageChange}(${i})">
                ${i}
            </button>
        `;
    }
    
    // Show last page and ellipsis if needed
    if (endPage < totalPages) {
        paginationHTML += `
            ${endPage < totalPages - 1 ? '<span class="page-ellipsis">...</span>' : ''}
            <button class="page-btn" onclick="${onPageChange}(${totalPages})">
                ${totalPages}
            </button>
        `;
    }
    
    paginationHTML += `
            <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                    ${currentPage === totalPages ? 'disabled' : ''}
                    onclick="${onPageChange}(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    return paginationHTML;
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Filter data based on criteria
function filterData(data, filters) {
    return data.filter(item => {
        for (const key in filters) {
            if (filters[key]) {
                const filterValue = filters[key].toString().toLowerCase();
                const itemValue = item[key]?.toString().toLowerCase();
                
                if (!itemValue || !itemValue.includes(filterValue)) {
                    return false;
                }
            }
        }
        return true;
    });
}

// Sort data
function sortData(data, field, direction = 'asc') {
    return [...data].sort((a, b) => {
        let aValue = a[field];
        let bValue = b[field];
        
        // Handle dates
        if (field.includes('Date') || field.includes('date')) {
            aValue = aValue?.toDate ? aValue.toDate().getTime() : new Date(aValue).getTime();
            bValue = bValue?.toDate ? bValue.toDate().getTime() : new Date(bValue).getTime();
        }
        
        // Handle numbers
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // Handle strings
        aValue = aValue?.toString() || '';
        bValue = bValue?.toString() || '';
        
        return direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
    });
}

// Property name mapping
const PROPERTY_NAMES = {
    'limuru': 'Limuru Country Home',
    'kanamai': 'Kanamai Beach Resort',
    'kisumu': 'Kisumu Hotel'
};

// Get property icon
function getPropertyIcon(property) {
    const icons = {
        'limuru': 'fas fa-mountain',
        'kanamai': 'fas fa-umbrella-beach',
        'kisumu': 'fas fa-hotel'
    };
    return icons[property] || 'fas fa-hotel';
}

// Get property color
function getPropertyColor(property) {
    const colors = {
        'limuru': '#1a5c1a',
        'kanamai': '#007c00',
        'kisumu': '#0047ab'
    };
    return colors[property] || '#22440f';
}

// Initialize common module
document.addEventListener('DOMContentLoaded', function() {
    if (initCurrentUser()) {
        console.log('Current user initialized:', currentUser);
    } else {
        console.warn('No user data found in localStorage');
    }
});

// Export utilities
window.CommonUtils = {
    firebaseConfig,
    app,
    auth,
    db,
    storage,
    currentUser,
    currentProperty,
    COLLECTIONS,
    initCurrentUser,
    checkPermission,
    canAccessProperty,
    formatCurrency,
    formatDate,
    getTimeAgo,
    showNotification,
    showLoading,
    showConfirm,
    exportToCSV,
    createPagination,
    debounce,
    filterData,
    sortData,
    PROPERTY_NAMES,
    getPropertyIcon,
    getPropertyColor
};