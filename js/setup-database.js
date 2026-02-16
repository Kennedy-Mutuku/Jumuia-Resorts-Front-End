// Database setup script
// Run this once to create the database structure

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupDatabase() {
  console.log('Setting up Jumuia Resorts database...');

  // Create collections
  const collections = [
    'users',
    'properties',
    'bookings',
    'transactions',
    'feedback',
    'messages',
    'reports',
    'reconciliation',
    'activities',
    'offers'
  ];

  for (const collectionName of collections) {
    await createCollection(collectionName);
  }

  // Create sample users
  await createSampleUsers();
  
  // Create sample properties
  await createSampleProperties();
  
  // Create sample bookings
  await createSampleBookings();

  console.log('Database setup complete!');
}

async function createCollection(collectionName) {
  try {
    // Create a dummy document to ensure collection exists
    const docRef = db.collection(collectionName).doc('setup');
    await docRef.set({ _createdAt: new Date() });
    await docRef.delete();
    console.log(`Created collection: ${collectionName}`);
  } catch (error) {
    console.error(`Error creating collection ${collectionName}:`, error);
  }
}

async function createSampleUsers() {
  const users = [
    {
      email: 'general.manager@jumuiaresorts.com',
      name: 'General Manager',
      role: 'general-manager',
      properties: ['limuru', 'kanamai', 'kisumu'],
      permissions: ['all'],
      active: true,
      createdAt: new Date()
    },
    {
      email: 'limuru.manager@jumuiaresorts.com',
      name: 'Limuru Manager',
      role: 'manager',
      properties: ['limuru'],
      assignedProperty: 'limuru',
      permissions: ['manage_bookings', 'view_reports', 'manage_staff'],
      active: true,
      createdAt: new Date()
    },
    {
      email: 'kanamai.manager@jumuiaresorts.com',
      name: 'Kanamai Manager',
      role: 'manager',
      properties: ['kanamai'],
      assignedProperty: 'kanamai',
      permissions: ['manage_bookings', 'view_reports', 'manage_staff'],
      active: true,
      createdAt: new Date()
    },
    {
      email: 'kisumu.manager@jumuiaresorts.com',
      name: 'Kisumu Manager',
      role: 'manager',
      properties: ['kisumu'],
      assignedProperty: 'kisumu',
      permissions: ['manage_bookings', 'view_reports', 'manage_staff'],
      active: true,
      createdAt: new Date()
    },
    {
      email: 'limuru.staff@jumuiaresorts.com',
      name: 'Limuru Reception',
      role: 'staff',
      properties: ['limuru'],
      assignedProperty: 'limuru',
      permissions: ['view_bookings', 'manage_checkins', 'respond_messages'],
      active: true,
      createdAt: new Date()
    }
  ];

  for (const user of users) {
    try {
      // Create Firebase Auth user
      const authUser = await admin.auth().createUser({
        email: user.email,
        password: 'Jumuia@2024',
        displayName: user.name,
        disabled: false
      });

      // Save user data to Firestore
      await db.collection('users').doc(authUser.uid).set({
        ...user,
        uid: authUser.uid,
        updatedAt: new Date()
      });

      console.log(`Created user: ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`Error creating user ${user.email}:`, error);
    }
  }
}

async function createSampleProperties() {
  const properties = [
    {
      id: 'limuru',
      name: 'Limuru Country Home',
      type: 'country_home',
      location: 'Limuru, Kenya',
      description: 'A serene country home retreat in the cool highlands',
      rooms: 25,
      amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Conference'],
      contact: {
        phone: '+254 20 123 4567',
        email: 'limuru@jumuiaresorts.com'
      },
      rates: {
        standard: 15000,
        deluxe: 22000,
        suite: 35000
      },
      active: true,
      createdAt: new Date()
    },
    {
      id: 'kanamai',
      name: 'Kanamai Beach Resort',
      type: 'beach_resort',
      location: 'Mombasa, Kenya',
      description: 'Luxury beach resort with stunning ocean views',
      rooms: 40,
      amenities: ['WiFi', 'Pool', 'Beach', 'Spa', 'Restaurant', 'Bar'],
      contact: {
        phone: '+254 41 123 4567',
        email: 'kanamai@jumuiaresorts.com'
      },
      rates: {
        standard: 18000,
        deluxe: 25000,
        suite: 40000
      },
      active: true,
      createdAt: new Date()
    },
    {
      id: 'kisumu',
      name: 'Kisumu Hotel',
      type: 'city_hotel',
      location: 'Kisumu, Kenya',
      description: 'Modern hotel in the heart of Kisumu city',
      rooms: 35,
      amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Bar', 'Conference'],
      contact: {
        phone: '+254 57 123 4567',
        email: 'kisumu@jumuiaresorts.com'
      },
      rates: {
        standard: 12000,
        deluxe: 18000,
        suite: 28000
      },
      active: true,
      createdAt: new Date()
    }
  ];

  for (const property of properties) {
    try {
      await db.collection('properties').doc(property.id).set(property);
      console.log(`Created property: ${property.name}`);
    } catch (error) {
      console.error(`Error creating property ${property.name}:`, error);
    }
  }
}

async function createSampleBookings() {
  const bookings = [
    {
      bookingId: 'JUM-2024-001',
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      guestPhone: '+254712345678',
      property: 'limuru',
      roomType: 'deluxe',
      guests: 2,
      checkInDate: new Date('2024-01-15'),
      checkOutDate: new Date('2024-01-18'),
      nights: 3,
      totalAmount: 66000,
      status: 'confirmed',
      paymentStatus: 'paid',
      createdAt: new Date()
    },
    {
      bookingId: 'JUM-2024-002',
      guestName: 'Jane Smith',
      guestEmail: 'jane@example.com',
      guestPhone: '+254712345679',
      property: 'kanamai',
      roomType: 'suite',
      guests: 4,
      checkInDate: new Date('2024-01-20'),
      checkOutDate: new Date('2024-01-25'),
      nights: 5,
      totalAmount: 200000,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date()
    }
  ];

  for (const booking of bookings) {
    try {
      await db.collection('bookings').add(booking);
      console.log(`Created booking: ${booking.bookingId}`);
    } catch (error) {
      console.error(`Error creating booking ${booking.bookingId}:`, error);
    }
  }
}

setupDatabase().catch(console.error);