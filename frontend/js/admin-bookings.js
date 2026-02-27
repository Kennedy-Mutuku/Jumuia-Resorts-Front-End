// js/admin-bookings.js
class AdminBookingManager {
    constructor() {
        this.currentResort = this.getUserResort();
        this.init();
    }

    init() {
        this.loadBookings();
        this.setupFilters();
        this.setupSearch();
        this.setupListeners();
    }

    getUserResort() {
        // Get from user session 
        const sessionRaw = localStorage.getItem('jumuia_resort_session');
        if (sessionRaw) {
            const user = JSON.parse(sessionRaw);
            if (user.assignedProperty) return user.assignedProperty;
            if (user.properties && user.properties.length > 0) return user.properties[0];
        }

        // Check URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('resort') || 'all';
    }

    async loadBookings(filters = {}) {
        try {
            const sessionRaw = localStorage.getItem('jumuia_resort_session');
            if (!sessionRaw) throw new Error('Not authenticated');
            const session = JSON.parse(sessionRaw);
            const apiUrl = (window.API_CONFIG && window.API_CONFIG.API_URL) ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';

            const response = await fetch(`${apiUrl}/bookings`, {
                headers: { 'Authorization': session.token ? `Bearer ${session.token}` : '' }
            });
            if (!response.ok) throw new Error('Failed to fetch API data');
            let data = await response.json();

            // Backend might filter by role automatically, but ensure frontend filtering matches
            if (this.currentResort !== 'all') {
                data = data.filter(b => b.resort === this.currentResort);
            }
            if (filters.status) data = data.filter(b => b.status === filters.status);
            if (filters.paymentStatus) data = data.filter(b => b.paymentStatus === filters.paymentStatus);
            if (filters.dateFrom && filters.dateTo) {
                data = data.filter(b => b.checkIn >= filters.dateFrom && b.checkIn <= filters.dateTo);
            }

            data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            // limit to 50
            data = data.slice(0, 50);

            // standardise _id to id mapping
            data = data.map(doc => ({ id: doc._id || doc.id, ...doc }));

            // Update latest booking ID for polling logic
            if (data.length > 0) this.latestBookingId = data[0].id;

            this.displayBookings(data);

        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError('Failed to load bookings');
        }
    }

    displayBookings(bookings) {
        const tbody = document.getElementById('bookingsTableBody');
        tbody.innerHTML = '';

        if (!bookings || bookings.length === 0 || bookings.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">
                        <i class="fas fa-calendar-times"></i>
                        No bookings found
                    </td>
                </tr>
            `;
            return;
        }

        if (Array.isArray(bookings)) {
            bookings.forEach(booking => {
                const row = this.createBookingRow(booking, booking.id);
                tbody.appendChild(row);
            });
        }
    }

    createBookingRow(booking, docId) {
        const row = document.createElement('tr');

        // Format dates
        const checkIn = new Date(booking.checkIn).toLocaleDateString('en-KE');
        const checkOut = new Date(booking.checkOut).toLocaleDateString('en-KE');
        const created = new Date(booking.createdAt).toLocaleDateString('en-KE');

        // Status badge
        const statusBadge = this.getStatusBadge(booking.status);
        const paymentBadge = this.getPaymentBadge(booking.paymentStatus);

        row.innerHTML = `
            <td>
                <strong>${booking.bookingId}</strong><br>
                <small class="text-muted">${created}</small>
            </td>
            <td>
                <strong>${booking.firstName} ${booking.lastName}</strong><br>
                <small>${booking.phone}</small>
            </td>
            <td>${this.getResortName(booking.resort)}</td>
            <td>${checkIn}</td>
            <td>${checkOut}</td>
            <td>KSh ${booking.totalAmount?.toLocaleString() || '0'}</td>
            <td>${statusBadge}</td>
            <td>${paymentBadge}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewBooking('${docId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-edit" onclick="editBooking('${docId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteBooking('${docId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-warning">Pending</span>',
            'confirmed': '<span class="badge badge-success">Confirmed</span>',
            'cancelled': '<span class="badge badge-danger">Cancelled</span>',
            'checked_in': '<span class="badge badge-primary">Checked In</span>',
            'checked_out': '<span class="badge badge-info">Checked Out</span>',
            'no_show': '<span class="badge badge-secondary">No Show</span>'
        };
        return badges[status] || '<span class="badge">Unknown</span>';
    }

    getPaymentBadge(status) {
        const badges = {
            'pending': '<span class="badge badge-warning">Pending</span>',
            'awaiting_payment': '<span class="badge badge-warning">Awaiting</span>',
            'paid': '<span class="badge badge-success">Paid</span>',
            'failed': '<span class="badge badge-danger">Failed</span>',
            'refunded': '<span class="badge badge-info">Refunded</span>'
        };
        return badges[status] || '<span class="badge">Unknown</span>';
    }

    getResortName(resortCode) {
        const resorts = {
            'limuru': 'Limuru',
            'kanamai': 'Kanamai',
            'kisumu': 'Kisumu'
        };
        return resorts[resortCode] || resortCode;
    }

    setupFilters() {
        document.getElementById('filterStatus').addEventListener('change', (e) => {
            this.applyFilters();
        });

        document.getElementById('filterPayment').addEventListener('change', (e) => {
            this.applyFilters();
        });

        document.getElementById('filterDate').addEventListener('change', (e) => {
            this.applyFilters();
        });
    }

    applyFilters() {
        const filters = {
            status: document.getElementById('filterStatus').value,
            paymentStatus: document.getElementById('filterPayment').value,
            dateFrom: document.getElementById('dateFrom').value,
            dateTo: document.getElementById('dateTo').value
        };

        this.loadBookings(filters);
    }

    setupSearch() {
        const searchInput = document.getElementById('searchBookings');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchBookings(e.target.value);
            }, 500);
        });
    }

    async searchBookings(searchTerm) {
        if (!searchTerm.trim()) {
            this.loadBookings();
            return;
        }

        try {
            const sessionRaw = localStorage.getItem('jumuia_resort_session');
            const session = JSON.parse(sessionRaw);
            const apiUrl = (window.API_CONFIG && window.API_CONFIG.API_URL) ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';

            const response = await fetch(`${apiUrl}/bookings`, {
                headers: { 'Authorization': session.token ? `Bearer ${session.token}` : '' }
            });
            if (!response.ok) return;
            let data = await response.json();

            const lowerSearch = searchTerm.toLowerCase();
            const results = data.filter(b =>
                (b.bookingId && b.bookingId.toLowerCase().includes(lowerSearch)) ||
                (b.firstName && b.firstName.toLowerCase().includes(lowerSearch)) ||
                (b.lastName && b.lastName.toLowerCase().includes(lowerSearch)) ||
                (b.phone && b.phone.includes(searchTerm))
            );

            if (results.length > 0) {
                const mapped = results.map(doc => ({ id: doc._id || doc.id, ...doc }));
                this.displayBookings(mapped);
            } else {
                this.displayBookings({ empty: true });
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    setupListeners() {
        // Polling for new bookings every 30s as a Firebase real-time alternative
        setInterval(async () => {
            try {
                const sessionRaw = localStorage.getItem('jumuia_resort_session');
                if (!sessionRaw) return;
                const session = JSON.parse(sessionRaw);
                const apiUrl = (window.API_CONFIG && window.API_CONFIG.API_URL) ? window.API_CONFIG.API_URL : 'http://localhost:5000/api';

                const response = await fetch(`${apiUrl}/bookings`, {
                    headers: { 'Authorization': session.token ? `Bearer ${session.token}` : '' }
                });
                if (!response.ok) return;
                let data = await response.json();
                data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

                if (data.length > 0 && this.latestBookingId && (data[0]._id || data[0].id) !== this.latestBookingId) {
                    this.latestBookingId = data[0]._id || data[0].id;
                    this.showNewBookingNotification(data[0]);
                    this.applyFilters();
                }
            } catch (err) { }
        }, 30000);
    }

    showNewBookingNotification(booking) {
        // Only show if viewing all resorts or the specific resort
        if (this.currentResort === 'all' || this.currentResort === booking.resort) {
            const notification = document.createElement('div');
            notification.className = 'new-booking-notification';
            notification.innerHTML = `
                <i class="fas fa-bell"></i>
                <div>
                    <strong>New Booking: ${booking.bookingId}</strong>
                    <p>${booking.firstName} ${booking.lastName} - ${this.getResortName(booking.resort)}</p>
                </div>
                <button onclick="this.parentElement.remove()">&times;</button>
            `;

            document.body.appendChild(notification);

            // Auto remove after 10 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 10000);
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            ${message}
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        document.querySelector('.dashboard-content').prepend(errorDiv);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const bookingManager = new AdminBookingManager();

    // Make available globally
    window.bookingManager = bookingManager;
});