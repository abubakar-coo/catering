const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
});

const db = admin.firestore();

async function testFirebase() {
  try {
    console.log('🧪 Testing Firebase Firestore System...\n');

    // Test 1: Create Test Order
    console.log('1. Creating test order...');
    const testOrderData = {
      orderId: 'TEST' + Date.now(),
      customerName: 'Test Customer',
      customerEmail: 'test@example.com',
      customerPhone: '1234567890',
      ticketType: 'vip',
      quantity: 2,
      amount: 200,
      paymentMethod: 'card',
      status: 'pending',
      isVerified: false,
      verifiedAt: null,
      qrCodeFilename: null,
      qrCodeData: null,
      finalTicketSent: false,
      cancellationEmailSent: false,
      notes: 'Test order',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const orderRef = await db.collection('tickets').doc('orders').collection('tickets').add(testOrderData);
    console.log('✅ Test order created:', orderRef.id);

    // Test 2: Create Test Admin
    console.log('\n2. Testing admin creation...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('test123', salt);
    
    const testAdminData = {
      email: 'test@admin.com',
      password: hashedPassword,
      name: 'Test Admin',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const adminRef = await db.collection('tickets').doc('admins').collection('users').add(testAdminData);
    console.log('✅ Test admin created:', adminRef.id);

    // Test 3: Create Test Contact Message
    console.log('\n3. Creating test contact message...');
    const testMessageData = {
      name: 'Test User',
      email: 'test@user.com',
      subject: 'Test Message',
      message: 'This is a test message',
      isRead: false,
      readAt: null,
      replied: false,
      repliedAt: null,
      replyMessage: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const messageRef = await db.collection('tickets').doc('contacts').collection('messages').add(testMessageData);
    console.log('✅ Test contact message created:', messageRef.id);

    // Test 4: Test Order Status Updates
    console.log('\n4. Testing order status updates...');
    await orderRef.update({
      status: 'confirmed',
      updatedAt: new Date()
    });
    console.log('✅ Order status updated to confirmed');

    await orderRef.update({
      isVerified: true,
      verifiedAt: new Date(),
      status: 'verified',
      updatedAt: new Date()
    });
    console.log('✅ Order marked as verified');

    // Test 5: Test Statistics
    console.log('\n5. Testing statistics...');
    const ordersSnapshot = await db.collection('tickets').doc('orders').collection('tickets').get();
    const orders = [];
    ordersSnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(order => order.status === 'pending').length,
      confirmedOrders: orders.filter(order => order.status === 'confirmed').length,
      verifiedOrders: orders.filter(order => order.status === 'verified').length,
      cancelledOrders: orders.filter(order => order.status === 'cancelled').length,
      totalRevenue: orders
        .filter(order => ['confirmed', 'verified'].includes(order.status))
        .reduce((sum, order) => sum + order.amount, 0),
      totalTicketsSold: orders
        .filter(order => ['confirmed', 'verified'].includes(order.status))
        .reduce((sum, order) => sum + order.quantity, 0)
    };

    console.log('✅ Statistics calculated:', stats);

    // Cleanup
    console.log('\n6. Cleaning up test data...');
    await orderRef.delete();
    await adminRef.delete();
    await messageRef.delete();
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All Firebase tests passed successfully!');
    console.log('\nYour Firebase system is ready to use!');
    console.log('\nTo start the server, run: npm start');
    console.log('Admin dashboard: http://localhost:5000/admin/dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nPlease check your Firebase configuration and try again.');
  } finally {
    admin.app().delete();
  }
}

testFirebase();
