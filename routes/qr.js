const express = require('express');
const db = require('../config/firebase');
const router = express.Router();

// @route   GET /api/qr/verify/:orderId
// @desc    Verify QR code for scanning
// @access  Public
router.get('/verify/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderQuery = await db.collection('tickets').doc('orders').collection('tickets').where('orderId', '==', orderId).get();
    
    if (orderQuery.empty) {
      return res.json({
        success: false,
        valid: false,
        message: 'Order not found',
        orderId
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
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          ticketType: order.ticketType,
          quantity: order.quantity,
          amount: order.amount,
          paymentMethod: order.paymentMethod,
          status: order.status,
          isVerified: order.isVerified,
          verifiedAt: order.verifiedAt
        }
      });
    }

    // Check if order is confirmed
    if (order.status !== 'confirmed') {
      return res.json({
        success: false,
        valid: false,
        message: 'Order not confirmed yet',
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
    }

    // Order is valid for verification
    res.json({
      success: true,
      valid: true,
      message: 'Order found and ready for verification',
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
    console.error('QR verification error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Server error during verification'
    });
  }
});

// @route   POST /api/qr/scan
// @desc    Process QR code scan
// @access  Public
router.post('/scan', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const orderQuery = await db.collection('tickets').doc('orders').collection('tickets').where('orderId', '==', orderId).get();
    
    if (orderQuery.empty) {
      return res.json({
        success: false,
        valid: false,
        message: 'Order not found',
        orderId
      });
    }

    const orderDoc = orderQuery.docs[0];
    const order = orderDoc.data();

    // Check if order is expired
    const isExpired = order.isVerified || order.status === 'cancelled';

    if (isExpired) {
      let message = 'QR code expired';
      let alertType = 'warning';
      
      if (order.isVerified) {
        message = 'QR code already used - Entry denied';
        alertType = 'danger';
      } else if (order.status === 'cancelled') {
        message = 'Order cancelled - Entry denied';
        alertType = 'danger';
      }

      return res.json({
        success: false,
        valid: false,
        message,
        alertType,
        order: {
          orderId: order.orderId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          ticketType: order.ticketType,
          quantity: order.quantity,
          amount: order.amount,
          paymentMethod: order.paymentMethod,
          status: order.status,
          isVerified: order.isVerified,
          verifiedAt: order.verifiedAt
        }
      });
    }

    // Check if order is confirmed
    if (order.status !== 'confirmed') {
      return res.json({
        success: false,
        valid: false,
        message: 'Order not confirmed - Entry denied',
        alertType: 'warning',
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
    }

    // Order is valid for verification
    res.json({
      success: true,
      valid: true,
      message: 'Order verified - Entry allowed',
      alertType: 'success',
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
    console.error('QR scan error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: 'Server error during scan'
    });
  }
});

module.exports = router;
