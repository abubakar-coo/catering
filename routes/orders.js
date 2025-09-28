const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/firebase');
const { generateQRCode, sendOrderConfirmationEmail, sendFinalTicketEmail, sendCancellationEmail } = require('../utils/email');
const router = express.Router();

// Generate unique order ID
const generateOrderId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `OUW${timestamp}${random}`;
};

// Order validation rules
const orderValidation = [
  body('customerName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Customer name must be between 2 and 50 characters'),
  body('customerEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('customerPhone')
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Please provide a valid phone number'),
  body('ticketType')
    .isIn(['regular', 'vip', 'premium'])
    .withMessage('Invalid ticket type'),
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'online'])
    .withMessage('Invalid payment method')
];

// Contact message validation
const contactValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Subject must be between 5 and 100 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
];

// @route   POST /api/orders/create
// @desc    Create new order
// @access  Public
router.post('/create', orderValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { customerName, customerEmail, customerPhone, ticketType, quantity, paymentMethod, notes } = req.body;

    // Calculate amount based on ticket type and quantity
    const ticketPrices = {
      regular: 50,
      vip: 100,
      premium: 150
    };

    const amount = ticketPrices[ticketType] * quantity;

    // Generate order ID
    const orderId = generateOrderId();

    // Create order data
    const orderData = {
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      ticketType,
      quantity,
      amount,
      paymentMethod,
      status: 'pending',
      isVerified: false,
      verifiedAt: null,
      qrCodeFilename: null,
      qrCodeData: null,
      finalTicketSent: false,
      cancellationEmailSent: false,
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save order to Firestore
    const orderRef = await db.collection('tickets').doc('orders').collection('tickets').add(orderData);

    // Generate QR code
    const qrCodeData = `http://192.168.18.40:5000/admin/dashboard?scan=${orderId}`;
    const qrCodeFilename = await generateQRCode(orderId, qrCodeData);

    // Update order with QR code info
    await orderRef.update({
      qrCodeFilename,
      qrCodeData,
      updatedAt: new Date()
    });

    // Get updated order data
    const updatedOrder = await orderRef.get();
    const order = updatedOrder.data();

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail({ ...order, id: orderRef.id });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the order creation if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: orderRef.id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        ticketType: order.ticketType,
        quantity: order.quantity,
        amount: order.amount,
        status: order.status,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order'
    });
  }
});

// @route   GET /api/orders/:orderId
// @desc    Get order by ID
// @access  Public
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderQuery = await db.collection('tickets').doc('orders').collection('tickets').where('orderId', '==', orderId).get();
    
    if (orderQuery.empty) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderDoc = orderQuery.docs[0];
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
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/orders/contact
// @desc    Submit contact message
// @access  Public
router.post('/contact', contactValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, phone, subject, message } = req.body;

    // Create contact message data
    const messageData = {
      name,
      email,
      phone: phone || '',
      subject,
      message,
      isRead: false,
      readAt: null,
      replied: false,
      repliedAt: null,
      replyMessage: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Firestore
    const messageRef = await db.collection('tickets').doc('contacts').collection('messages').add(messageData);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      messageId: messageRef.id
    });

  } catch (error) {
    console.error('Contact message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
});

// @route   GET /api/orders/verify/:orderId
// @desc    Verify order for QR scanning
// @access  Public
router.get('/verify/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderQuery = await db.collection('tickets').doc('orders').collection('tickets').where('orderId', '==', orderId).get();
    
    if (orderQuery.empty) {
      return res.json({
        success: false,
        valid: false,
        message: 'Order not found'
      });
    }

    const orderDoc = orderQuery.docs[0];
    const order = orderDoc.data();

    // Check if order is expired
    const isExpired = order.isVerified || order.status === 'cancelled';

    if (isExpired) {
      let message = 'QR code expired';
      if (order.isVerified) {
        message = 'QR code already used';
      } else if (order.status === 'cancelled') {
        message = 'Order cancelled';
      }

      return res.json({
        success: false,
        valid: false,
        message,
        order: {
          orderId: order.orderId,
          status: order.status,
          isVerified: order.isVerified
        }
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Order found',
      order: {
        orderId: order.orderId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        ticketType: order.ticketType,
        quantity: order.quantity,
        amount: order.amount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        isVerified: order.isVerified
      }
    });

  } catch (error) {
    console.error('Verify order error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
