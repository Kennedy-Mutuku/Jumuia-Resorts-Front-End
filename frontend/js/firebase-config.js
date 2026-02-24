// js/firebase-config.js - Centralized Firebase Initialization
// This file ensures Firebase is initialized only once and accessible globally

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

// Global Firebase instances - will be set after initialization
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let firebaseAnalytics = null;
let isInitializing = false;
let initPromise = null;

// Check if Firebase is already initialized
function isFirebaseInitialized() {
    return firebaseDb !== null && typeof firebase !== 'undefined';
}

// Initialize Firebase with modular SDK
async function initializeFirebase() {
    if (isInitializing) {
        return initPromise;
    }
    
    if (isFirebaseInitialized()) {
        console.log('Firebase already initialized');
        return getFirebaseServices();
    }
    
    isInitializing = true;
    initPromise = (async () => {
        try {
            // Check if Firebase is already loaded globally (from main.js)
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                console.log('Firebase already loaded globally');
                firebaseApp = firebase.app();
                firebaseAuth = firebase.auth();
                firebaseDb = firebase.firestore();
                firebaseStorage = firebase.storage();
                
                if (firebase.analytics) {
                    firebaseAnalytics = firebase.analytics();
                }
                
                isInitializing = false;
                return getFirebaseServices();
            }
            
            // Dynamically load Firebase scripts if not already loaded
            if (typeof firebase === 'undefined') {
                console.log('Loading Firebase scripts dynamically...');
                await loadFirebaseScriptsDynamically();
            }
            
            // Initialize Firebase
            firebaseApp = firebase.initializeApp(firebaseConfig);
            firebaseAuth = firebase.auth();
            firebaseDb = firebase.firestore();
            firebaseStorage = firebase.storage();
            
            // Initialize analytics if available
            if (firebase.analytics) {
                firebaseAnalytics = firebase.analytics();
            }
            
            // Configure Firestore
            firebaseDb.settings({
                timestampsInSnapshots: true
            });
            
            // Enable offline persistence
            firebaseDb.enablePersistence()
                .catch((err) => {
                    if (err.code == 'failed-precondition') {
                        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                    } else if (err.code == 'unimplemented') {
                        console.warn('The current browser doesn\'t support persistence.');
                    }
                });
            
            console.log('Firebase initialized successfully via config module');
            
            // Store references globally
            window.firebaseApp = firebaseApp;
            window.firebaseAuth = firebaseAuth;
            window.firebaseDb = firebaseDb;
            
            return getFirebaseServices();
            
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            
            // If Firebase already initialized, use existing instance
            if (error.code === 'app/duplicate-app') {
                console.log('Firebase app already exists, using existing instance');
                firebaseApp = firebase.app();
                firebaseAuth = firebase.auth();
                firebaseDb = firebase.firestore();
                firebaseStorage = firebase.storage();
                
                if (firebase.analytics) {
                    firebaseAnalytics = firebase.analytics();
                }
                
                isInitializing = false;
                return getFirebaseServices();
            }
            
            isInitializing = false;
            initPromise = null;
            throw error;
        }
    })();
    
    return initPromise;
}

// Load Firebase scripts dynamically
async function loadFirebaseScriptsDynamically() {
    return new Promise((resolve, reject) => {
        const scripts = [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'
        ];
        
        let loadedCount = 0;
        
        function loadScript(index) {
            if (index >= scripts.length) {
                console.log('All Firebase scripts loaded');
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = scripts[index];
            script.async = true;
            
            script.onload = () => {
                loadedCount++;
                console.log(`Loaded: ${scripts[index]}`);
                loadScript(index + 1);
            };
            
            script.onerror = (error) => {
                console.error(`Failed to load: ${scripts[index]}`, error);
                // Continue loading other scripts
                loadedCount++;
                loadScript(index + 1);
            };
            
            document.head.appendChild(script);
        }
        
        loadScript(0);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (loadedCount < scripts.length) {
                console.warn('Firebase scripts loading timeout');
                resolve(); // Resolve anyway to prevent hanging
            }
        }, 10000);
    });
}

// Get initialized Firebase services
function getFirebaseServices() {
    if (!firebaseDb) {
        console.warn('Firebase not initialized yet');
        return null;
    }
    
    return {
        app: firebaseApp,
        auth: firebaseAuth,
        db: firebaseDb,
        storage: firebaseStorage,
        analytics: firebaseAnalytics,
        config: firebaseConfig,
        isInitialized: true
    };
}

// Authentication helper functions
const AuthService = {
    async getCurrentUser() {
        if (!firebaseAuth) {
            await initializeFirebase();
        }
        return firebaseAuth.currentUser;
    },

    async requireAuth(redirectUrl = '../index.html') {
        const user = await this.getCurrentUser();
        if (!user) {
            window.location.href = redirectUrl;
            return null;
        }
        return user;
    },

    async signOut(redirectUrl = '../index.html') {
        try {
            if (firebaseAuth) {
                await firebaseAuth.signOut();
            }
            localStorage.removeItem('jumuiaAdminUser');
            sessionStorage.removeItem('jumuiaAdminSession');
            
            if (redirectUrl) {
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1000);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        }
    }
};

// Database helper functions
const DatabaseService = {
    async getAdminData(userId) {
        if (!firebaseDb) {
            await initializeFirebase();
        }
        
        try {
            const adminDoc = await firebaseDb.collection("admins").doc(userId).get();
            
            if (!adminDoc.exists) {
                throw new Error('Admin not found in database');
            }
            
            return adminDoc.data();
        } catch (error) {
            console.error('Error getting admin data:', error);
            throw error;
        }
    },
    
    async saveDocument(collection, data, id = null) {
        if (!firebaseDb) {
            await initializeFirebase();
        }
        
        try {
            if (id) {
                await firebaseDb.collection(collection).doc(id).set(data, { merge: true });
                return { success: true, id: id };
            } else {
                const docRef = await firebaseDb.collection(collection).add(data);
                return { success: true, id: docRef.id };
            }
        } catch (error) {
            console.error('Error saving document:', error);
            return { success: false, error: error.message };
        }
    },
    
    async getDocuments(collection, conditions = null, limit = 100) {
        if (!firebaseDb) {
            await initializeFirebase();
        }
        
        try {
            let query = firebaseDb.collection(collection);
            
            if (conditions) {
                conditions.forEach(condition => {
                    query = query.where(condition.field, condition.operator, condition.value);
                });
            }
            
            query = query.limit(limit);
            const snapshot = await query.get();
            
            const documents = [];
            snapshot.forEach(doc => {
                documents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return { success: true, documents: documents };
        } catch (error) {
            console.error('Error getting documents:', error);
            return { success: false, error: error.message, documents: [] };
        }
    }
};

// Session management
const SessionService = {
    saveSession(userData) {
        const sessionData = {
            ...userData,
            loginTime: new Date().toISOString(),
            expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
        localStorage.setItem('jumuiaAdminUser', JSON.stringify(sessionData));
        sessionStorage.setItem('jumuiaAdminSession', 'active');
    },

    getSession() {
        const session = localStorage.getItem('jumuiaAdminUser');
        return session ? JSON.parse(session) : null;
    },

    clearSession() {
        localStorage.removeItem('jumuiaAdminUser');
        sessionStorage.removeItem('jumuiaAdminSession');
    },

    isValidSession() {
        const session = this.getSession();
        if (!session || !session.loginTime || !session.expiryTime) return false;
        
        const expiryTime = new Date(session.expiryTime);
        const currentTime = new Date();
        
        return currentTime < expiryTime;
    },
    
    getSessionUser() {
        const session = this.getSession();
        return session ? {
            email: session.email,
            name: session.name,
            role: session.role
        } : null;
    }
};

// Global exports - check if already exists to prevent re-declaration
if (!window.FirebaseService) {
    window.FirebaseService = {
        initialize: initializeFirebase,
        getServices: getFirebaseServices,
        isInitialized: isFirebaseInitialized,
        config: firebaseConfig,
        auth: AuthService,
        db: DatabaseService,
        session: SessionService
    };
}

// Export functions for modular use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeFirebase,
        getFirebaseServices,
        isFirebaseInitialized,
        AuthService,
        DatabaseService,
        SessionService,
        firebaseConfig
    };
}

console.log('Firebase configuration module loaded');

// Auto-initialize if on admin pages
if (window.location.pathname.includes('/admin/')) {
    console.log('Auto-initializing Firebase for admin pages');
    initializeFirebase().then(() => {
        console.log('Firebase auto-initialized for admin');
    }).catch(error => {
        console.error('Auto-initialization failed:', error);
    });
}