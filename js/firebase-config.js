// js/firebase-config.js

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

// Check if Firebase is already initialized globally
let app, auth, db, storage, analytics;

// Create a service object without initializing Firebase
const FirebaseService = {
    // App & Analytics
    get app() {
        return window.firebaseApp || app;
    },
    get analytics() {
        return window.firebaseAnalytics || analytics;
    },
    
    // Auth
    get auth() {
        return window.firebaseAuth || auth;
    },
    
    // Firestore
    get db() {
        return window.firebaseDb || db;
    },
    
    // Storage
    get storage() {
        return window.firebaseStorage || storage;
    },
    
    // Auth methods
    authMethods: {
        signInWithEmailAndPassword: (email, password) => {
            const authInstance = window.firebaseAuth || auth;
            return authInstance ? authInstance.signInWithEmailAndPassword(email, password) : null;
        },
        createUserWithEmailAndPassword: (email, password) => {
            const authInstance = window.firebaseAuth || auth;
            return authInstance ? authInstance.createUserWithEmailAndPassword(email, password) : null;
        },
        onAuthStateChanged: (callback) => {
            const authInstance = window.firebaseAuth || auth;
            return authInstance ? authInstance.onAuthStateChanged(callback) : null;
        },
        signOut: () => {
            const authInstance = window.firebaseAuth || auth;
            return authInstance ? authInstance.signOut() : null;
        },
        currentUser: () => {
            const authInstance = window.firebaseAuth || auth;
            return authInstance ? authInstance.currentUser : null;
        }
    },
    
    // Firestore methods
    firestore: {
        collection: (path) => {
            const dbInstance = window.firebaseDb || db;
            return dbInstance ? dbInstance.collection(path) : null;
        },
        doc: (path) => {
            const dbInstance = window.firebaseDb || db;
            return dbInstance ? dbInstance.doc(path) : null;
        },
        serverTimestamp: () => {
            return window.firebase && window.firebase.firestore ? 
                window.firebase.firestore.FieldValue.serverTimestamp() : null;
        }
    },
    
    // Storage methods
    storageMethods: {
        ref: (path) => {
            const storageInstance = window.firebaseStorage || storage;
            return storageInstance ? storageInstance.ref(path) : null;
        }
    },
    
    // Helper functions for booking system
    saveBooking: async function(bookingData) {
        try {
            const dbInstance = this.db || window.firebaseDb;
            if (!dbInstance) {
                throw new Error('Firebase not initialized');
            }
            
            // Generate booking ID
            const bookingId = 'JUM-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            bookingData.bookingId = bookingId;
            bookingData.createdAt = new Date().toISOString();
            bookingData.status = 'pending';
            
            // Save to Firestore
            const bookingRef = await dbInstance.collection('bookings').add(bookingData);
            console.log('Booking saved with ID:', bookingRef.id);
            
            return {
                success: true,
                bookingId: bookingId,
                firestoreId: bookingRef.id,
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
    
    getBookingsByResort: async function(resortCode) {
        try {
            const dbInstance = this.db || window.firebaseDb;
            if (!dbInstance) {
                throw new Error('Firebase not initialized');
            }
            
            const querySnapshot = await dbInstance.collection('bookings')
                .where('resort', '==', resortCode)
                .orderBy('createdAt', 'desc')
                .get();
            
            const bookings = [];
            querySnapshot.forEach((doc) => {
                bookings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return bookings;
        } catch (error) {
            console.error('Error getting bookings:', error);
            return [];
        }
    },
    
    updateBookingStatus: async function(bookingId, status, paymentStatus = null) {
        try {
            const dbInstance = this.db || window.firebaseDb;
            if (!dbInstance) {
                throw new Error('Firebase not initialized');
            }
            
            const updateData = { 
                status: status,
                updatedAt: new Date().toISOString()
            };
            
            if (paymentStatus) {
                updateData.paymentStatus = paymentStatus;
            }
            
            await dbInstance.collection('bookings').doc(bookingId).update(updateData);
            return { success: true };
        } catch (error) {
            console.error('Error updating booking:', error);
            return { success: false, error: error.message };
        }
    }
};

// Initialize function - only call this if Firebase isn't already initialized
const initializeFirebase = async function() {
    return new Promise((resolve, reject) => {
        try {
            // Check if Firebase is already initialized
            if (typeof firebase === 'undefined') {
                console.warn('Firebase SDK not loaded');
                reject(new Error('Firebase SDK not loaded'));
                return;
            }
            
            // Check if Firebase is already initialized by main.js
            if (firebase.apps.length > 0) {
                console.log('Firebase already initialized by another script');
                
                // Use the existing instance
                app = firebase.app();
                auth = firebase.auth();
                db = firebase.firestore();
                storage = firebase.storage();
                analytics = firebase.analytics();
                
                // Update service object
                FirebaseService.app = app;
                FirebaseService.auth = auth;
                FirebaseService.db = db;
                FirebaseService.storage = storage;
                FirebaseService.analytics = analytics;
                
                resolve(FirebaseService);
                return;
            }
            
            // Initialize Firebase
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            storage = firebase.storage();
            analytics = firebase.analytics();
            
            // Enable offline persistence
            db.enablePersistence().catch((err) => {
                console.warn('Persistence error:', err);
            });
            
            // Update service object
            FirebaseService.app = app;
            FirebaseService.auth = auth;
            FirebaseService.db = db;
            FirebaseService.storage = storage;
            FirebaseService.analytics = analytics;
            
            console.log('Firebase initialized by firebase-config.js');
            resolve(FirebaseService);
            
        } catch (error) {
            console.error('Error in initializeFirebase:', error);
            reject(error);
        }
    });
};

// Simple version for direct HTML inclusion
const initializeFirebaseSimple = function() {
    // This function will be called from your booking pages
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded. Make sure firebase scripts are included before this file.');
        return null;
    }
    
    try {
        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            storage = firebase.storage();
            
            console.log('Firebase initialized by initializeFirebaseSimple');
        } else {
            app = firebase.app();
            auth = firebase.auth();
            db = firebase.firestore();
            storage = firebase.storage();
        }
        
        // Create simplified service object for booking
        const BookingService = {
            saveBooking: async function(bookingData) {
                try {
                    // Add metadata
                    bookingData.createdAt = new Date().toISOString();
                    bookingData.status = 'pending';
                    
                    // Generate booking ID
                    const timestamp = Date.now().toString().slice(-6);
                    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    bookingData.bookingId = `JUM-${bookingData.resort.toUpperCase().slice(0, 3)}-${timestamp}${random}`;
                    
                    // Save to Firestore
                    const docRef = await db.collection('bookings').add(bookingData);
                    console.log('Booking saved with ID:', docRef.id);
                    
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
            }
        };
        
        // Make available globally
        window.BookingService = BookingService;
        window.firebaseDb = db;
        window.firebaseAuth = auth;
        
        return BookingService;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return null;
    }
};

// Only initialize if we're in a browser and Firebase is loaded
if (typeof window !== 'undefined') {
    // Expose globally
    window.FirebaseService = FirebaseService;
    window.initializeFirebase = initializeFirebase;
    window.initializeFirebaseSimple = initializeFirebaseSimple;
    
    // Wait for DOM to be ready and Firebase to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            // Don't auto-initialize - let main.js handle it
            console.log('firebase-config.js: DOM loaded, waiting for main.js to initialize Firebase');
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseService, initializeFirebase, firebaseConfig };
}