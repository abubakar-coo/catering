const express = require('express');
const db = require('../config/firebase');
const { sendFinalTicketEmail, sendCancellationEmail } = require('../utils/email');
const router = express.Router();

// Middleware to check admin authentication
const requireAuth = (req, res, next) => {
  if (!req.session.adminLoggedIn) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Get orders from Firestore
    const ordersSnapshot = await db.collection('tickets').doc('orders').collection('tickets').get();
    const orders = [];
    
    ordersSnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    // Calculate statistics
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

    // Get contact messages
    const messagesSnapshot = await db.collection('tickets').doc('contacts').collection('messages').get();
    const totalContactMessages = messagesSnapshot.size;
    const unreadContactMessages = messagesSnapshot.docs.filter(doc => !doc.data().isRead).length;

    // Get recent orders (last 50)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50)
      .map(order => ({
        id: order.id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        ticketType: order.ticketType,
        quantity: order.quantity,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        isVerified: order.isVerified,
        createdAt: order.createdAt,
        formattedDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A'
      }));

    res.json({
      success: true,
      stats: {
        ...stats,
        totalContactMessages,
        unreadContactMessages
      },
      recentOrders
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders with pagination
// @access  Private
router.get('/orders', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const search = req.query.search;

    // Get all orders
    let ordersQuery = db.collection('tickets').doc('orders').collection('tickets');
    
    // Apply status filter
    if (status && status !== 'all') {
      ordersQuery = ordersQuery.where('status', '==', status);
    }

    const ordersSnapshot = await ordersQuery.get();
    let orders = [];
    
    ordersSnapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    // Apply search filter
    if (search) {
      orders = orders.filter(order => 
        order.orderId.toLowerCase().includes(search.toLowerCase()) ||
        order.customerName.toLowerCase().includes(search.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort by creation date
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const totalOrders = orders.length;
    const totalPages = Math.ceil(totalOrders / limit);
    const startIndex = (page - 1) * limit;
    const paginatedOrders = orders.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      orders: paginatedOrders.map(order => ({
        id: order.id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        ticketType: order.ticketType,
        quantity: order.quantity,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        isVerified: order.isVerified,
        createdAt: order.createdAt,
        formattedDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A'
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/orders/:id
// @desc    Get single order details
// @access  Private
router.get('/orders/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const orderDoc = await db.collection('tickets').doc('orders').collection('tickets').doc(id).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderDoc.data();

    res.json({
      success: true,
      order: {
        id: orderDoc.id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        ticketType: order.ticketType,
        quantity: order.quantity,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        isVerified: order.isVerified,
        verifiedAt: order.verifiedAt,
        qrCodeFilename: order.qrCodeFilename,
        finalTicketSent: order.finalTicketSent,
        cancellationEmailSent: order.cancellationEmailSent,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        formattedDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A'
      }
    });

  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/orders/:id/confirm
// @desc    Confirm order and send final ticket
// @access  Private
router.put('/orders/:id/confirm', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const orderRef = db.collection('tickets').doc('orders').collection('tickets').doc(id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderDoc.data();

    // Update order status
    await orderRef.update({
      status: 'confirmed',
      updatedAt: new Date()
    });

    // Send final ticket email
    try {
      await sendFinalTicketEmail({ ...order, id });
      await orderRef.update({
        finalTicketSent: true,
        updatedAt: new Date()
      });
    } catch (emailError) {
      console.error('Final ticket email error:', emailError);
      // Don't fail the confirmation if email fails
    }

    res.json({
      success: true,
      message: 'Order confirmed and final ticket sent',
      order: {
        orderId: order.orderId,
        status: 'confirmed',
        finalTicketSent: true
      }
    });

  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/orders/:id/cancel
// @desc    Cancel order and send cancellation email
// @access  Private
router.put('/orders/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const orderRef = db.collection('tickets').doc('orders').collection('tickets').doc(id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderDoc.data();

    // Update order status
    await orderRef.update({
      status: 'cancelled',
      updatedAt: new Date()
    });

    // Send cancellation email
    try {
      await sendCancellationEmail({ ...order, id });
      await orderRef.update({
        cancellationEmailSent: true,
        updatedAt: new Date()
      });
    } catch (emailError) {
      console.error('Cancellation email error:', emailError);
      // Don't fail the cancellation if email fails
    }

    res.json({
      success: true,
      message: 'Order cancelled and cancellation email sent',
      order: {
        orderId: order.orderId,
        status: 'cancelled',
        cancellationEmailSent: true
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/orders/:id/verify
// @desc    Mark order as verified (expire QR code)
// @access  Private
router.put('/orders/:id/verify', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const orderRef = db.collection('tickets').doc('orders').collection('tickets').doc(id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderDoc.data();

    if (order.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Order already verified'
      });
    }

    // Update order
    await orderRef.update({
      isVerified: true,
      verifiedAt: new Date(),
      status: 'verified',
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Order verified and QR code expired',
      order: {
        orderId: order.orderId,
        isVerified: true,
        verifiedAt: new Date(),
        status: 'verified'
      }
    });

  } catch (error) {
    console.error('Verify order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/contact-messages
// @desc    Get contact messages
// @access  Private
router.get('/contact-messages', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const unreadOnly = req.query.unread === 'true';

    // Get messages from Firestore
    let messagesQuery = db.collection('tickets').doc('contacts').collection('messages');
    
    if (unreadOnly) {
      messagesQuery = messagesQuery.where('isRead', '==', false);
    }

    const messagesSnapshot = await messagesQuery.orderBy('createdAt', 'desc').get();
    const messages = [];
    
    messagesSnapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    // Apply pagination
    const totalMessages = messages.length;
    const totalPages = Math.ceil(totalMessages / limit);
    const startIndex = (page - 1) * limit;
    const paginatedMessages = messages.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      messages: paginatedMessages.map(message => ({
        id: message.id,
        name: message.name,
        email: message.email,
        phone: message.phone,
        subject: message.subject,
        message: message.message,
        isRead: message.isRead,
        readAt: message.readAt,
        replied: message.replied,
        repliedAt: message.repliedAt,
        createdAt: message.createdAt,
        formattedDate: message.createdAt ? new Date(message.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A'
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalMessages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/contact-messages/:id/read
// @desc    Mark contact message as read
// @access  Private
router.put('/contact-messages/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const messageRef = db.collection('tickets').doc('contacts').collection('messages').doc(id);
    const messageDoc = await messageRef.get();
    
    if (!messageDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await messageRef.update({
      isRead: true,
      readAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
