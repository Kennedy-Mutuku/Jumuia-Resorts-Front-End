// setup-admin-users.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupAdminUsers() {
  console.log('Setting up admin users...');

  const adminUsers = [
    {
      uid: 'auto-generated', // Will be replaced with actual UID
      email: 'general.manager@jumuiaresorts.com',
      name: 'General Manager',
      role: 'general-manager',
      properties: ['limuru', 'kanamai', 'kisumu'],
      permissions: ['all'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      uid: 'auto-generated',
      email: 'limuru.manager@jumuiaresorts.com',
      name: 'Limuru Manager',
      role: 'manager',
      properties: ['limuru'],
      assignedProperty: 'limuru',
      permissions: ['manage_bookings', 'view_reports'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      uid: 'auto-generated',
      email: 'kanamai.manager@jumuiaresorts.com',
      name: 'Kanamai Manager',
      role: 'manager',
      properties: ['kanamai'],
      assignedProperty: 'kanamai',
      permissions: ['manage_bookings', 'view_reports'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      uid: 'auto-generated',
      email: 'kisumu.manager@jumuiaresorts.com',
      name: 'Kisumu Manager',
      role: 'manager',
      properties: ['kisumu'],
      assignedProperty: 'kisumu',
      permissions: ['manage_bookings', 'view_reports'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      uid: 'auto-generated',
      email: 'limuru.staff@jumuiaresorts.com',
      name: 'Limuru Staff',
      role: 'staff',
      properties: ['limuru'],
      assignedProperty: 'limuru',
      permissions: ['view_bookings', 'manage_checkins'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const user of adminUsers) {
    try {
      // Create Firebase Auth user
      const authUser = await admin.auth().createUser({
        email: user.email,
        password: 'Jumuia@2024',
        displayName: user.name,
        emailVerified: true,
        disabled: false
      });

      // Update UID
      user.uid = authUser.uid;

      // Save to users collection
      await db.collection('users').doc(authUser.uid).set(user);
      
      // Also save to admins collection for backward compatibility
      await db.collection('admins').doc(authUser.uid).set(user);

      console.log(`✓ Created user: ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`✗ Error creating user ${user.email}:`, error.message);
    }
  }

  console.log('Admin users setup complete!');
}

setupAdminUsers().catch(console.error);