// js/property-functions.js
class PropertyManager {
    constructor(propertyCode) {
        this.propertyCode = propertyCode;
        this.propertyData = this.getPropertyData();
    }

    getPropertyData() {
        const properties = {
            'limuru': {
                name: 'Jumuia Conference & Country Home',
                displayName: 'Limuru',
                color: '#1a5c1a',
                icon: 'fa-mountain',
                totalRooms: 45,
                features: ['Conference Facilities', 'Hostel Accommodation', 'Church Events', 'Nature Walks'],
                contact: {
                    phone: '0759 423 589, 020 2048881',
                    email: 'reservations.limuru@resortjumuia.com'
                }
            },
            'kanamai': {
                name: 'Jumuia Conference & Beach Resort',
                displayName: 'Kanamai',
                color: '#007c00',
                icon: 'fa-umbrella-beach',
                totalRooms: 50,
                features: ['Beach Access', 'Swimming Pool', 'Water Sports', 'Ocean Excursions'],
                contact: {
                    phone: '0710 288 043',
                    email: 'reservations.kanamai@resortjumuia.com'
                }
            },
            'kisumu': {
                name: 'Jumuia Hotel',
                displayName: 'Kisumu',
                color: '#0047ab',
                icon: 'fa-hotel',
                totalRooms: 60,
                features: ['Lake Views', 'Swimming Pool', 'Conference Facilities', 'City Center'],
                contact: {
                    phone: '0713 576969, 0115 994486',
                    email: 'reservations.kisumu@resortjumuia.com'
                }
            }
        };
        return properties[this.propertyCode] || properties.limuru;
    }

    async getPropertyStats(date) {
        const db = window.firebase.db;
        const stats = {
            occupancy: 0,
            revenue: 0,
            pendingBookings: 0,
            currentGuests: 0,
            todayCheckins: 0,
            todayCheckouts: 0
        };

        try {
            // Get today's occupancy
            const occupancyQuery = window.firebase.firestore.query(
                window.firebase.firestore.collection(db, 'bookings'),
                window.firebase.firestore.where('property', '==', this.propertyCode),
                window.firebase.firestore.where('status', 'in', ['confirmed', 'checked-in']),
                window.firebase.firestore.where('checkIn', '<=', date),
                window.firebase.firestore.where('checkOut', '>=', date)
            );
            
            const occupancySnapshot = await window.firebase.firestore.getDocs(occupancyQuery);
            stats.occupancy = Math.round((occupancySnapshot.size / this.propertyData.totalRooms) * 100);
            stats.currentGuests = occupancySnapshot.size;
            
            // Calculate revenue
            occupancySnapshot.forEach(doc => {
                const booking = doc.data();
                stats.revenue += booking.totalAmount || 0;
            });
            
            // Get pending bookings
            const pendingQuery = window.firebase.firestore.query(
                window.firebase.firestore.collection(db, 'bookings'),
                window.firebase.firestore.where('property', '==', this.propertyCode),
                window.firebase.firestore.where('status', '==', 'pending')
            );
            
            const pendingSnapshot = await window.firebase.firestore.getDocs(pendingQuery);
            stats.pendingBookings = pendingSnapshot.size;
            
            // Get today's check-ins
            const checkinsQuery = window.firebase.firestore.query(
                window.firebase.firestore.collection(db, 'bookings'),
                window.firebase.firestore.where('property', '==', this.propertyCode),
                window.firebase.firestore.where('status', '==', 'checked-in'),
                window.firebase.firestore.where('checkIn', '==', date)
            );
            
            const checkinsSnapshot = await window.firebase.firestore.getDocs(checkinsQuery);
            stats.todayCheckins = checkinsSnapshot.size;
            
            // Get today's check-outs
            const checkoutsQuery = window.firebase.firestore.query(
                window.firebase.firestore.collection(db, 'bookings'),
                window.firebase.firestore.where('property', '==', this.propertyCode),
                window.firebase.firestore.where('status', '==', 'checked-out'),
                window.firebase.firestore.where('checkOut', '==', date)
            );
            
            const checkoutsSnapshot = await window.firebase.firestore.getDocs(checkoutsQuery);
            stats.todayCheckouts = checkoutsSnapshot.size;
            
        } catch (error) {
            console.error(`Error getting stats for ${this.propertyCode}:`, error);
        }
        
        return stats;
    }

    async getRecentBookings(limit = 10) {
        const db = window.firebase.db;
        
        try {
            const bookingsQuery = window.firebase.firestore.query(
                window.firebase.firestore.collection(db, 'bookings'),
                window.firebase.firestore.where('property', '==', this.propertyCode),
                window.firebase.firestore.orderBy('createdAt', 'desc'),
                window.firebase.firestore.limit(limit)
            );
            
            const snapshot = await window.firebase.firestore.getDocs(bookingsQuery);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
        } catch (error) {
            console.error(`Error getting bookings for ${this.propertyCode}:`, error);
            return [];
        }
    }

    async getRoomsStatus() {
        // This would connect to your rooms database
        // For now, return sample data
        const roomTypes = ['Standard Single', 'Standard Double', 'Junior Suite', 'Executive Suite'];
        const statuses = ['available', 'occupied', 'maintenance', 'cleaning'];
        
        const rooms = [];
        for (let i = 1; i <= this.propertyData.totalRooms; i++) {
            rooms.push({
                number: i.toString().padStart(3, '0'),
                type: roomTypes[Math.floor(Math.random() * roomTypes.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                rate: Math.floor(Math.random() * 10000) + 5000
            });
        }
        
        return rooms;
    }

    formatCurrency(amount) {
        return `KES ${amount.toLocaleString()}`;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-KE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    getStatusBadge(status) {
        const statusMap = {
            'pending': { class: 'status-pending', text: 'PENDING' },
            'confirmed': { class: 'status-confirmed', text: 'CONFIRMED' },
            'checked-in': { class: 'status-checkedin', text: 'CHECKED IN' },
            'checked-out': { class: 'status-checkedout', text: 'CHECKED OUT' },
            'cancelled': { class: 'status-cancelled', text: 'CANCELLED' }
        };
        return statusMap[status] || { class: 'status-pending', text: 'PENDING' };
    }
}

// Export for use in property pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PropertyManager;
} else {
    window.PropertyManager = PropertyManager;
}