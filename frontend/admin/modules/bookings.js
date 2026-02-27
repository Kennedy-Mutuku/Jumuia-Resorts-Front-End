// Admin Bookings Module JavaScript - Updated for Firestore integration

// Status mapping (matching your database)
const BOOKING_STATUSES = {
    'pending': { label: 'Pending', color: '#f59e0b', icon: 'fas fa-clock', badge: 'warning' },
    'confirmed': { label: 'Confirmed', color: '#10b981', icon: 'fas fa-check-circle', badge: 'success' },
    'checked-in': { label: 'Checked In', color: '#3b82f6', icon: 'fas fa-door-open', badge: 'info' },
    'checked-out': { label: 'Checked Out', color: '#8b5cf6', icon: 'fas fa-sign-out-alt', badge: 'info' },
    'cancelled': { label: 'Cancelled', color: '#ef4444', icon: 'fas fa-times-circle', badge: 'danger' }
};

// Payment status mapping (matching your database)
const PAYMENT_STATUSES = {
    'pending': { label: 'Pending', color: '#f59e0b', icon: 'fas fa-clock', badge: 'warning' },
    'awaiting_payment': { label: 'Awaiting Payment', color: '#f59e0b', icon: 'fas fa-money-check-alt', badge: 'warning' },
    'paid': { label: 'Paid', color: '#10b981', icon: 'fas fa-check-circle', badge: 'success' },
    'failed': { label: 'Failed', color: '#ef4444', icon: 'fas fa-times-circle', badge: 'danger' }
};

// Resort mapping
const RESORTS = {
    'limuru': { label: 'Jumuia Limuru Resort', short: 'Limuru', color: '#3b82f6', badge: 'primary' },
    'kanamai': { label: 'Jumuia Kanamai Resort', short: 'Kanamai', color: '#10b981', badge: 'success' }
};

// Initialize bookings module
function initBookingsModule(dashboard) {
    console.log('Initializing Bookings Module...');

    // Store dashboard reference
    window.dashboard = dashboard;

    // Load bookings from Firestore
    loadBookings();

    // Setup event listeners
    setupBookingListeners();
}

// Load bookings from Firestore
async function loadBookings() {
    try {
        // Show loading
        document.getElementById('loadingBookings').style.display = 'block';
        document.getElementById('noBookings').style.display = 'none';

        const sessionRaw = localStorage.getItem('jumuia_resort_session');
        if (!sessionRaw) throw new Error('Not authenticated');
        const session = JSON.parse(sessionRaw);

        const apiUrl = (window.API_CONFIG && window.API_CONFIG.API_URL) ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';

        const response = await fetch(`${apiUrl}/bookings`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': session.token ? `Bearer ${session.token}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load bookings: ${response.statusText}`);
        }

        let fetchedBookings = await response.json();

        // Apply scoping: If manager, only see their resort. If GM, see all or current filter.
        const currentProperty = dashboard.currentProperty;
        if (currentProperty && currentProperty !== 'all') {
            fetchedBookings = fetchedBookings.filter(b => b.resort === currentProperty);
        }

        // Backend might already sort, but ensure newest first
        fetchedBookings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const bookings = fetchedBookings.map(data => ({
            id: data._id || data.id,
            bookingId: data.bookingId || `BOOK-${String(data._id || data.id || Math.random()).substring(0, 8).toUpperCase()}`,
            ...data,
            // Convert string dates to Date objects
            createdAt: data.createdAt ? new Date(data.createdAt) : null,
            checkIn: data.checkIn ? new Date(data.checkIn) : null,
            checkOut: data.checkOut ? new Date(data.checkOut) : null
        }));

        console.log(`Loaded ${bookings.length} bookings from API`);
        displayBookings(bookings);

    } catch (error) {
        console.error('Error loading bookings:', error);

        // Show error message
        document.getElementById('loadingBookings').style.display = 'none';
        document.getElementById('noBookings').style.display = 'block';
        document.getElementById('noBookings').innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Bookings</h3>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="loadBookings()">
                <i class="fas fa-redo"></i> Try Again
            </button>
        `;

        dashboard.showAlert('Error loading bookings. Please try again.', 'error');
    }
}

// Display bookings in the UI
function displayBookings(bookings) {
    const bookingsList = document.getElementById('bookingsList');
    const loadingBookings = document.getElementById('loadingBookings');
    const noBookings = document.getElementById('noBookings');

    if (bookings.length === 0) {
        bookingsList.innerHTML = '';
        loadingBookings.style.display = 'none';
        noBookings.style.display = 'block';
        return;
    }

    // Generate HTML for each booking
    bookingsList.innerHTML = bookings.map(booking => {
        const status = BOOKING_STATUSES[booking.status] || BOOKING_STATUSES.pending;
        const paymentStatus = PAYMENT_STATUSES[booking.paymentStatus] || PAYMENT_STATUSES.pending;
        const resort = RESORTS[booking.resort] || { label: booking.resort, short: booking.resort, color: '#6b7280', badge: 'secondary' };

        // Format dates
        const checkInDate = booking.checkIn ? formatDate(booking.checkIn) : 'N/A';
        const checkOutDate = booking.checkOut ? formatDate(booking.checkOut) : 'N/A';
        const createdAt = booking.createdAt ? formatDateTime(booking.createdAt) : 'N/A';

        // Calculate nights if not provided
        const nights = booking.nights ||
            (booking.checkIn && booking.checkOut ?
                Math.ceil((booking.checkOut - booking.checkIn) / (1000 * 60 * 60 * 24)) : 1);

        // Format amount
        const totalAmount = booking.totalAmount ?
            `KES ${booking.totalAmount.toLocaleString('en-KE')}` : 'Not set';

        return `
            <div class="booking-card ${booking.status}">
                <div class="booking-header">
                    <div>
                        <div class="booking-id">${booking.bookingId}</div>
                        <div class="booking-property">
                            <span class="badge badge-${resort.badge}">${resort.short}</span>
                            <span style="font-size: 0.9rem; color: var(--text-light); margin-left: 8px;">
                                ${createdAt}
                            </span>
                        </div>
                    </div>
                    <div>
                        <span class="status-badge status-${status.badge}" style="background-color: ${status.color}20; color: ${status.color};">
                            <i class="${status.icon}"></i> ${status.label}
                        </span>
                    </div>
                </div>
                
                <div class="booking-details">
                    <div class="booking-detail">
                        <div class="booking-label">Guest</div>
                        <div class="booking-value">
                            <strong>${booking.firstName || ''} ${booking.lastName || ''}</strong>
                            <div class="guest-info">
                                <small>${booking.email || 'No email'}</small>
                                <small>${booking.phone || booking.mpesaNumber || 'No phone'}</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="booking-detail">
                        <div class="booking-label">Check-in</div>
                        <div class="booking-value">${checkInDate}</div>
                    </div>
                    
                    <div class="booking-detail">
                        <div class="booking-label">Check-out</div>
                        <div class="booking-value">${checkOutDate}</div>
                    </div>
                    
                    <div class="booking-detail">
                        <div class="booking-label">Room Type</div>
                        <div class="booking-value">
                            <i class="fas fa-bed"></i> ${booking.roomTypeDisplay || booking.roomType || 'N/A'}
                        </div>
                    </div>
                    
                    <div class="booking-detail">
                        <div class="booking-label">Guests</div>
                        <div class="booking-value">
                            ${booking.adults || 0} Adult${booking.adults !== 1 ? 's' : ''}
                            ${booking.children ? `, ${booking.children} Child${booking.children !== 1 ? 'ren' : ''}` : ''}
                        </div>
                    </div>
                    
                    <div class="booking-detail">
                        <div class="booking-label">Amount</div>
                        <div class="booking-value">
                            <strong>${totalAmount}</strong>
                            <div class="payment-info">
                                <span class="payment-status" style="color: ${paymentStatus.color};">
                                    <i class="${paymentStatus.icon}"></i> ${paymentStatus.label}
                                </span>
                                <small>via ${booking.paymentMethodDisplay || booking.paymentMethod || 'N/A'}</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="booking-actions">
                    <button class="btn btn-sm btn-secondary" onclick="viewBooking('${booking.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="editBooking('${booking.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${booking.status === 'pending' ? `
                    <button class="btn btn-sm btn-success" onclick="confirmBooking('${booking.id}')">
                        <i class="fas fa-check"></i> Confirm
                    </button>
                    ` : ''}
                    ${booking.paymentStatus === 'awaiting_payment' ? `
                    <button class="btn btn-sm btn-warning" onclick="markAsPaid('${booking.id}')">
                        <i class="fas fa-money-check"></i> Mark Paid
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    loadingBookings.style.display = 'none';
    noBookings.style.display = 'none';
}

// Filter bookings based on selected filters
function filterBookings() {
    const statusFilter = document.getElementById('bookingStatus').value;
    const dateRangeFilter = document.getElementById('bookingDateRange').value;

    dashboard.showAlert(`Filtering bookings: Status=${statusFilter}, Date=${dateRangeFilter}`, 'info');

    // For now, just reload all bookings - we'll implement actual filtering later
    loadBookings();
}

// Export bookings to CSV
function exportBookings() {
    dashboard.showAlert('Export feature coming soon!', 'info');

    // TODO: Implement CSV export functionality
    // This would involve fetching all bookings and converting to CSV format
}

// View booking details
async function viewBooking(id) {
    try {
        await FirebaseService.initialize();
        const services = FirebaseService.getServices();

        const bookingDoc = await services.db.collection('bookings').doc(id).get();

        if (!bookingDoc.exists) {
            dashboard.showAlert('Booking not found!', 'error');
            return;
        }

        const booking = bookingDoc.data();
        showBookingDetailsModal(booking);

    } catch (error) {
        console.error('Error viewing booking:', error);
        dashboard.showAlert('Error loading booking details', 'error');
    }
}

// Edit booking
async function editBooking(id) {
    try {
        await FirebaseService.initialize();
        const services = FirebaseService.getServices();

        const bookingDoc = await services.db.collection('bookings').doc(id).get();

        if (!bookingDoc.exists) {
            dashboard.showAlert('Booking not found!', 'error');
            return;
        }

        const booking = bookingDoc.data();
        showEditBookingModal(id, booking);

    } catch (error) {
        console.error('Error editing booking:', error);
        dashboard.showAlert('Error loading booking for editing', 'error');
    }
}

// Confirm booking
async function confirmBooking(id) {
    try {
        if (!confirm('Are you sure you want to confirm this booking?')) {
            return;
        }

        await FirebaseService.initialize();
        const services = FirebaseService.getServices();

        await services.db.collection('bookings').doc(id).update({
            status: 'confirmed',
            updatedAt: new Date().toISOString()
        });

        dashboard.showAlert('Booking confirmed successfully!', 'success');
        loadBookings(); // Refresh the list

    } catch (error) {
        console.error('Error confirming booking:', error);
        dashboard.showAlert('Error confirming booking', 'error');
    }
}

// Mark booking as paid
async function markAsPaid(id) {
    try {
        if (!confirm('Mark this booking as paid?')) {
            return;
        }

        await FirebaseService.initialize();
        const services = FirebaseService.getServices();

        await services.db.collection('bookings').doc(id).update({
            paymentStatus: 'paid',
            updatedAt: new Date().toISOString()
        });

        dashboard.showAlert('Booking marked as paid!', 'success');
        loadBookings(); // Refresh the list

    } catch (error) {
        console.error('Error updating payment status:', error);
        dashboard.showAlert('Error updating payment status', 'error');
    }
}

// Create new booking
async function createBooking() {
    const form = document.getElementById('newBookingForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    try {
        const guestName = document.getElementById('guestName').value;
        const guestEmail = document.getElementById('guestEmail').value;
        const checkInDate = document.getElementById('checkInDate').value;
        const checkOutDate = document.getElementById('checkOutDate').value;
        const roomType = document.getElementById('roomType').value;
        const guestsCount = document.getElementById('guestsCount').value;
        const specialRequests = document.getElementById('specialRequests').value;

        // Generate booking ID
        const bookingId = 'JUM-' + generateBookingId();

        const newBooking = {
            bookingId: bookingId,
            firstName: guestName.split(' ')[0] || '',
            lastName: guestName.split(' ').slice(1).join(' ') || '',
            email: guestEmail,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            roomType: roomType,
            roomTypeDisplay: document.getElementById('roomType').selectedOptions[0].text,
            adults: parseInt(guestsCount),
            children: 0,
            specialRequests: specialRequests,
            status: 'pending',
            paymentStatus: 'awaiting_payment',
            createdAt: new Date().toISOString(),
            source: 'admin',
            // Default values
            totalAmount: 0,
            nights: calculateNights(checkInDate, checkOutDate),
            resort: 'limuru', // Default resort
            paymentMethod: 'cash',
            paymentMethodDisplay: 'Cash'
        };

        await FirebaseService.initialize();
        const services = FirebaseService.getServices();

        await services.db.collection('bookings').add(newBooking);

        dashboard.showAlert('New booking created successfully!', 'success');
        hideNewBookingModal();
        loadBookings();

        // Reset form
        form.reset();

    } catch (error) {
        console.error('Error creating booking:', error);
        dashboard.showAlert('Error creating booking', 'error');
    }
}

// Show booking details modal
function showBookingDetailsModal(booking) {
    // Create modal HTML (simplified version)
    const modalHtml = `
        <div class="modal-overlay active" id="bookingDetailsModal">
            <div class="modal" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Booking Details - ${booking.bookingId || 'N/A'}</h3>
                    <button class="modal-close" onclick="closeBookingDetailsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="booking-details-grid">
                        <div class="detail-section">
                            <h4><i class="fas fa-user"></i> Guest Information</h4>
                            <p><strong>Name:</strong> ${booking.firstName || ''} ${booking.lastName || ''}</p>
                            <p><strong>Email:</strong> ${booking.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${booking.phone || booking.mpesaNumber || 'N/A'}</p>
                            <p><strong>ID Number:</strong> ${booking.idNumber || 'N/A'}</p>
                            <p><strong>Nationality:</strong> ${booking.nationality || 'N/A'}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4><i class="fas fa-calendar-alt"></i> Stay Details</h4>
                            <p><strong>Check-in:</strong> ${formatDate(new Date(booking.checkIn))}</p>
                            <p><strong>Check-out:</strong> ${formatDate(new Date(booking.checkOut))}</p>
                            <p><strong>Nights:</strong> ${booking.nights || 'N/A'}</p>
                            <p><strong>Resort:</strong> ${RESORTS[booking.resort]?.label || booking.resort}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4><i class="fas fa-bed"></i> Room & Package</h4>
                            <p><strong>Room Type:</strong> ${booking.roomTypeDisplay || booking.roomType}</p>
                            <p><strong>Package:</strong> ${booking.packageTypeDisplay || booking.packageType}</p>
                            <p><strong>Adults:</strong> ${booking.adults || 0}</p>
                            <p><strong>Children:</strong> ${booking.children || 0}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h4><i class="fas fa-money-bill-wave"></i> Payment Details</h4>
                            <p><strong>Total Amount:</strong> KES ${booking.totalAmount ? booking.totalAmount.toLocaleString('en-KE') : '0'}</p>
                            <p><strong>Payment Status:</strong> ${PAYMENT_STATUSES[booking.paymentStatus]?.label || booking.paymentStatus}</p>
                            <p><strong>Payment Method:</strong> ${booking.paymentMethodDisplay || booking.paymentMethod}</p>
                            <p><strong>Source:</strong> ${booking.source || 'N/A'}</p>
                        </div>
                        
                        ${booking.specialRequests ? `
                        <div class="detail-section full-width">
                            <h4><i class="fas fa-sticky-note"></i> Special Requests</h4>
                            <p>${booking.specialRequests}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeBookingDetailsModal()">Close</button>
                    <button class="btn btn-primary" onclick="editBooking('${booking.id}')">Edit Booking</button>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Close booking details modal
function closeBookingDetailsModal() {
    const modal = document.getElementById('bookingDetailsModal');
    if (modal) {
        modal.remove();
    }
}

// Show edit booking modal
function showEditBookingModal(id, booking) {
    dashboard.showAlert('Edit booking feature coming soon!', 'info');
    // TODO: Implement edit modal with form pre-filled with booking data
}

// Setup event listeners
function setupBookingListeners() {
    // Set default dates for new booking form
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    document.getElementById('checkInDate').value = today;
    document.getElementById('checkOutDate').value = tomorrow;
    document.getElementById('checkInDate').min = today;
    document.getElementById('checkOutDate').min = tomorrow;
}

// Helper functions
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateBookingId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ADM-${timestamp}${random}`;
}

function calculateNights(checkIn, checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate - checkInDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Make functions globally available
window.initBookingsModule = initBookingsModule;
window.loadBookings = loadBookings;
window.filterBookings = filterBookings;
window.exportBookings = exportBookings;
window.showNewBookingModal = showNewBookingModal;
window.hideNewBookingModal = hideNewBookingModal;
window.createBooking = createBooking;
window.viewBooking = viewBooking;
window.editBooking = editBooking;
window.confirmBooking = confirmBooking;
window.setupBookingListeners = setupBookingListeners;