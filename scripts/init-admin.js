const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
});

const db = admin.firestore();

const initAdmin = async () => {
  try {
    console.log('🚀 Initializing Admin User in Firestore...\n');

    // Check if admin already exists
    const adminQuery = await db.collection('tickets').doc('admins').collection('users').where('email', '==', process.env.ADMIN_EMAIL || 'admin@catering.com').get();
    
    if (!adminQuery.empty) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', salt);

    // Create admin user
    const adminData = {
      email: process.env.ADMIN_EMAIL || 'admin@catering.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'super_admin',
      isActive: true,
      lastLogin: null,
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('tickets').doc('admins').collection('users').add(adminData);
    
    console.log('✅ Admin user created successfully');
    console.log(`📧 Email: ${process.env.ADMIN_EMAIL || 'admin@catering.com'}`);
    console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log('\n🎉 Admin initialization completed!');

  } catch (error) {
    console.error('❌ Error initializing admin:', error);
  } finally {
    admin.app().delete();
  }
};

initAdmin();
