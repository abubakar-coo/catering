const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
});

// Get Firestore instance
const db = admin.firestore();

// Export Firestore instance
module.exports = db;
