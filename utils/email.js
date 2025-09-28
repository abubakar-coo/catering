const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Generate QR code
const generateQRCode = async (orderId, qrData) => {
  try {
    const qrCodeFolder = process.env.QR_CODE_FOLDER || './static/qr_codes';
    
    // Ensure directory exists
    if (!fs.existsSync(qrCodeFolder)) {
      fs.mkdirSync(qrCodeFolder, { recursive: true });
    }

    const filename = `qr_${orderId}_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    const filepath = path.join(qrCodeFolder, filename);

    // Generate QR code
    await QRCode.toFile(filepath, qrData, {
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });

    return filename;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw error;
  }
};

// Send order confirmation email
const sendOrderConfirmationEmail = async (order) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Catering Service" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `Order Confirmation - ${order.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px; background: white; }
            .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .status-pending { color: #ffc107; font-weight: bold; }
            .qr-code { text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Order Confirmation</h1>
              <p>Thank you for your booking!</p>
            </div>
            
            <div class="content">
              <h2>Order Details</h2>
              <div class="order-details">
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Customer Name:</strong> ${order.customerName}</p>
                <p><strong>Email:</strong> ${order.customerEmail}</p>
                <p><strong>Phone:</strong> ${order.customerPhone}</p>
                <p><strong>Ticket Type:</strong> ${order.ticketType.toUpperCase()}</p>
                <p><strong>Quantity:</strong> ${order.quantity}</p>
                <p><strong>Amount:</strong> $${order.amount}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
                <p><strong>Status:</strong> <span class="status-pending">PENDING CONFIRMATION</span></p>
                <p><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div class="qr-code">
                <h3>Your QR Code</h3>
                <p>Scan this QR code at the event entrance:</p>
                <img src="cid:qr_code" alt="QR Code" style="max-width: 300px; height: auto;">
              </div>
              
              <h3>Next Steps</h3>
              <ul>
                <li>Your order is currently pending confirmation</li>
                <li>You will receive a final ticket email once confirmed</li>
                <li>Keep this QR code safe - you'll need it for entry</li>
                <li>Contact us if you have any questions</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing our catering service!</p>
              <p>For support, contact us at ${process.env.ADMIN_EMAIL}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: []
    };

    // Attach QR code if available
    if (order.qrCodeFilename) {
      const qrCodePath = path.join(process.env.QR_CODE_FOLDER || './static/qr_codes', order.qrCodeFilename);
      if (fs.existsSync(qrCodePath)) {
        mailOptions.attachments.push({
          filename: order.qrCodeFilename,
          path: qrCodePath,
          cid: 'qr_code'
        });
      }
    }

    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${order.customerEmail}`);

  } catch (error) {
    console.error('Order confirmation email error:', error);
    throw error;
  }
};

// Send final ticket email
const sendFinalTicketEmail = async (order) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Catering Service" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `Final Ticket - ${order.orderId} - Ready for Event!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Final Ticket</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px; background: white; }
            .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .status-confirmed { color: #28a745; font-weight: bold; }
            .qr-code { text-align: center; margin: 20px 0; }
            .important { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 Final Ticket Confirmed!</h1>
              <p>Your order has been confirmed and is ready for the event!</p>
            </div>
            
            <div class="content">
              <h2>Order Details</h2>
              <div class="order-details">
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Customer Name:</strong> ${order.customerName}</p>
                <p><strong>Email:</strong> ${order.customerEmail}</p>
                <p><strong>Phone:</strong> ${order.customerPhone}</p>
                <p><strong>Ticket Type:</strong> ${order.ticketType.toUpperCase()}</p>
                <p><strong>Quantity:</strong> ${order.quantity}</p>
                <p><strong>Amount:</strong> $${order.amount}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
                <p><strong>Status:</strong> <span class="status-confirmed">CONFIRMED ✅</span></p>
                <p><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div class="qr-code">
                <h3>Your Entry QR Code</h3>
                <p>Present this QR code at the event entrance:</p>
                <img src="cid:qr_code" alt="QR Code" style="max-width: 300px; height: auto;">
              </div>
              
              <div class="important">
                <h3>⚠️ Important Instructions</h3>
                <ul>
                  <li><strong>Bring this QR code</strong> to the event for entry</li>
                  <li><strong>One QR code per person</strong> - each ticket holder needs their own</li>
                  <li><strong>QR code can only be used once</strong> - it will expire after entry</li>
                  <li><strong>Arrive on time</strong> - late entries may not be allowed</li>
                  <li><strong>Valid ID required</strong> - bring matching identification</li>
                </ul>
              </div>
              
              <h3>Event Information</h3>
              <ul>
                <li>Date: [Event Date]</li>
                <li>Time: [Event Time]</li>
                <li>Location: [Event Location]</li>
                <li>Dress Code: [Dress Code]</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>We look forward to seeing you at the event!</p>
              <p>For support, contact us at ${process.env.ADMIN_EMAIL}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: []
    };

    // Attach QR code if available
    if (order.qrCodeFilename) {
      const qrCodePath = path.join(process.env.QR_CODE_FOLDER || './static/qr_codes', order.qrCodeFilename);
      if (fs.existsSync(qrCodePath)) {
        mailOptions.attachments.push({
          filename: order.qrCodeFilename,
          path: qrCodePath,
          cid: 'qr_code'
        });
      }
    }

    await transporter.sendMail(mailOptions);
    console.log(`Final ticket email sent to ${order.customerEmail}`);

  } catch (error) {
    console.error('Final ticket email error:', error);
    throw error;
  }
};

// Send cancellation email
const sendCancellationEmail = async (order) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Catering Service" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `Order Cancelled - ${order.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Order Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px; background: white; }
            .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .status-cancelled { color: #dc3545; font-weight: bold; }
            .refund-info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Order Cancelled</h1>
              <p>Your order has been cancelled</p>
            </div>
            
            <div class="content">
              <h2>Cancelled Order Details</h2>
              <div class="order-details">
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>Customer Name:</strong> ${order.customerName}</p>
                <p><strong>Email:</strong> ${order.customerEmail}</p>
                <p><strong>Phone:</strong> ${order.customerPhone}</p>
                <p><strong>Ticket Type:</strong> ${order.ticketType.toUpperCase()}</p>
                <p><strong>Quantity:</strong> ${order.quantity}</p>
                <p><strong>Amount:</strong> $${order.amount}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
                <p><strong>Status:</strong> <span class="status-cancelled">CANCELLED ❌</span></p>
                <p><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div class="refund-info">
                <h3>Refund Information</h3>
                <p>Your payment will be refunded according to our refund policy:</p>
                <ul>
                  <li>Full refund if cancelled 48+ hours before event</li>
                  <li>50% refund if cancelled 24-48 hours before event</li>
                  <li>No refund if cancelled less than 24 hours before event</li>
                </ul>
                <p><strong>Refund will be processed within 5-7 business days.</strong></p>
              </div>
              
              <h3>What's Next?</h3>
              <ul>
                <li>Your QR code is now invalid and cannot be used for entry</li>
                <li>Refund will be processed automatically</li>
                <li>You will receive a confirmation email once refund is processed</li>
                <li>Contact us if you have any questions about the refund</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>We're sorry for any inconvenience.</p>
              <p>For support, contact us at ${process.env.ADMIN_EMAIL}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Cancellation email sent to ${order.customerEmail}`);

  } catch (error) {
    console.error('Cancellation email error:', error);
    throw error;
  }
};

module.exports = {
  generateQRCode,
  sendOrderConfirmationEmail,
  sendFinalTicketEmail,
  sendCancellationEmail
};
