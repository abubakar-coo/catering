# Catering Website - Simple Node.js Server

A simple static website server built with Node.js and Express.

## 🚀 Features

- ✅ **Static File Serving** - Serves HTML, CSS, JS, and images
- ✅ **No Database Required** - Simple file-based website
- ✅ **CORS Enabled** - Cross-origin requests supported
- ✅ **Performance Optimized** - Caching headers for static assets
- ✅ **Mock API Endpoints** - Form submissions return mock responses

## 📁 Project Structure

```
catering/
├── server.js          # Main Node.js server
├── package.json       # Dependencies and scripts
├── index.html         # Main homepage
├── tickets.html       # Tickets page
├── checkout.html      # Checkout page
├── contact-us.html    # Contact page
├── css/              # Stylesheets
├── js/               # JavaScript files
├── images/           # Images and assets
└── README.md         # This file
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the website:**
   - Main site: http://localhost:5000
   - Tickets: http://localhost:5000/tickets.html
   - Checkout: http://localhost:5000/checkout.html
   - Contact: http://localhost:5000/contact-us.html

## 🔧 Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start the server (same as start)

## 📡 API Endpoints

All API endpoints return mock responses:

- `POST /submit_order` - Order submission (mock)
- `POST /submit_contact` - Contact form (mock)
- `GET /admin` - Admin page
- `POST /admin/login` - Admin login (mock)
- `GET /admin/dashboard` - Admin dashboard (mock)

## 🌐 Server Information

- **Port:** 5000
- **Host:** 0.0.0.0 (accessible from all network interfaces)
- **Static Files:** Served from current directory
- **Caching:** 1 hour for static assets

## 📝 Notes

- This is a simple static file server
- No database is required
- All form submissions return mock responses
- Perfect for development and testing
- Easy to deploy on any Node.js hosting service

## 🚀 Deployment

To deploy this website:

1. Upload all files to your server
2. Run `npm install` on the server
3. Run `npm start` to start the server
4. Configure your web server to proxy requests to port 5000

## 📞 Support

For any issues or questions, please contact the development team.