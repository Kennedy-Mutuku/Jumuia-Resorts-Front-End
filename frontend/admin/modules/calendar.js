// admin/modules/calendar.js
// Calendar View Module

let calendar = null;
let bookingsData = [];
let selectedProperty = 'all';
let calendarView = 'dayGridMonth';
let currentDate = new Date();

// Initialize calendar module
function initCalendarModule() {
    console.log('Initializing Calendar module...');

    // Initialize common utilities
    if (!window.CommonUtils || !window.CommonUtils.initCurrentUser()) {
        console.error('Common utilities not available');
        return;
    }

    // Load bookings data
    loadBookingsData();

    // Setup event listeners
    setupEventListeners();

    // Initialize FullCalendar
    initializeCalendar();
}

// Load bookings data from API
async function loadBookingsData() {
    try {
        CommonUtils.showLoading(true, 'Loading bookings...');

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

        const currentUser = CommonUtils.currentUser || session;

        // The frontend expects property, backend uses resort. Standardizing:
        bookingsData = fetchedBookings.map(doc => ({
            id: doc._id || doc.id,
            property: doc.resort || doc.property,
            ...doc
        }));

        // Sort by checkIn
        bookingsData.sort((a, b) => new Date(a.checkIn || 0) - new Date(b.checkIn || 0));

        console.log(`Loaded ${bookingsData.length} bookings`);

        // Initialize or refresh calendar
        if (calendar) {
            calendar.refetchEvents();
        } else {
            initializeCalendar();
        }

        // Update statistics
        updateStatistics();

        CommonUtils.showLoading(false);

    } catch (error) {
        console.error('Error loading bookings data:', error);
        CommonUtils.showNotification('Failed to load bookings', 'error');
        CommonUtils.showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Property filter
    const propertyFilter = document.getElementById('propertyFilter');
    if (propertyFilter) {
        propertyFilter.value = selectedProperty;
        propertyFilter.addEventListener('change', function () {
            selectedProperty = this.value;
            if (calendar) {
                calendar.refetchEvents();
                updateStatistics();
            }
        });
    }

    // View toggle buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            calendarView = this.dataset.view;

            if (calendar) {
                calendar.changeView(calendarView);
            }
        });
    });

    // Today button
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', function () {
            if (calendar) {
                calendar.today();
                currentDate = new Date();
                updateStatistics();
            }
        });
    }

    // Sidebar close
    const sidebarClose = document.getElementById('sidebarClose');
    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    // Overlay close
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
}

// Initialize FullCalendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');

    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: calendarView,
        initialDate: currentDate,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        themeSystem: 'standard',
        firstDay: 1, // Monday
        weekends: true,
        editable: false,
        selectable: false,
        dayMaxEvents: true,
        height: 'auto',
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false
        },
        events: function (fetchInfo, successCallback, failureCallback) {
            try {
                const events = createCalendarEvents(fetchInfo.start, fetchInfo.end);
                successCallback(events);
            } catch (error) {
                console.error('Error fetching events:', error);
                failureCallback(error);
            }
        },
        eventClick: function (info) {
            showBookingDetails(info.event.id);
        },
        eventMouseEnter: function (info) {
            showEventTooltip(info.event, info.jsEvent);
        },
        eventMouseLeave: function () {
            hideEventTooltip();
        },
        datesSet: function (info) {
            currentDate = info.view.currentStart;
            updateStatistics();
        },
        eventDidMount: function (info) {
            // Add custom styling
            const status = info.event.extendedProps.status;
            const property = info.event.extendedProps.property;

            info.el.classList.add(`event-${status}`, `event-${property}`);

            // Add tooltip title
            info.el.title = `${info.event.title} - ${info.event.extendedProps.guestName}`;
        }
    });

    calendar.render();

    // Update date range display
    updateDateRangeDisplay();
}

// Create calendar events from bookings data
function createCalendarEvents(start, end) {
    const events = [];
    const filteredBookings = filterBookingsByProperty(bookingsData);

    filteredBookings.forEach(booking => {
        // Skip if booking dates are not valid
        if (!booking.checkIn || !booking.checkOut) return;

        const checkInDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);

        // Check if booking falls within the visible date range
        if (checkInDate <= end && checkOutDate >= start) {
            const eventId = booking.id;
            const eventTitle = `${booking.firstName} ${booking.lastName}`;
            const eventClass = `event-${booking.status} event-${booking.property}`;

            // Create main booking event
            events.push({
                id: eventId,
                title: eventTitle,
                start: booking.checkIn,
                end: booking.checkOut,
                allDay: true,
                color: getStatusColor(booking.status),
                textColor: getStatusTextColor(booking.status),
                borderColor: getPropertyColor(booking.property),
                extendedProps: {
                    status: booking.status,
                    property: booking.property,
                    guestName: `${booking.firstName} ${booking.lastName}`,
                    bookingId: booking.bookingId,
                    roomType: booking.roomType,
                    nights: booking.nights,
                    totalAmount: booking.totalAmount,
                    phone: booking.phone,
                    email: booking.email
                },
                className: eventClass
            });

            // Add check-in marker
            events.push({
                id: `${eventId}-checkin`,
                title: 'Check-in',
                start: booking.checkIn,
                allDay: true,
                display: 'background',
                backgroundColor: getStatusColor('checked-in'),
                extendedProps: {
                    type: 'checkin',
                    bookingId: booking.bookingId
                }
            });

            // Add check-out marker
            events.push({
                id: `${eventId}-checkout`,
                title: 'Check-out',
                start: booking.checkOut,
                allDay: true,
                display: 'background',
                backgroundColor: getStatusColor('checked-out'),
                extendedProps: {
                    type: 'checkout',
                    bookingId: booking.bookingId
                }
            });
        }
    });

    return events;
}

// Filter bookings by selected property
function filterBookingsByProperty(bookings) {
    if (selectedProperty === 'all') {
        return bookings;
    }
    return bookings.filter(booking => booking.property === selectedProperty);
}

// Get status color for calendar events
function getStatusColor(status) {
    const colors = {
        'pending': '#ffc107',
        'confirmed': '#28a745',
        'checked-in': '#007bff',
        'checked-out': '#6c757d',
        'cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
}

// Get status text color
function getStatusTextColor(status) {
    const colors = {
        'pending': '#856404',
        'confirmed': '#155724',
        'checked-in': '#004085',
        'checked-out': '#383d41',
        'cancelled': '#721c24'
    };
    return colors[status] || '#383d41';
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

// Update statistics
function updateStatistics() {
    const filteredBookings = filterBookingsByProperty(bookingsData);
    const today = new Date().toISOString().split('T')[0];

    // Count by status
    const counts = {
        total: filteredBookings.length,
        pending: 0,
        confirmed: 0,
        checkedIn: 0,
        checkedOut: 0,
        cancelled: 0,
        limuru: 0,
        kanamai: 0,
        kisumu: 0,
        todayCheckins: 0,
        todayCheckouts: 0
    };

    filteredBookings.forEach(booking => {
        // Status counts
        if (booking.status === 'pending') counts.pending++;
        if (booking.status === 'confirmed') counts.confirmed++;
        if (booking.status === 'checked-in') counts.checkedIn++;
        if (booking.status === 'checked-out') counts.checkedOut++;
        if (booking.status === 'cancelled') counts.cancelled++;

        // Property counts
        if (booking.property === 'limuru') counts.limuru++;
        if (booking.property === 'kanamai') counts.kanamai++;
        if (booking.property === 'kisumu') counts.kisumu++;

        // Today's check-ins/outs
        if (booking.checkIn === today && booking.status === 'checked-in') {
            counts.todayCheckins++;
        }
        if (booking.checkOut === today && booking.status === 'checked-out') {
            counts.todayCheckouts++;
        }
    });

    // Update DOM elements
    document.getElementById('totalBookings').textContent = counts.total;
    document.getElementById('todayCheckins').textContent = counts.todayCheckins;
    document.getElementById('todayCheckouts').textContent = counts.todayCheckouts;

    // Update legend counts
    document.getElementById('pendingCount').textContent = counts.pending;
    document.getElementById('confirmedCount').textContent = counts.confirmed;
    document.getElementById('checkedinCount').textContent = counts.checkedIn;
    document.getElementById('checkedoutCount').textContent = counts.checkedOut;
    document.getElementById('cancelledCount').textContent = counts.cancelled;
    document.getElementById('limuruCount').textContent = counts.limuru;
    document.getElementById('kanamaiCount').textContent = counts.kanamai;
    document.getElementById('kisumuCount').textContent = counts.kisumu;

    // Calculate occupancy rate
    const totalRooms = selectedProperty === 'all' ? 90 : 30; // 30 rooms per property
    const currentOccupancy = filteredBookings.filter(b =>
        ['checked-in', 'confirmed'].includes(b.status)
    ).length;
    const occupancyRate = Math.round((currentOccupancy / totalRooms) * 100);
    document.getElementById('occupancyRate').textContent = `${occupancyRate}%`;

    // Update date display
    updateDateRangeDisplay();
}

// Update date range display
function updateDateRangeDisplay() {
    if (!calendar) return;

    const view = calendar.view;
    const start = view.currentStart;
    const end = view.currentEnd;

    const options = { month: 'long', year: 'numeric' };
    const today = new Date().toISOString().split('T')[0];

    // Update date range text
    if (view.type === 'dayGridMonth') {
        const monthYear = start.toLocaleDateString('en-KE', options);
        document.getElementById('dateRange').textContent = monthYear;
    } else if (view.type === 'timeGridWeek') {
        const weekStart = start.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
        const weekEnd = new Date(end.getTime() - 86400000).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
        document.getElementById('dateRange').textContent = `${weekStart} - ${weekEnd}`;
    } else {
        document.getElementById('dateRange').textContent = start.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Update today's date
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-KE', {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
    });
}

// Show booking details in sidebar
function showBookingDetails(bookingId) {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (!booking) return;

    // Show loading in sidebar
    const sidebarContent = document.getElementById('bookingDetails');
    sidebarContent.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-spinner"></div>
        </div>
    `;

    // Open sidebar
    document.getElementById('bookingSidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('active');

    // Populate sidebar content
    setTimeout(() => {
        populateBookingDetails(booking);
    }, 500);
}

// Populate booking details in sidebar
function populateBookingDetails(booking) {
    const sidebarContent = document.getElementById('bookingDetails');

    const statusColors = {
        'pending': '#ffc107',
        'confirmed': '#28a745',
        'checked-in': '#007bff',
        'checked-out': '#6c757d',
        'cancelled': '#dc3545'
    };

    const statusText = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
    const statusColor = statusColors[booking.status] || '#6c757d';

    sidebarContent.innerHTML = `
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
        </div>
        
        <div class="detail-section">
            <h4>Booking Details</h4>
            <div class="detail-row">
                <div class="detail-label">Booking ID:</div>
                <div class="detail-value">${booking.bookingId || 'N/A'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Property:</div>
                <div class="detail-value">
                    <span style="color: ${CommonUtils.getPropertyColor(booking.property)}">
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
                    <span style="color: ${booking.paymentStatus === 'paid' ? '#28a745' : '#dc3545'}">
                        ${(booking.paymentStatus || 'pending').toUpperCase()}
                    </span>
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Booking Status:</div>
                <div class="detail-value">
                    <span style="color: ${statusColor}; font-weight: 600;">
                        ${statusText.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
        
        ${booking.specialRequests ? `
            <div class="detail-section">
                <h4>Special Requests</h4>
                <div class="detail-value" style="text-align: left; margin-top: 10px;">
                    ${booking.specialRequests}
                </div>
            </div>
        ` : ''}
        
        <div class="booking-actions">
            <button class="action-btn btn-view" onclick="openBookingInBookingsModule('${booking.id}')">
                <i class="fas fa-external-link-alt"></i> Open in Bookings
            </button>
            
            ${booking.status === 'pending' ? `
                <button class="action-btn btn-confirm" onclick="updateBookingStatus('${booking.id}', 'confirmed')">
                    <i class="fas fa-check"></i> Confirm Booking
                </button>
            ` : ''}
            
            ${booking.status === 'confirmed' ? `
                <button class="action-btn btn-checkin" onclick="updateBookingStatus('${booking.id}', 'checked-in')">
                    <i class="fas fa-sign-in-alt"></i> Check-in Guest
                </button>
            ` : ''}
            
            ${booking.status === 'checked-in' ? `
                <button class="action-btn btn-checkout" onclick="updateBookingStatus('${booking.id}', 'checked-out')">
                    <i class="fas fa-sign-out-alt"></i> Check-out Guest
                </button>
            ` : ''}
            
            <button class="action-btn" style="background-color: #6c757d; color: white;" 
                    onclick="printBookingDetails('${booking.id}')">
                <i class="fas fa-print"></i> Print
            </button>
        </div>
    `;
}

// Close sidebar
function closeSidebar() {
    document.getElementById('bookingSidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// Show event tooltip
function showEventTooltip(event, mouseEvent) {
    const tooltip = document.createElement('div');
    tooltip.className = 'event-popup';
    tooltip.style.left = mouseEvent.pageX + 'px';
    tooltip.style.top = mouseEvent.pageY + 'px';

    const props = event.extendedProps;
    const statusColors = {
        'pending': '#ffc107',
        'confirmed': '#28a745',
        'checked-in': '#007bff',
        'checked-out': '#6c757d',
        'cancelled': '#dc3545'
    };

    tooltip.innerHTML = `
        <h4>${props.guestName}</h4>
        <span class="event-status" style="background-color: ${statusColors[props.status] || '#6c757d'}; color: white;">
            ${props.status.toUpperCase()}
        </span>
        <p><strong>Booking ID:</strong> ${props.bookingId}</p>
        <p><strong>Property:</strong> ${CommonUtils.PROPERTY_NAMES[props.property] || props.property}</p>
        <p><strong>Room:</strong> ${props.roomType}</p>
        <p><strong>Nights:</strong> ${props.nights || 1}</p>
        <p><strong>Amount:</strong> ${CommonUtils.formatCurrency(props.totalAmount)}</p>
        <button class="btn btn-sm btn-primary" onclick="showBookingDetails('${event.id}')" 
                style="margin-top: 10px; width: 100%;">
            <i class="fas fa-info-circle"></i> View Details
        </button>
    `;

    tooltip.id = 'eventTooltip';
    document.body.appendChild(tooltip);

    // Position tooltip
    const tooltipEl = document.getElementById('eventTooltip');
    const rect = tooltipEl.getBoundingClientRect();

    if (rect.right > window.innerWidth) {
        tooltipEl.style.left = (mouseEvent.pageX - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        tooltipEl.style.top = (mouseEvent.pageY - rect.height) + 'px';
    }
}

// Hide event tooltip
function hideEventTooltip() {
    const tooltip = document.getElementById('eventTooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Open booking in bookings module
function openBookingInBookingsModule(bookingId) {
    // This function would navigate to the bookings module and select the booking
    CommonUtils.showNotification('Opening booking in Bookings module...', 'info');
    // For now, just close the sidebar
    closeSidebar();

    // In a real implementation, you would:
    // 1. Switch to bookings module
    // 2. Filter to show this booking
    // 3. Highlight or open details
}

// Update booking status
async function updateBookingStatus(bookingId, newStatus) {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (!booking) return;

    CommonUtils.showConfirm(
        `Are you sure you want to change booking status to ${newStatus}?`,
        async () => {
            try {
                CommonUtils.showLoading(true, 'Updating booking status...');

                const sessionRaw = localStorage.getItem('jumuia_resort_session');
                const session = JSON.parse(sessionRaw);
                const apiUrl = (window.API_CONFIG && window.API_CONFIG.API_URL) ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';

                const updateData = {
                    status: newStatus,
                    updatedBy: session.name || 'Admin',
                    updatedAt: new Date().toISOString()
                };

                // Add check-in/check-out timestamps
                if (newStatus === 'checked-in') {
                    updateData.checkedInAt = new Date().toISOString();
                }
                if (newStatus === 'checked-out') {
                    updateData.checkedOutAt = new Date().toISOString();
                }

                const response = await fetch(`${apiUrl}/bookings/${bookingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': session.token ? `Bearer ${session.token}` : ''
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) throw new Error('Failed to update booking status via API');

                CommonUtils.showNotification(`Booking status updated to ${newStatus}!`, 'success');
                CommonUtils.showLoading(false);

                // Refresh data
                loadBookingsData();
                closeSidebar();

            } catch (error) {
                console.error('Error updating booking status:', error);
                CommonUtils.showNotification('Failed to update booking status', 'error');
                CommonUtils.showLoading(false);
            }
        }
    );
}

// Print booking details
function printBookingDetails(bookingId) {
    const booking = bookingsData.find(b => b.id === bookingId);
    if (!booking) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Booking Details - ${booking.bookingId}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #22440f; border-bottom: 2px solid #f3a435; padding-bottom: 10px; }
                .section { margin-bottom: 20px; }
                .section h2 { color: #1a5c1a; font-size: 16px; margin-bottom: 10px; }
                .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .label { font-weight: bold; color: #333; }
                .value { color: #666; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>JUMUIA RESORTS - BOOKING DETAILS</h1>
            <div class="section">
                <h2>Booking Information</h2>
                <div class="row">
                    <div class="label">Booking ID:</div>
                    <div class="value">${booking.bookingId || 'N/A'}</div>
                </div>
                <div class="row">
                    <div class="label">Property:</div>
                    <div class="value">${CommonUtils.PROPERTY_NAMES[booking.property] || booking.property}</div>
                </div>
                <div class="row">
                    <div class="label">Status:</div>
                    <div class="value">${booking.status.toUpperCase()}</div>
                </div>
                <div class="row">
                    <div class="label">Check-in:</div>
                    <div class="value">${CommonUtils.formatDate(booking.checkIn)}</div>
                </div>
                <div class="row">
                    <div class="label">Check-out:</div>
                    <div class="value">${CommonUtils.formatDate(booking.checkOut)}</div>
                </div>
                <div class="row">
                    <div class="label">Nights:</div>
                    <div class="value">${booking.nights || 1}</div>
                </div>
            </div>
            
            <div class="section">
                <h2>Guest Information</h2>
                <div class="row">
                    <div class="label">Name:</div>
                    <div class="value">${booking.firstName} ${booking.lastName}</div>
                </div>
                <div class="row">
                    <div class="label">Email:</div>
                    <div class="value">${booking.email}</div>
                </div>
                <div class="row">
                    <div class="label">Phone:</div>
                    <div class="value">${booking.phone}</div>
                </div>
            </div>
            
            <div class="section">
                <h2>Room Details</h2>
                <div class="row">
                    <div class="label">Room Type:</div>
                    <div class="value">${booking.roomType || 'N/A'}</div>
                </div>
                <div class="row">
                    <div class="label">Number of Rooms:</div>
                    <div class="value">${booking.rooms || 1}</div>
                </div>
                <div class="row">
                    <div class="label">Adults:</div>
                    <div class="value">${booking.adults || 1}</div>
                </div>
                <div class="row">
                    <div class="label">Children:</div>
                    <div class="value">${booking.children || 0}</div>
                </div>
            </div>
            
            <div class="section">
                <h2>Payment Information</h2>
                <div class="row">
                    <div class="label">Total Amount:</div>
                    <div class="value">${CommonUtils.formatCurrency(booking.totalAmount)}</div>
                </div>
                <div class="row">
                    <div class="label">Payment Status:</div>
                    <div class="value">${(booking.paymentStatus || 'pending').toUpperCase()}</div>
                </div>
            </div>
            
            ${booking.specialRequests ? `
                <div class="section">
                    <h2>Special Requests</h2>
                    <div>${booking.specialRequests}</div>
                </div>
            ` : ''}
            
            <div class="footer">
                <p>Printed on: ${new Date().toLocaleString('en-KE')}</p>
                <p>Jumuia Resorts Management System</p>
            </div>
            
            <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background: #22440f; color: white; border: none; cursor: pointer;">
                Print this page
            </button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Print calendar view
function printCalendar() {
    CommonUtils.showNotification('Preparing calendar for printing...', 'info');
    setTimeout(() => {
        window.print();
    }, 500);
}

// Export calendar data
function exportCalendar() {
    const filteredBookings = filterBookingsByProperty(bookingsData);
    const exportData = filteredBookings.map(booking => ({
        'Booking ID': booking.bookingId || 'N/A',
        'Guest Name': `${booking.firstName} ${booking.lastName}`,
        'Property': CommonUtils.PROPERTY_NAMES[booking.property] || booking.property,
        'Check-in': CommonUtils.formatDate(booking.checkIn),
        'Check-out': CommonUtils.formatDate(booking.checkOut),
        'Nights': booking.nights || 1,
        'Room Type': booking.roomType || 'N/A',
        'Status': booking.status,
        'Payment Status': booking.paymentStatus || 'pending',
        'Total Amount': booking.totalAmount || 0,
        'Phone': booking.phone,
        'Email': booking.email
    }));

    CommonUtils.exportToCSV(exportData, 'jumuia_calendar_export');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Check if we're on the calendar module
    if (document.querySelector('[data-module="calendar"]')) {
        setTimeout(() => {
            initCalendarModule();
        }, 100);
    }
});

// Export functions
window.CalendarModule = {
    initCalendarModule,
    loadBookingsData,
    updateBookingStatus,
    printBookingDetails,
    printCalendar,
    exportCalendar
};