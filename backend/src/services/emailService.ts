import nodemailer from 'nodemailer';
import { Order, ContactMessage } from '@prisma/client';
import { logger } from '@/config/logger';
import env from '@/config/env';
import { EmailTemplate } from '@/types';
import { QRCodeService } from './qrCodeService';

export class EmailService {
  private static transporter = nodemailer.createTransporter({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      const mailOptions = {
        from: env.EMAIL_FROM,
        to: template.to,
        subject: template.subject,
        html: template.template,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to: ${template.to}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  static async sendOrderConfirmation(order: Order): Promise<boolean> {
    try {
      const template = this.getOrderConfirmationTemplate(order);
      return await this.sendEmail(template);
    } catch (error) {
      logger.error('Error sending order confirmation:', error);
      return false;
    }
  }

  static async sendFinalTicket(order: Order): Promise<boolean> {
    try {
      const template = await this.getFinalTicketTemplate(order);
      return await this.sendEmail(template);
    } catch (error) {
      logger.error('Error sending final ticket:', error);
      return false;
    }
  }

  static async sendCancellationEmail(order: Order): Promise<boolean> {
    try {
      const template = this.getCancellationTemplate(order);
      return await this.sendEmail(template);
    } catch (error) {
      logger.error('Error sending cancellation email:', error);
      return false;
    }
  }

  static async sendContactNotification(message: ContactMessage): Promise<boolean> {
    try {
      const template = this.getContactNotificationTemplate(message);
      return await this.sendEmail(template);
    } catch (error) {
      logger.error('Error sending contact notification:', error);
      return false;
    }
  }

  private static getOrderConfirmationTemplate(order: Order): EmailTemplate {
    const html = `
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
              <p><strong>Order ID:</strong> <span class="highlight">${order.orderId}</span></p>
              <p><strong>Customer Name:</strong> ${order.fullName}</p>
              <p><strong>Email:</strong> ${order.email}</p>
              <p><strong>Phone:</strong> ${order.phone}</p>
              <p><strong>Event Participation:</strong> ${order.eventParticipation}</p>
              <p><strong>Ticket Type:</strong> ${order.ticketType}</p>
              <p><strong>Quantity:</strong> ${order.quantity}</p>
              <p><strong>Price per Ticket:</strong> Rs. ${order.pricePerTicket.toLocaleString()}</p>
              <p><strong>Total Amount:</strong> <span class="highlight">Rs. ${order.totalAmount.toLocaleString()}</span></p>
              <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
              <p><strong>Order Date:</strong> ${order.createdAt.toLocaleDateString()}</p>
            </div>
            
            <h3>Next Steps</h3>
            <p>Your order has been received and is being processed. You will receive another email once your order is confirmed by our team.</p>
            
            <div class="footer">
              <p>Thank you for choosing Once Upon a Wedding! 🎭</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: order.email,
      subject: `Order Confirmation - ${order.orderId}`,
      template: html,
      data: { order },
    };
  }

  private static async getFinalTicketTemplate(order: Order): Promise<EmailTemplate> {
    const qrCodeBuffer = order.qrCodeFilename 
      ? await QRCodeService.getQRCodeImage(order.qrCodeFilename)
      : null;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #fa3131; }
          .ticket-container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; margin: 20px 0; position: relative; overflow: hidden; }
          .qr-section { text-align: center; margin: 20px 0; padding: 20px; background-color: #e8f4fd; border-radius: 10px; }
          .qr-code { max-width: 200px; margin: 10px auto; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .highlight { color: #fa3131; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎉 Once Upon a Wedding</div>
            <h2>Your Final Ticket is Ready!</h2>
          </div>
          
          <div class="ticket-container">
            <h3 style="color: white; margin: 0; font-size: 24px;">🎫 ${order.fullName}</h3>
            <div style="color: white; margin-top: 15px;">
              <p><strong>Order ID:</strong> ${order.orderId}</p>
              <p><strong>Ticket Type:</strong> ${order.ticketType}</p>
              <p><strong>Quantity:</strong> ${order.quantity} ticket(s)</p>
              <p><strong>Event:</strong> Once Upon a Wedding</p>
              <p><strong>Date:</strong> December 20, 2025</p>
              <p><strong>Time:</strong> 6:00 PM - 12:00 AM</p>
              <p><strong>Location:</strong> Lahore</p>
            </div>
          </div>
          
          <div class="qr-section">
            <h3>🔐 Your Digital QR Code</h3>
            ${qrCodeBuffer ? `
              <div class="qr-code">
                <img src="data:image/png;base64,${qrCodeBuffer.toString('base64')}" alt="QR Code" style="width: 100%; height: auto; border: 2px solid #dee2e6; border-radius: 8px;">
              </div>
            ` : '<p>QR code will be available soon</p>'}
            <div style="color: #666; font-size: 14px; margin-top: 10px;">
              <strong>Important:</strong> Present this QR code at the event entrance for verification.
            </div>
          </div>
          
          <div class="footer">
            <p>🎭 Thank you for choosing Once Upon a Wedding!</p>
            <p><em>This is your official ticket. Please keep it safe!</em></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: order.email,
      subject: `🎫 Your Final Ticket - ${order.orderId}`,
      template: html,
      data: { order },
    };
  }

  private static getCancellationTemplate(order: Order): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #fa3131; }
          .cancellation-notice { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 30px; border-radius: 15px; margin: 20px 0; text-align: center; color: white; }
          .order-details { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎭 Once Upon a Wedding</div>
            <h2>Order Cancellation Notice</h2>
          </div>
          
          <div class="cancellation-notice">
            <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
            <h2 style="margin: 0; font-size: 28px;">Order Cancelled</h2>
            <p style="margin: 10px 0 0 0; font-size: 18px;">We're sorry to inform you that your order has been cancelled.</p>
          </div>
          
          <div class="order-details">
            <h3>📋 Cancelled Order Details</h3>
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Customer Name:</strong> ${order.fullName}</p>
            <p><strong>Email:</strong> ${order.email}</p>
            <p><strong>Phone:</strong> ${order.phone}</p>
            <p><strong>Ticket Type:</strong> ${order.ticketType}</p>
            <p><strong>Quantity:</strong> ${order.quantity} ticket(s)</p>
            <p><strong>Total Amount:</strong> Rs. ${order.totalAmount.toLocaleString()}</p>
            <p><strong>Order Date:</strong> ${order.createdAt.toLocaleDateString()}</p>
            <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="footer">
            <p>🎭 Thank you for your understanding!</p>
            <p>We hope to serve you better in the future!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: order.email,
      subject: `❌ Order Cancelled - ${order.orderId}`,
      template: html,
      data: { order },
    };
  }

  private static getContactNotificationTemplate(message: ContactMessage): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #fa3131 0%, #ff6b6b 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Message</h1>
            <p>You have received a new message from your website</p>
          </div>
          
          <div class="content">
            <div class="message-details">
              <p><strong>Name:</strong> ${message.name}</p>
              <p><strong>Email:</strong> ${message.email}</p>
              <p><strong>Phone:</strong> ${message.phone}</p>
              <p><strong>Date:</strong> ${message.createdAt.toLocaleDateString()}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 10px;">
                ${message.message.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      to: env.ADMIN_EMAIL,
      subject: `New Contact Message from ${message.name}`,
      template: html,
      data: { message },
    };
  }
}
