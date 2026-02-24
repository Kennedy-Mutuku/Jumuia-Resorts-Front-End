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
        // Get from user session or URL
        const user = firebase.auth().currentUser;
        if (user && user.resort) {
            return user.resort;
        }
        
        // Check URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('resort') || 'all';
    }
    
    async loadBookings(filters = {}) {
        try {
            let query = db.collection('bookings')
                .orderBy('createdAt', 'desc')
                .limit(50);
            
            // Apply resort filter if not viewing all
            if (this.currentResort !== 'all') {
                query = query.where('resort', '==', this.currentResort);
            }
            
            // Apply additional filters
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            
            if (filters.paymentStatus) {
                query = query.where('paymentStatus', '==', filters.paymentStatus);
            }
            
            if (filters.dateFrom && filters.dateTo) {
                query = query.where('checkIn', '>=', filters.dateFrom)
                           .where('checkIn', '<=', filters.dateTo);
            }
            
            const snapshot = await query.get();
            this.displayBookings(snapshot);
            
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError('Failed to load bookings');
        }
    }
    
    displayBookings(snapshot) {
        const tbody = document.getElementById('bookingsTableBody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
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
        
        snapshot.forEach(doc => {
            const booking = doc.data();
            const row = this.createBookingRow(booking, doc.id);
            tbody.appendChild(row);
        });
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
            let query = db.collection('bookings');
            
            // Search by booking ID
            const idQuery = await query.where('bookingId', '==', searchTerm).get();
            if (!idQuery.empty) {
                this.displayBookings(idQuery);
                return;
            }
            
            // Search by guest name (case insensitive)
            const nameQuery = await query.where('firstName', '>=', searchTerm)
                                         .where('firstName', '<=', searchTerm + '\uf8ff')
                                         .get();
            
            if (!nameQuery.empty) {
                this.displayBookings(nameQuery);
                return;
            }
            
            // Search by phone
            const phoneQuery = await query.where('phone', '==', searchTerm).get();
            if (!phoneQuery.empty) {
                this.displayBookings(phoneQuery);
                return;
            }
            
            // If nothing found
            this.displayBookings({ empty: true });
            
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    setupListeners() {
        // Real-time updates
        db.collection('bookings')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .onSnapshot((snapshot) => {
                // Show notification for new bookings
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        this.showNewBookingNotification(change.doc.data());
                    }
                });
            });
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