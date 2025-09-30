const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const multer = require('multer');

// In-memory storage for orders and messages
let orders = [];
let contactMessages = [];
const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        cb(null, timestamp + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'orbi.pk.mail@gmail.com',
        pass: 'baqc rfmi swxh noxv'
    }
});

// Serve static files from current directory
app.use(express.static('.'));

// CORS headers for all requests
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    
    // Performance optimizations
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    }
    
    next();
});

// Main routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tickets.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'tickets.html'));
});

app.get('/checkout.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout.html'));
});

app.get('/order-confirmation.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'order-confirmation.html'));
});

app.get('/contact-us.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact-us.html'));
});

// API routes for form submissions with email functionality
app.post('/submit_order', upload.single('paymentSS'), (req, res) => {
    console.log('=== ORDER SUBMISSION RECEIVED ===');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    // Get form data
    const {
        fullName,
        phone,
        email,
        dob,
        address,
        requirements,
        eventParticipation,
        activities,
        activityDescription,
        paymentMethod,
        transactionId,
        ticketInfo
    } = req.body;
    
    console.log('Extracted form data:');
    console.log('- fullName:', fullName);
    console.log('- email:', email);
    console.log('- phone:', phone);
    console.log('- ticketInfo:', ticketInfo);
    
    // Parse ticket info from localStorage
    let ticketData = {};
    try {
        ticketData = JSON.parse(ticketInfo);
        console.log('Parsed ticket data:', ticketData);
    } catch (e) {
        console.log('Error parsing ticket info:', e);
        console.log('Raw ticketInfo:', ticketInfo);
    }
    
    // Generate order ID
    const orderId = 'OUW' + Date.now();
    
    // Store order data for admin panel
    const orderData = {
        id: orders.length + 1,
        orderId: orderId,
        customerName: fullName,
        email: email,
        phone: phone,
        address: address,
        dob: dob,
        requirements: requirements,
        eventParticipation: eventParticipation,
        activities: activities,
        activityDescription: activityDescription,
        paymentMethod: paymentMethod,
        transactionId: transactionId,
        ticketType: ticketData.type === 'vip' ? 'VIP' : (ticketData.type === 'simple' ? 'Simple' : 'VIP'),
        quantity: ticketData.quantity || 1,
        totalAmount: ticketData.total || 0,
        status: 'pending',
        date: new Date().toLocaleDateString(),
        paymentScreenshot: req.file ? req.file.filename : null
    };
    
    orders.push(orderData);
    console.log('=== ORDER STORED SUCCESSFULLY ===');
    console.log('Complete order data:', JSON.stringify(orderData, null, 2));
    console.log('Total orders now:', orders.length);
    console.log('Orders array:', orders);
    
    // Prepare email content
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #fa3131 0%, #ff6b6b 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .highlight { color: #fa3131; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Order Confirmation</h1>
                <p>Thank you for your purchase!</p>
            </div>
            
            <div class="content">
                <h2>Order Details</h2>
                <div class="order-details">
                    <p><strong>Order ID:</strong> <span class="highlight">${orderId}</span></p>
                    <p><strong>Customer Name:</strong> ${fullName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <p><strong>Date of Birth:</strong> ${dob}</p>
                    <p><strong>Event Participation:</strong> ${eventParticipation}</p>
                    ${activities ? `<p><strong>Selected Activities:</strong> ${activities}</p>` : ''}
                    ${activityDescription ? `<p><strong>Activity Description:</strong> ${activityDescription}</p>` : ''}
                    <p><strong>Ticket Type:</strong> ${ticketData.type === 'vip' ? 'VIP' : (ticketData.type === 'simple' ? 'Simple' : 'N/A')}</p>
                    <p><strong>Quantity:</strong> ${ticketData.quantity || 1}</p>
                    <p><strong>Price per Ticket:</strong> Rs. ${ticketData.pricePerTicket ? ticketData.pricePerTicket.toLocaleString() : '0'}</p>
                    <p><strong>Total Amount:</strong> <span class="highlight">Rs. ${ticketData.total ? ticketData.total.toLocaleString() : '0'}</span></p>
                    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                    <p><strong>Order Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <h3>Next Steps</h3>
                <p>Your order has been received and is being processed. You will receive another email once your order is confirmed by our team.</p>
                
                <p>If you have any questions, please contact us at <strong>orbi.pk.mail@gmail.com</strong></p>
                
                <div class="footer">
                    <p>Thank you for choosing Once Upon a Wedding! 🎭</p>
                    <p>This is an automated email. Please do not reply to this email.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // Send email
    const mailOptions = {
        from: 'orbi.pk.mail@gmail.com',
        to: email,
        subject: `Order Confirmation - ${orderId}`,
        html: emailHtml,
        attachments: []
    };
    
    // Add payment screenshot if uploaded
    if (req.file) {
        mailOptions.attachments.push({
            filename: req.file.originalname,
            path: req.file.path,
            cid: 'payment_screenshot'
        });
    }
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending email:', error);
            res.json({
                success: false,
                message: 'Order received but email failed to send',
                order_id: orderId
            });
        } else {
            console.log('Email sent successfully:', info.response);
            res.json({
                success: true,
                message: 'Order submitted successfully! Confirmation email sent.',
                order_id: orderId,
                email_sent: true
            });
        }
    });
});

app.post('/submit_contact', (req, res) => {
    console.log('Contact form submission received');
    
    const { name, phone, email, message } = req.body;
    
    // Store contact message for admin panel
    const messageData = {
        id: contactMessages.length + 1,
        name: name,
        email: email,
        phone: phone,
        message: message,
        status: 'unread',
        replied: false,
        date: new Date().toLocaleDateString()
    };
    
    contactMessages.push(messageData);
    console.log('Contact message stored:', messageData);
    
    // Send email to admin
    const adminEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #fa3131 0%, #ff6b6b 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .message-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 New Contact Message</h1>
                <p>Someone contacted you through the website</p>
            </div>
            
            <div class="content">
                <div class="message-details">
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <p><strong>Message:</strong></p>
                    <p style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #fa3131;">${message}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    const adminMailOptions = {
        from: 'orbi.pk.mail@gmail.com',
        to: 'orbi.pk.mail@gmail.com',
        subject: `New Contact Message from ${name}`,
        html: adminEmailHtml
    };
    
    // Send confirmation email to customer
    const customerEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #fa3131 0%, #ff6b6b 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Message Received</h1>
                <p>Thank you for contacting us!</p>
            </div>
            
            <div class="content">
                <p>Dear ${name},</p>
                <p>We have received your message and will get back to you soon.</p>
                <p>Thank you for your interest in Once Upon a Wedding!</p>
                <p>Best regards,<br>Once Upon a Wedding Team</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    const customerMailOptions = {
        from: 'orbi.pk.mail@gmail.com',
        to: email,
        subject: 'Message Received - Once Upon a Wedding',
        html: customerEmailHtml
    };
    
    // Send both emails
    transporter.sendMail(adminMailOptions, (error, info) => {
        if (error) {
            console.log('Error sending admin email:', error);
        } else {
            console.log('Admin email sent successfully');
        }
    });
    
    transporter.sendMail(customerMailOptions, (error, info) => {
        if (error) {
            console.log('Error sending customer email:', error);
            res.json({
                success: false,
                message: 'Message received but confirmation email failed to send'
            });
        } else {
            console.log('Customer email sent successfully');
            res.json({
                success: true,
                message: 'Message sent successfully! Confirmation email sent.'
            });
        }
    });
});

// Admin routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin/orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-orders.html'));
});

app.get('/admin/messages', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-messages.html'));
});

app.get('/admin/order-detail', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-order-detail.html'));
});

app.get('/admin/message-detail', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-message-detail.html'));
});

app.post('/admin/login', (req, res) => {
    res.json({
        success: true,
        message: 'Login successful! (Mock Response)'
    });
});

// API endpoints for admin panel data
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

app.get('/api/messages', (req, res) => {
    res.json(contactMessages);
});

app.put('/api/orders/:id/status', (req, res) => {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    if (order) {
        const oldStatus = order.status;
        order.status = status;
        
        // Send email notification to user about status change
        sendOrderStatusEmail(order, status, oldStatus);
        
        res.json({ success: true, order });
    } else {
        res.json({ success: false, message: 'Order not found' });
    }
});

app.put('/api/messages/:id/status', (req, res) => {
    const messageId = parseInt(req.params.id);
    const { status, replied } = req.body;
    
    const message = contactMessages.find(m => m.id === messageId);
    if (message) {
        if (status) message.status = status;
        if (replied !== undefined) message.replied = replied;
        res.json({ success: true, message });
    } else {
        res.json({ success: false, message: 'Message not found' });
    }
});

// Function to send order status email to user
function sendOrderStatusEmail(order, newStatus, oldStatus) {
    let subject, emailHtml;
    
    if (newStatus === 'confirmed') {
        subject = `🎉 Order Confirmed - ${order.orderId}`;
        emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .highlight { color: #28a745; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Order Confirmed!</h1>
                    <p>Your order has been approved by our team</p>
                </div>
                
                <div class="content">
                    <h2>Congratulations!</h2>
                    <p>We're excited to confirm that your order has been approved and is now confirmed.</p>
                    
                    <div class="order-details">
                        <p><strong>Order ID:</strong> <span class="highlight">${order.orderId}</span></p>
                        <p><strong>Customer Name:</strong> ${order.customerName}</p>
                        <p><strong>Email:</strong> ${order.email}</p>
                        <p><strong>Phone:</strong> ${order.phone}</p>
                    <p><strong>Ticket Type:</strong> ${order.ticketType}</p>
                    <p><strong>Total Tickets:</strong> ${order.quantity}</p>
                    <p><strong>Total Amount:</strong> <span class="highlight">Rs. ${order.totalAmount.toLocaleString()}</span></p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                    <p><strong>Event Participation:</strong> ${order.eventParticipation === 'yes' ? 'Yes - Participating in Activities' : 'No - Attending Only'}</p>
                    ${order.eventParticipation === 'yes' && order.activities ? `<p><strong>Selected Activities:</strong> ${order.activities}</p>` : ''}
                    ${order.eventParticipation === 'yes' && order.activityDescription ? `<p><strong>Activity Description:</strong> ${order.activityDescription}</p>` : ''}
                    <p><strong>Confirmation Date:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    
                    <h3>What's Next?</h3>
                    <p>Your tickets are now confirmed! Please find your event ticket attached to this email.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #28a745;">
                        <h4 style="color: #28a745; margin-bottom: 10px;">🎫 Your Event Ticket</h4>
                        <p style="margin: 0; color: #666;">Your official event ticket is attached to this email as <strong>Event_Ticket.jpg</strong></p>
                        <p style="margin: 5px 0 0 0; font-size: 14px; color: #888;">Please download and save it for entry to the event</p>
                    </div>
                    
                    <p><strong>📎 Important:</strong> Your event ticket is attached to this email. Please save it and bring it with you to the event.</p>
                    <p>If you have any questions, please contact us at <strong>orbi.pk.mail@gmail.com</strong></p>
                    
                    <div class="footer">
                        <p>Thank you for choosing Once Upon a Wedding! 🎭</p>
                        <p>We look forward to seeing you at the event!</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    } else if (newStatus === 'cancelled') {
        subject = `❌ Order Cancelled - ${order.orderId}`;
        emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .highlight { color: #dc3545; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>❌ Order Cancelled</h1>
                    <p>Your order has been cancelled</p>
                </div>
                
                <div class="content">
                    <h2>Order Cancellation Notice</h2>
                    <p>We regret to inform you that your order has been cancelled by our team.</p>
                    
                    <div class="order-details">
                        <p><strong>Order ID:</strong> <span class="highlight">${order.orderId}</span></p>
                        <p><strong>Customer Name:</strong> ${order.customerName}</p>
                        <p><strong>Email:</strong> ${order.email}</p>
                        <p><strong>Phone:</strong> ${order.phone}</p>
                        <p><strong>Ticket Type:</strong> ${order.ticketType}</p>
                        <p><strong>Quantity:</strong> ${order.quantity}</p>
                        <p><strong>Total Amount:</strong> <span class="highlight">Rs. ${order.totalAmount.toLocaleString()}</span></p>
                        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                        <p><strong>Cancellation Date:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    
                    <h3>Refund Information</h3>
                    <p>If you have already made payment, please contact us at <strong>orbi.pk.mail@gmail.com</strong> for refund processing.</p>
                    <p>We apologize for any inconvenience caused.</p>
                    
                    <div class="footer">
                        <p>Once Upon a Wedding Team</p>
                        <p>For any queries, contact us at orbi.pk.mail@gmail.com</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    } else {
        // For other status changes (like pending to processing, etc.)
        return;
    }
    
    const mailOptions = {
        from: 'orbi.pk.mail@gmail.com',
        to: order.email,
        subject: subject,
        html: emailHtml,
        attachments: []
    };
    
    // Add ticket attachment for confirmation emails
    if (newStatus === 'confirmed') {
        mailOptions.attachments.push({
            filename: 'Event_Ticket.jpg',
            path: path.join(__dirname, 'images', 'Tikcet.jpg'),
            cid: 'event_ticket'
        });
    }
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error sending status email:', error);
        } else {
            console.log(`Status email sent successfully to ${order.email}:`, info.response);
        }
    });
}

// Removed duplicate /admin/dashboard route - already defined above

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://127.0.0.1:${PORT}`);
    console.log(`   http://192.168.18.40:${PORT}`);
    console.log(`\n📁 Serving static files from: ${__dirname}`);
    console.log(`\n✨ No database required - Simple static file server!`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});