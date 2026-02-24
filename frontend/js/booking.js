// js/booking.js - Booking System for Jumuia Resorts

// Booking Service Object
const BookingService = {
    // Save booking to Firebase
    async saveBooking(bookingData) {
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
            bookingData.updatedAt = new Date().toISOString();
            bookingData.status = 'pending';
            bookingData.paymentStatus = bookingData.paymentMethod === 'cash' ? 'pending' : 'awaiting_payment';
            bookingData.source = 'website';
            
            // Calculate number of nights
            if (bookingData.checkIn && bookingData.checkOut) {
                const checkInDate = new Date(bookingData.checkIn);
                const checkOutDate = new Date(bookingData.checkOut);
                bookingData.nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
            }
            
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
                firestoreId: docRef.id,
                data: bookingData
            };
            
        } catch (error) {
            console.error('Error saving booking:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Get booking by ID
    async getBooking(bookingId) {
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
    },
    
    // Check availability
    async checkAvailability(resort, checkIn, checkOut, roomType) {
        try {
            if (!window.FirebaseServices || !window.FirebaseServices.db) {
                throw new Error('Firebase not initialized');
            }
            
            const db = window.FirebaseServices.db;
            
            // Convert dates to strings for Firestore query
            const checkInStr = typeof checkIn === 'string' ? checkIn : checkIn.toISOString().split('T')[0];
            const checkOutStr = typeof checkOut === 'string' ? checkOut : checkOut.toISOString().split('T')[0];
            
            // Get room capacity for the resort
            const roomCapacities = {
                'limuru': {
                    'standard_single': 10,
                    'standard_double': 8,
                    'executive': 6,
                    'studio_suite': 4,
                    'hostel': 20
                },
                'kanamai': {
                    'standard': 12,
                    'deluxe': 8,
                    'executive': 6,
                    'suite': 4,
                    'villa': 2
                },
                'kisumu': {
                    'standard': 15,
                    'deluxe': 10,
                    'executive': 8,
                    'suite': 6
                }
            };
            
            const maxRooms = roomCapacities[resort]?.[roomType] || 5;
            
            // Query for conflicting bookings
            const bookingsSnapshot = await db.collection('bookings')
                .where('resort', '==', resort)
                .where('roomType', '==', roomType)
                .where('status', 'in', ['confirmed', 'pending'])
                .get();
            
            // Count conflicting bookings
            let conflictingCount = 0;
            bookingsSnapshot.forEach(doc => {
                const booking = doc.data();
                
                // Check for date overlap
                if (!(checkOutStr <= booking.checkIn || checkInStr >= booking.checkOut)) {
                    conflictingCount++;
                }
            });
            
            const available = conflictingCount < maxRooms;
            
            return {
                available: available,
                conflictingBookings: conflictingCount,
                maxRooms: maxRooms,
                availableRooms: Math.max(0, maxRooms - conflictingCount)
            };
            
        } catch (error) {
            console.error('Availability check error:', error);
            return {
                available: false,
                error: error.message
            };
        }
    },
    
    // Calculate rates
    calculateRate(resort, roomType, packageType, nights, adults, children = 0) {
        // Resort-specific rates
        const rates = {
            'limuru': {
                'standard_single': {
                    'bnb': 3560,
                    'hb': 4240,
                    'fb': 4880,
                    'conference': 5000
                },
                'standard_double': {
                    'bnb': 6280,
                    'hb': 7200,
                    'fb': 8080,
                    'conference': 4750
                },
                'executive': {
                    'bnb': 7200,
                    'hb': 8080,
                    'fb': 8960,
                    'conference': 5500
                },
                'studio_suite': {
                    'bnb': 11360,
                    'hb': 12480,
                    'fb': 13560,
                    'conference': 8000
                },
                'hostel': {
                    'bnb': 1500,
                    'hb': 2000,
                    'fb': 2500,
                    'conference': 1500
                }
            },
            'kanamai': {
                'standard': {
                    'bnb': 5300,
                    'hb': 6600,
                    'fb': 7800,
                    'conference': 6000
                },
                'deluxe': {
                    'bnb': 6800,
                    'hb': 8200,
                    'fb': 9500,
                    'conference': 7500
                },
                'executive': {
                    'bnb': 8500,
                    'hb': 9900,
                    'fb': 11200,
                    'conference': 9000
                },
                'suite': {
                    'bnb': 12000,
                    'hb': 13800,
                    'fb': 15500,
                    'conference': 12500
                },
                'villa': {
                    'bnb': 18000,
                    'hb': 21000,
                    'fb': 24000,
                    'conference': 20000
                }
            },
            'kisumu': {
                'standard': {
                    'bnb': 4500,
                    'hb': 5500,
                    'fb': 6500,
                    'conference': 5000
                },
                'deluxe': {
                    'bnb': 6000,
                    'hb': 7200,
                    'fb': 8400,
                    'conference': 6800
                },
                'executive': {
                    'bnb': 7500,
                    'hb': 8800,
                    'fb': 10000,
                    'conference': 8000
                },
                'suite': {
                    'bnb': 9500,
                    'hb': 11000,
                    'fb': 12500,
                    'conference': 10000
                }
            }
        };
        
        const resortRates = rates[resort] || rates['limuru'];
        const roomRates = resortRates[roomType] || resortRates['standard_single'] || resortRates['standard'];
        
        if (!roomRates) {
            console.error('No rates found for:', resort, roomType);
            return {
                baseRate: 0,
                total: 0,
                tax: 0,
                grandTotal: 0,
                nights: nights,
                adults: adults,
                children: children
            };
        }
        
        const baseRate = roomRates[packageType] || roomRates['bnb'] || 0;
        
        // Calculate total for adults
        let total = baseRate * adults * nights;
        
        // Calculate children discount (50% for sharing, 75% for hostel)
        const childDiscountRate = roomType === 'hostel' ? 0.75 : 0.5;
        if (children > 0) {
            const childRate = baseRate * childDiscountRate * children * nights;
            total += childRate;
        }
        
        // Add taxes (16% VAT)
        const tax = total * 0.16;
        const grandTotal = total + tax;
        
        return {
            baseRate: baseRate,
            total: total,
            tax: tax,
            grandTotal: grandTotal,
            nights: nights,
            adults: adults,
            children: children
        };
    },
    
    // Send email notifications
    async sendBookingEmails(bookingData) {
        try {
            // Check if EmailJS is loaded
            if (typeof emailjs === 'undefined') {
                console.log('EmailJS not available');
                return false;
            }
            
            // Initialize EmailJS with your public key
            emailjs.init('QABuHzAPilhRW0PTT');
            
            // Get resort details
            const resortDetails = {
                'limuru': {
                    name: 'Jumuia Conference & Country Home - Limuru',
                    email: 'reservations.limuru@resortjumuia.com',
                    phone: '0759 423 589, 020 2048881'
                },
                'kanamai': {
                    name: 'Jumuia Conference & Beach Resort - Kanamai',
                    email: 'reservations.kanamai@resortjumuia.com',
                    phone: '0710 288 043'
                },
                'kisumu': {
                    name: 'Jumuia Hotel - Kisumu',
                    email: 'reservations.kisumu@resortjumuia.com',
                    phone: '0713 576969, 0115 994486'
                }
            };
            
            const resort = resortDetails[bookingData.resort] || resortDetails['limuru'];
            
            // Format dates
            const formatDate = (dateStr) => {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-KE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
            };
            
            // Get room type display name
            const roomTypeNames = {
                'standard_single': 'Standard Single Room',
                'standard_double': 'Standard Double Room',
                'executive': 'Executive Room',
                'studio_suite': 'Studio Suite',
                'hostel': 'Hostel Bed',
                'standard': 'Standard Room',
                'deluxe': 'Deluxe Room',
                'suite': 'Suite',
                'villa': 'Beach Villa'
            };
            
            // Get package display name
            const packageNames = {
                'bnb': 'Bed & Breakfast',
                'hb': 'Half Board',
                'fb': 'Full Board',
                'conference': 'Conference Package'
            };
            
            // Get payment method display name
            const paymentMethods = {
                'mpesa': 'M-Pesa',
                'card': 'Credit Card',
                'bank': 'Bank Transfer',
                'cash': 'Pay on Arrival'
            };
            
            // Prepare template parameters
            const templateParams = {
                to_email: bookingData.email,
                booking_id: bookingData.bookingId,
                guest_name: `${bookingData.firstName} ${bookingData.lastName}`,
                resort_name: resort.name,
                resort_email: resort.email,
                resort_phone: resort.phone,
                check_in: formatDate(bookingData.checkIn),
                check_out: formatDate(bookingData.checkOut),
                nights: bookingData.nights || 1,
                room_type: roomTypeNames[bookingData.roomType] || bookingData.roomType,
                package_type: packageNames[bookingData.packageType] || bookingData.packageType,
                total_amount: `KSh ${(bookingData.totalAmount || 0).toLocaleString()}`,
                payment_method: paymentMethods[bookingData.paymentMethod] || bookingData.paymentMethod,
                payment_status: bookingData.paymentMethod === 'cash' ? 'Pay on Arrival' : 'Awaiting Payment',
                booking_date: new Date().toLocaleDateString('en-KE'),
                special_requests: bookingData.specialRequests || 'None',
                adults: bookingData.adults || 1,
                children: bookingData.children || 0
            };
            
            // Send confirmation email to guest
            await emailjs.send('service_9yusqtl', 'booking_confirmation_guest', templateParams);
            console.log('Confirmation email sent to guest');
            
            // Send notification to resort
            await emailjs.send('service_9yusqtl', 'booking_notification_resort', {
                to_email: resort.email,
                booking_id: bookingData.bookingId,
                guest_name: templateParams.guest_name,
                guest_email: bookingData.email,
                guest_phone: bookingData.phone,
                resort_name: resort.name,
                check_in: templateParams.check_in,
                check_out: templateParams.check_out,
                nights: templateParams.nights,
                adults: templateParams.adults,
                children: templateParams.children,
                room_type: templateParams.room_type,
                package_type: templateParams.package_type,
                total_amount: templateParams.total_amount,
                payment_method: templateParams.payment_method,
                special_requests: templateParams.special_requests,
                booking_date: templateParams.booking_date
            });
            console.log('Notification email sent to resort');
            
            // Send notification to admin
            await emailjs.send('service_9yusqtl', 'booking_notification_admin', {
                to_email: 'admin@resortjumuia.com',
                booking_id: bookingData.bookingId,
                guest_name: templateParams.guest_name,
                resort_name: resort.name,
                check_in: templateParams.check_in,
                check_out: templateParams.check_out,
                total_amount: templateParams.total_amount,
                payment_method: templateParams.payment_method
            });
            console.log('Notification email sent to admin');
            
            return true;
            
        } catch (error) {
            console.error('Email sending failed:', error);
            return false;
        }
    }
};

// Expose to window
window.BookingService = BookingService;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking service initialized');
});