// admin/modules/bookings.js
// Bookings Management Module

let bookingsData = [];
let filteredBookings = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortField = 'createdAt';
let sortDirection = 'desc';

// Booking statuses
const BOOKING_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked-in',
    CHECKED_OUT: 'checked-out',
    CANCELLED: 'cancelled'
};

// Booking status colors
const STATUS_COLORS = {
    'pending': '#ffc107',
    'confirmed': '#17a2b8',
    'checked-in': '#28a745',
    'checked-out': '#6c757d',
    'cancelled': '#dc3545'
};

// Initialize bookings module
function initBookingsModule() {
    console.log('Initializing Bookings module...');
    
    // Initialize common utilities
    if (!window.CommonUtils || !window.CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        return;
    }
    
    // Load bookings data
    loadBookings();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup real-time listener
    setupRealtimeListener();
}

// Load bookings from Firebase
async function loadBookings() {
    try {
        CommonUtils.showLoading(true, 'Loading bookings...');
        
        const { db, COLLECTIONS, currentUser, currentProperty } = CommonUtils;
        
        // Build query based on user permissions
        let bookingsQuery;
        
        if (currentUser.permissions.properties.includes('all')) {
            bookingsQuery = firebase.firestore()
                .collection(COLLECTIONS.BOOKINGS)
                .orderBy(sortField, sortDirection);
        } else {
            bookingsQuery = firebase.firestore()
                .collection(COLLECTIONS.BOOKINGS)
                .where('property', '==', currentProperty)
                .orderBy(sortField, sortDirection);
        }
        
        const snapshot = await bookingsQuery.get();
        bookingsData = [];
        
        snapshot.forEach(doc => {
            bookingsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Apply filters
        applyFilters();
        
        // Render bookings
        renderBookings();
        
        // Update stats
        updateStats();
        
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        CommonUtils.showNotification('Failed to load bookings', 'error');
        CommonUtils.showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Filter inputs
    const filterInputs = ['propertyFilter', 'statusFilter', 'searchInput'];
    filterInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debounce(applyFilters, 300));
        }
    });
    
    // Date filters
    const dateFilters = ['dateFrom', 'dateTo'];
    dateFilters.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });
    
    // Quick actions
    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            handleQuickAction(action);
        });
    });
    
    // Export button
    const exportBtn = document.getElementById('exportBookingsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportBookings);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBookingsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshBookings);
    }
    
    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const field = this.dataset.field;
            if (sortField === field) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortField = field;
                sortDirection = 'desc';
            }
            
            // Update sort indicators
            updateSortIndicators();
            
            // Reload bookings with new sort
            loadBookings();
        });
    });
}

// Setup real-time listener
function setupRealtimeListener() {
    const { db, COLLECTIONS, currentUser, currentProperty } = CommonUtils;
    
    let bookingsQuery;
    
    if (currentUser.permissions.properties.includes('all')) {
        bookingsQuery = firebase.firestore()
            .collection(COLLECTIONS.BOOKINGS)
            .orderBy('createdAt', 'desc');
    } else {
        bookingsQuery = firebase.firestore()
            .collection(COLLECTIONS.BOOKINGS)
            .where('property', '==', currentProperty)
            .orderBy('createdAt', 'desc');
    }
    
    bookingsQuery.onSnapshot((snapshot) => {
        bookingsData = [];
        snapshot.forEach(doc => {
            bookingsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        applyFilters();
        renderBookings();
        updateStats();
        
        // Update dashboard badge
        updatePendingBookingsCount();
        
    }, (error) => {
        console.error('Realtime listener error:', error);
    });
}

// Apply filters
function applyFilters() {
    const propertyFilter = document.getElementById('propertyFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const searchInput = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('dateFrom')?.value;
    const dateTo = document.getElementById('dateTo')?.value;
    
    filteredBookings = bookingsData.filter(booking => {
        // Property filter
        if (propertyFilter !== 'all' && booking.property !== propertyFilter) {
            return false;
        }
        
        // Status filter
        if (statusFilter !== 'all' && booking.status !== statusFilter) {
            return false;
        }
        
        // Search filter
        if (searchInput) {
            const searchStr = searchInput.toLowerCase();
            const bookingText = [
                booking.bookingId,
                booking.firstName,
                booking.lastName,
                booking.email,
                booking.phone,
                booking.property
            ].join(' ').toLowerCase();
            
            if (!bookingText.includes(searchStr)) {
                return false;
            }
        }
        
        // Date range filter (check-in date)
        if (dateFrom && booking.checkIn) {
            const checkInDate = new Date(booking.checkIn);
            const filterFrom = new Date(dateFrom);
            
            if (checkInDate < filterFrom) {
                return false;
            }
        }
        
        if (dateTo && booking.checkIn) {
            const checkInDate = new Date(booking.checkIn);
            const filterTo = new Date(dateTo);
            
            if (checkInDate > filterTo) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort filtered bookings
    filteredBookings = CommonUtils.sortData(filteredBookings, sortField, sortDirection);
    
    // Reset to first page
    currentPage = 1;
    
    // Update display
    updatePagination();
    renderBookingsTable();
}

// Render bookings
function renderBookings() {
    renderBookingsTable();
    updatePagination();
}

// Render bookings table
function renderBookingsTable() {
    const tableBody = document.getElementById('bookingsTableBody');
    if (!tableBody) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBookings = filteredBookings.slice(startIndex, endIndex);
    
    if (paginatedBookings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h4>No bookings found</h4>
                    <p>Try adjusting your filters</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    paginatedBookings.forEach((booking, index) => {
        const statusColor = STATUS_COLORS[booking.status] || '#6c757d';
        
        html += `
            <tr>
                <td>${startIndex + index + 1}</td>
                <td>
                    <div class="booking-id">
                        <strong>${booking.bookingId || 'N/A'}</strong>
                        <small class="text-muted">${CommonUtils.formatDate(booking.createdAt)}</small>
                    </div>
                </td>
                <td>
                    <div class="guest-info">
                        <div class="guest-name">${booking.firstName} ${booking.lastName}</div>
                        <div class="guest-contact">
                            <small>${booking.email}</small>
                            <br>
                            <small>${booking.phone}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="property-badge" style="background: ${CommonUtils.getPropertyColor(booking.property)}">
                        <i class="${CommonUtils.getPropertyIcon(booking.property)}"></i>
                        ${CommonUtils.PROPERTY_NAMES[booking.property] || booking.property}
                    </span>
                </td>
                <td>
                    <div class="date-range">
                        <div><strong>Check-in:</strong> ${CommonUtils.formatDate(booking.checkIn)}</div>
                        <div><strong>Check-out:</strong> ${CommonUtils.formatDate(booking.checkOut)}</div>
                    </div>
                </td>
                <td>
                    <div class="room-info">
                        <div>${booking.roomType || 'N/A'}</div>
                        <small>${booking.rooms || 1} room(s), ${booking.adults || 1} adult(s)</small>
                    </div>
                </td>
                <td>
                    <div class="price-display">
                        <div class="total-amount">${CommonUtils.formatCurrency(booking.totalAmount)}</div>
                        ${booking.paymentStatus ? 
                            `<small class="payment-status ${booking.paymentStatus}">${booking.paymentStatus}</small>` : ''
                        }
                    </div>
                </td>
                <td>
                    <span class="status-badge" style="background: ${statusColor}">
                        ${booking.status?.toUpperCase() || 'PENDING'}
                    </span>
                </td>
                <td>
                    ${booking.specialRequests ? 
                        `<span class="requests-indicator" title="${booking.specialRequests}">
                            <i class="fas fa-comment"></i>
                        </span>` : ''
                    }
                </td>
                <td>
                    <div class="booking-actions">
                        <button class="action-btn btn-view" onclick="viewBooking('${booking.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${booking.status === BOOKING_STATUS.PENDING ? 
                            `<button class="action-btn btn-confirm" onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CONFIRMED}')" title="Confirm">
                                <i class="fas fa-check"></i>
                            </button>` : ''
                        }
                        ${booking.status === BOOKING_STATUS.CONFIRMED ? 
                            `<button class="action-btn btn-checkin" onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CHECKED_IN}')" title="Check-in">
                                <i class="fas fa-sign-in-alt"></i>
                            </button>` : ''
                        }
                        ${booking.status === BOOKING_STATUS.CHECKED_IN ? 
                            `<button class="action-btn btn-checkout" onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CHECKED_OUT}')" title="Check-out">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>` : ''
                        }
                        ${booking.status === BOOKING_STATUS.PENDING ? 
                            `<button class="action-btn btn-cancel" onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CANCELLED}')" title="Cancel">
                                <i class="fas fa-times"></i>
                            </button>` : ''
                        }
                        ${CommonUtils.checkPermission('delete') ? 
                            `<button class="action-btn btn-delete" onclick="deleteBooking('${booking.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>` : ''
                        }
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Update pagination
function updatePagination() {
    const paginationContainer = document.getElementById('bookingsPagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    paginationContainer.innerHTML = CommonUtils.createPagination(
        filteredBookings.length,
        itemsPerPage,
        currentPage,
        'goToPage'
    );
}

// Go to page
function goToPage(page) {
    currentPage = page;
    renderBookingsTable();
}

// Update stats
function updateStats() {
    const stats = {
        total: bookingsData.length,
        pending: 0,
        confirmed: 0,
        checkedIn: 0,
        todayCheckIns: 0,
        todayCheckOuts: 0,
        revenue: 0
    };
    
    const today = new Date().toISOString().split('T')[0];
    
    bookingsData.forEach(booking => {
        // Count by status
        if (booking.status === BOOKING_STATUS.PENDING) stats.pending++;
        if (booking.status === BOOKING_STATUS.CONFIRMED) stats.confirmed++;
        if (booking.status === BOOKING_STATUS.CHECKED_IN) stats.checkedIn++;
        
        // Today's check-ins/outs
        if (booking.checkIn === today && booking.status === BOOKING_STATUS.CHECKED_IN) {
            stats.todayCheckIns++;
        }
        if (booking.checkOut === today && booking.status === BOOKING_STATUS.CHECKED_OUT) {
            stats.todayCheckOuts++;
        }
        
        // Revenue (only for confirmed and checked-in bookings)
        if ([BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN].includes(booking.status)) {
            stats.revenue += booking.totalAmount || 0;
        }
    });
    
    // Update DOM elements
    document.getElementById('totalBookingsCount')?.textContent = stats.total;
    document.getElementById('pendingBookingsCount')?.textContent = stats.pending;
    document.getElementById('confirmedBookingsCount')?.textContent = stats.confirmed;
    document.getElementById('checkedInCount')?.textContent = stats.checkedIn;
    document.getElementById('todayCheckInsCount')?.textContent = stats.todayCheckIns;
    document.getElementById('todayCheckOutsCount')?.textContent = stats.todayCheckOuts;
    document.getElementById('totalRevenue')?.textContent = CommonUtils.formatCurrency(stats.revenue);
}

// Update pending bookings count for dashboard
function updatePendingBookingsCount() {
    const pendingCount = bookingsData.filter(b => b.status === BOOKING_STATUS.PENDING).length;
    
    // Update dashboard badge
    const badge = document.querySelector('[data-module="bookings"] .badge');
    if (badge) {
        badge.textContent = pendingCount;
    }
}

// View booking details
function viewBooking(bookingId) {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (!booking) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Booking Details: ${booking.bookingId || 'N/A'}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="booking-details">
                    <div class="detail-section">
                        <h4>Guest Information</h4>
                        <div class="detail-row">
                            <div class="detail-label">Name:</div>
                            <div class="detail-value">${booking.firstName} ${booking.lastName}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Email:</div>
                            <div class="detail-value">${booking.email}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Phone:</div>
                            <div class="detail-value">${booking.phone}</div>
                        </div>
                        ${booking.nationality ? `
                            <div class="detail-row">
                                <div class="detail-label">Nationality:</div>
                                <div class="detail-value">${booking.nationality}</div>
                            </div>
                        ` : ''}
                        ${booking.idNumber ? `
                            <div class="detail-row">
                                <div class="detail-label">ID Number:</div>
                                <div class="detail-value">${booking.idNumber}</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="detail-section">
                        <h4>Booking Information</h4>
                        <div class="detail-row">
                            <div class="detail-label">Property:</div>
                            <div class="detail-value">
                                <span class="property-badge" style="background: ${CommonUtils.getPropertyColor(booking.property)}">
                                    <i class="${CommonUtils.getPropertyIcon(booking.property)}"></i>
                                    ${CommonUtils.PROPERTY_NAMES[booking.property] || booking.property}
                                </span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Check-in:</div>
                            <div class="detail-value">${CommonUtils.formatDate(booking.checkIn)}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Check-out:</div>
                            <div class="detail-value">${CommonUtils.formatDate(booking.checkOut)}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Nights:</div>
                            <div class="detail-value">${booking.nights || 1}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Room Type:</div>
                            <div class="detail-value">${booking.roomType || 'N/A'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Rooms:</div>
                            <div class="detail-value">${booking.rooms || 1}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Adults:</div>
                            <div class="detail-value">${booking.adults || 1}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Children:</div>
                            <div class="detail-value">${booking.children || 0}</div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Payment & Status</h4>
                        <div class="detail-row">
                            <div class="detail-label">Total Amount:</div>
                            <div class="detail-value">${CommonUtils.formatCurrency(booking.totalAmount)}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Payment Status:</div>
                            <div class="detail-value">
                                <span class="payment-status ${booking.paymentStatus || 'pending'}">
                                    ${(booking.paymentStatus || 'pending').toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Booking Status:</div>
                            <div class="detail-value">
                                <span class="status-badge" style="background: ${STATUS_COLORS[booking.status] || '#6c757d'}">
                                    ${booking.status?.toUpperCase() || 'PENDING'}
                                </span>
                            </div>
                        </div>
                        ${booking.paymentMethod ? `
                            <div class="detail-row">
                                <div class="detail-label">Payment Method:</div>
                                <div class="detail-value">${booking.paymentMethod}</div>
                            </div>
                        ` : ''}
                        ${booking.transactionId ? `
                            <div class="detail-row">
                                <div class="detail-label">Transaction ID:</div>
                                <div class="detail-value">${booking.transactionId}</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${booking.specialRequests ? `
                        <div class="detail-section">
                            <h4>Special Requests</h4>
                            <div class="detail-value">${booking.specialRequests}</div>
                        </div>
                    ` : ''}
                    
                    ${booking.offerCode ? `
                        <div class="detail-section">
                            <h4>Offer Applied</h4>
                            <div class="detail-row">
                                <div class="detail-label">Offer Code:</div>
                                <div class="detail-value">${booking.offerCode}</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-section">
                        <h4>Timestamps</h4>
                        <div class="detail-row">
                            <div class="detail-label">Created:</div>
                            <div class="detail-value">${CommonUtils.formatDate(booking.createdAt, true)}</div>
                        </div>
                        ${booking.updatedAt ? `
                            <div class="detail-row">
                                <div class="detail-label">Last Updated:</div>
                                <div class="detail-value">${CommonUtils.formatDate(booking.updatedAt, true)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                ${booking.status === BOOKING_STATUS.PENDING ? 
                    `<button class="btn btn-success" onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CONFIRMED}'); this.closest('.modal').remove()">
                        <i class="fas fa-check"></i> Confirm Booking
                    </button>` : ''
                }
                ${booking.status === BOOKING_STATUS.CONFIRMED ? 
                    `<button class="btn btn-primary" onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CHECKED_IN}'); this.closest('.modal').remove()">
                        <i class="fas fa-sign-in-alt"></i> Check-in Guest
                    </button>` : ''
                }
                ${booking.status === BOOKING_STATUS.CHECKED_IN ? 
                    `<button class="btn btn-warning" onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CHECKED_OUT}'); this.closest('.modal').remove()">
                        <i class="fas fa-sign-out-alt"></i> Check-out Guest
                    </button>` : ''
                }
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Update booking status
async function updateBookingStatus(bookingId, newStatus) {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (!booking) return;
    
    const statusMessages = {
        'confirmed': 'Confirm this booking?',
        'checked-in': 'Check-in this guest?',
        'checked-out': 'Check-out this guest?',
        'cancelled': 'Cancel this booking?'
    };
    
    const action = statusMessages[newStatus] || 'Update booking status?';
    
    CommonUtils.showConfirm(
        `Are you sure you want to ${action.toLowerCase()}`,
        async () => {
            try {
                CommonUtils.showLoading(true, 'Updating booking...');
                
                const { db, COLLECTIONS, currentUser } = CommonUtils;
                
                const updateData = {
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: currentUser.name || 'Admin'
                };
                
                // Add check-in/check-out timestamps
                if (newStatus === BOOKING_STATUS.CHECKED_IN) {
                    updateData.checkedInAt = firebase.firestore.FieldValue.serverTimestamp();
                }
                if (newStatus === BOOKING_STATUS.CHECKED_OUT) {
                    updateData.checkedOutAt = firebase.firestore.FieldValue.serverTimestamp();
                }
                
                await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).update(updateData);
                
                // Log activity
                await logBookingActivity(bookingId, newStatus);
                
                CommonUtils.showNotification(`Booking ${newStatus} successfully!`, 'success');
                CommonUtils.showLoading(false);
                
            } catch (error) {
                console.error('Error updating booking status:', error);
                CommonUtils.showNotification('Failed to update booking', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Log booking activity
async function logBookingActivity(bookingId, action) {
    try {
        const { db, COLLECTIONS, currentUser } = CommonUtils;
        const booking = bookingsData.find(b => b.id === bookingId);
        
        if (!booking) return;
        
        const activity = {
            type: 'booking',
            action: action,
            description: `Booking ${booking.bookingId} ${action} by ${currentUser.name}`,
            userId: currentUser.uid,
            userName: currentUser.name,
            bookingId: bookingId,
            bookingReference: booking.bookingId,
            property: booking.property,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            metadata: {
                previousStatus: booking.status,
                newStatus: action,
                guestName: `${booking.firstName} ${booking.lastName}`
            }
        };
        
        await db.collection(COLLECTIONS.ACTIVITIES).add(activity);
        
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Delete booking
async function deleteBooking(bookingId) {
    CommonUtils.showConfirm(
        'Are you sure you want to delete this booking? This action cannot be undone.',
        async () => {
            try {
                CommonUtils.showLoading(true, 'Deleting booking...');
                
                const { db, COLLECTIONS } = CommonUtils;
                
                await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).delete();
                
                CommonUtils.showNotification('Booking deleted successfully!', 'success');
                CommonUtils.showLoading(false);
                
            } catch (error) {
                console.error('Error deleting booking:', error);
                CommonUtils.showNotification('Failed to delete booking', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Handle quick actions
function handleQuickAction(action) {
    switch(action) {
        case 'checkin':
            showQuickCheckIn();
            break;
        case 'checkout':
            showQuickCheckOut();
            break;
        case 'new':
            showNewBooking();
            break;
        case 'export':
            exportBookings();
            break;
    }
}

// Show quick check-in modal
function showQuickCheckIn() {
    // Get today's confirmed bookings
    const today = new Date().toISOString().split('T')[0];
    const todaysCheckIns = bookingsData.filter(b => 
        b.checkIn === today && 
        b.status === BOOKING_STATUS.CONFIRMED
    );
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Today's Check-ins</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${todaysCheckIns.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <h4>No check-ins scheduled for today</h4>
                    </div>
                ` : `
                    <div class="checkin-list">
                        ${todaysCheckIns.map(booking => `
                            <div class="checkin-item">
                                <div class="checkin-info">
                                    <h5>${booking.firstName} ${booking.lastName}</h5>
                                    <p>${booking.roomType} • ${booking.bookingId}</p>
                                    <small>${booking.property} • ${booking.checkIn} to ${booking.checkOut}</small>
                                </div>
                                <button class="btn btn-sm btn-primary" 
                                        onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CHECKED_IN}'); this.closest('.modal').remove()">
                                    <i class="fas fa-sign-in-alt"></i> Check-in
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Show quick check-out modal
function showQuickCheckOut() {
    // Get today's check-outs
    const today = new Date().toISOString().split('T')[0];
    const todaysCheckOuts = bookingsData.filter(b => 
        b.checkOut === today && 
        b.status === BOOKING_STATUS.CHECKED_IN
    );
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Today's Check-outs</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${todaysCheckOuts.length === 0 ? `
                    <div class="empty-state">
                        <i class="fas fa-calendar-times"></i>
                        <h4>No check-outs scheduled for today</h4>
                    </div>
                ` : `
                    <div class="checkout-list">
                        ${todaysCheckOuts.map(booking => `
                            <div class="checkout-item">
                                <div class="checkout-info">
                                    <h5>${booking.firstName} ${booking.lastName}</h5>
                                    <p>${booking.roomType} • ${booking.bookingId}</p>
                                    <small>${booking.property} • Checked in: ${CommonUtils.formatDate(booking.checkedInAt)}</small>
                                </div>
                                <button class="btn btn-sm btn-warning" 
                                        onclick="updateBookingStatus('${booking.id}', '${BOOKING_STATUS.CHECKED_OUT}'); this.closest('.modal').remove()">
                                    <i class="fas fa-sign-out-alt"></i> Check-out
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Show new booking modal
function showNewBooking() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>Create New Booking</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="newBookingForm" onsubmit="createNewBooking(event)">
                    <div class="form-section">
                        <h4>Guest Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="guestFirstName">First Name *</label>
                                <input type="text" id="guestFirstName" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="guestLastName">Last Name *</label>
                                <input type="text" id="guestLastName" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="guestEmail">Email *</label>
                                <input type="email" id="guestEmail" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="guestPhone">Phone *</label>
                                <input type="tel" id="guestPhone" class="form-control" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Booking Details</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="bookingProperty">Property *</label>
                                <select id="bookingProperty" class="form-control" required>
                                    <option value="">Select Property</option>
                                    <option value="limuru">Limuru Country Home</option>
                                    <option value="kanamai">Kanamai Beach Resort</option>
                                    <option value="kisumu">Kisumu Hotel</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="bookingRoomType">Room Type *</label>
                                <select id="bookingRoomType" class="form-control" required>
                                    <option value="">Select Room Type</option>
                                    <option value="standard">Standard Room</option>
                                    <option value="deluxe">Deluxe Room</option>
                                    <option value="suite">Suite</option>
                                    <option value="executive">Executive Room</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="checkInDate">Check-in Date *</label>
                                <input type="date" id="checkInDate" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="checkOutDate">Check-out Date *</label>
                                <input type="date" id="checkOutDate" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="bookingRooms">Number of Rooms *</label>
                                <input type="number" id="bookingRooms" class="form-control" min="1" value="1" required>
                            </div>
                            <div class="form-group">
                                <label for="bookingAdults">Adults *</label>
                                <input type="number" id="bookingAdults" class="form-control" min="1" value="1" required>
                            </div>
                            <div class="form-group">
                                <label for="bookingChildren">Children</label>
                                <input type="number" id="bookingChildren" class="form-control" min="0" value="0">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Payment Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="totalAmount">Total Amount (KES) *</label>
                                <input type="number" id="totalAmount" class="form-control" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="paymentStatus">Payment Status *</label>
                                <select id="paymentStatus" class="form-control" required>
                                    <option value="pending">Pending</option>
                                    <option value="partial">Partial Payment</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="this.closest('.modal').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Create Booking
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    modal.querySelector('#checkInDate').value = today;
    modal.querySelector('#checkOutDate').value = tomorrowStr;
    
    document.body.appendChild(modal);
}

// Create new booking
async function createNewBooking(event) {
    event.preventDefault();
    
    try {
        CommonUtils.showLoading(true, 'Creating booking...');
        
        const { db, COLLECTIONS, currentUser } = CommonUtils;
        
        // Generate booking ID
        const bookingId = 'JUM' + Date.now().toString().substr(-6);
        
        const formData = {
            bookingId: bookingId,
            firstName: document.getElementById('guestFirstName').value,
            lastName: document.getElementById('guestLastName').value,
            email: document.getElementById('guestEmail').value,
            phone: document.getElementById('guestPhone').value,
            property: document.getElementById('bookingProperty').value,
            roomType: document.getElementById('bookingRoomType').value,
            checkIn: document.getElementById('checkInDate').value,
            checkOut: document.getElementById('checkOutDate').value,
            rooms: parseInt(document.getElementById('bookingRooms').value),
            adults: parseInt(document.getElementById('bookingAdults').value),
            children: parseInt(document.getElementById('bookingChildren').value) || 0,
            totalAmount: parseFloat(document.getElementById('totalAmount').value),
            paymentStatus: document.getElementById('paymentStatus').value,
            status: BOOKING_STATUS.PENDING,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.name || 'Admin',
            source: 'manual'
        };
        
        await db.collection(COLLECTIONS.BOOKINGS).add(formData);
        
        // Close modal
        document.querySelector('.modal')?.remove();
        
        CommonUtils.showNotification('Booking created successfully!', 'success');
        CommonUtils.showLoading(false);
        
    } catch (error) {
        console.error('Error creating booking:', error);
        CommonUtils.showNotification('Failed to create booking', 'error');
        CommonUtils.showLoading(false);
    }
}

// Export bookings
function exportBookings() {
    const exportData = filteredBookings.map(booking => ({
        'Booking ID': booking.bookingId || 'N/A',
        'Guest Name': `${booking.firstName} ${booking.lastName}`,
        'Email': booking.email,
        'Phone': booking.phone,
        'Property': CommonUtils.PROPERTY_NAMES[booking.property] || booking.property,
        'Room Type': booking.roomType || 'N/A',
        'Check-in': CommonUtils.formatDate(booking.checkIn),
        'Check-out': CommonUtils.formatDate(booking.checkOut),
        'Nights': booking.nights || 1,
        'Rooms': booking.rooms || 1,
        'Adults': booking.adults || 1,
        'Children': booking.children || 0,
        'Total Amount': booking.totalAmount || 0,
        'Payment Status': booking.paymentStatus || 'pending',
        'Booking Status': booking.status || 'pending',
        'Payment Method': booking.paymentMethod || 'N/A',
        'Created Date': CommonUtils.formatDate(booking.createdAt, true),
        'Special Requests': booking.specialRequests || 'None'
    }));
    
    CommonUtils.exportToCSV(exportData, 'jumuia_bookings');
}

// Refresh bookings
function refreshBookings() {
    loadBookings();
    CommonUtils.showNotification('Bookings refreshed!', 'info');
}

// Update sort indicators
function updateSortIndicators() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        const field = btn.dataset.field;
        const icon = btn.querySelector('i');
        
        if (field === sortField) {
            icon.className = sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        } else {
            icon.className = 'fas fa-sort';
        }
    });
}

// Debounce function
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the bookings module
    if (document.querySelector('[data-module="bookings"]')) {
        setTimeout(() => {
            initBookingsModule();
        }, 100);
    }
});

// Export functions
window.BookingsModule = {
    initBookingsModule,
    loadBookings,
    viewBooking,
    updateBookingStatus,
    deleteBooking,
    showQuickCheckIn,
    showQuickCheckOut,
    showNewBooking,
    createNewBooking,
    refreshBookings,
    exportBookings,
    goToPage,
    BOOKING_STATUS,
    STATUS_COLORS
};