const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/firebase');
const router = express.Router();

// Generate JWT token
const generateToken = (adminId) => {
  return jwt.sign({ adminId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// @route   POST /api/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
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

    const { email, password } = req.body;

    // Find admin by email in Firestore
    const adminQuery = await db.collection('tickets').doc('admins').collection('users').where('email', '==', email).get();
    
    if (adminQuery.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const adminDoc = adminQuery.docs[0];
    const admin = adminDoc.data();

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(adminDoc.id);

    // Set session
    req.session.adminId = adminDoc.id;
    req.session.adminEmail = admin.email;
    req.session.adminName = admin.name;
    req.session.adminLoggedIn = true;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: adminDoc.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Admin logout
// @access  Private
router.post('/logout', (req, res) => {
  try {
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          success: false,
          message: 'Error during logout'
        });
      }
      
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current admin info
// @access  Private
router.get('/me', async (req, res) => {
  try {
    if (!req.session.adminLoggedIn) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const adminDoc = await db.collection('tickets').doc('admins').collection('users').doc(req.session.adminId).get();
    
    if (!adminDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const admin = adminDoc.data();

    res.json({
      success: true,
      admin: {
        id: adminDoc.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Get admin info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change admin password
// @access  Private
router.post('/change-password', [
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Current password must be at least 6 characters'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    if (!req.session.adminLoggedIn) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const adminDoc = await db.collection('tickets').doc('admins').collection('users').doc(req.session.adminId).get();
    
    if (!adminDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const admin = adminDoc.data();

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await adminDoc.ref.update({
      password: hashedPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
