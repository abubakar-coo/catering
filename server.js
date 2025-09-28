const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const db = require('./config/firebase');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static files
app.use(express.static('public'));
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/images', express.static('images'));
app.use('/fonts', express.static('fonts'));
app.use('/revolution', express.static('revolution'));

// Create necessary directories
const createDirectories = () => {
  const dirs = [
    'static/qr_codes',
    'static/uploads',
    'public'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/qr', require('./routes/qr'));

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tickets.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'tickets.html'));
});

app.get('/checkout.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'checkout.html'));
});

app.get('/contact-us.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'contact-us.html'));
});

app.get('/order-confirmation.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'order-confirmation.html'));
});

// Admin routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/admin_login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/admin_dashboard.html'));
});

app.get('/admin/order/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates/admin_order_detail.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    createDirectories();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🌐 Server accessible on http://192.168.18.40:${PORT}`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/admin/dashboard`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
