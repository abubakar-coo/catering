from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, session
from werkzeug.utils import secure_filename
import sqlite3
import os
import hashlib
from datetime import datetime
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import qrcode
import uuid

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'your-secret-key-change-this-in-production'

# Add custom Jinja2 filter for JSON parsing
def from_json(value):
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return []

app.jinja_env.filters['from_json'] = from_json

# Add CORS headers and performance optimizations
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    # Performance optimizations
    if response.content_type and response.content_type.startswith('text/'):
        response.headers.add('Cache-Control', 'public, max-age=3600')  # Cache for 1 hour
    elif response.content_type and response.content_type.startswith('image/'):
        response.headers.add('Cache-Control', 'public, max-age=86400')  # Cache images for 1 day
    elif response.content_type and response.content_type.startswith('application/javascript'):
        response.headers.add('Cache-Control', 'public, max-age=3600')  # Cache JS for 1 hour
    elif response.content_type and response.content_type.startswith('text/css'):
        response.headers.add('Cache-Control', 'public, max-age=3600')  # Cache CSS for 1 hour
    
    # Add compression headers
    response.headers.add('Vary', 'Accept-Encoding')
    
    return response

# Configuration
UPLOAD_FOLDER = 'static/uploads'
QR_CODE_FOLDER = 'static/qr_codes'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}

# Create QR code folder if it doesn't exist
if not os.path.exists(QR_CODE_FOLDER):
    os.makedirs(QR_CODE_FOLDER)

# Email Configuration
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USER = 'orbi.pk.mail@gmail.com'
EMAIL_PASSWORD = 'baqc rfmi swxh noxv'

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# QR Code Functions
def generate_qr_code(order_id, customer_name, ticket_type, quantity):
    """Generate QR code for ticket - contains admin dashboard URL with order ID"""
    # QR code data - admin dashboard URL with order ID
    qr_string = f"http://192.168.18.40:5000/admin/dashboard?scan={order_id}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_string)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code
    filename = f"qr_{order_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    filepath = os.path.join(QR_CODE_FOLDER, filename)
    img.save(filepath)
    
    return qr_string, filename

def verify_qr_code(qr_data):
    """Verify QR code and return order information"""
    try:
        # QR data is now just the order ID
        order_id = qr_data.strip()
        
        conn = sqlite3.connect('ticket_orders.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM orders WHERE order_id = ? AND is_verified = FALSE
        ''', (order_id,))
        
        order = cursor.fetchone()
        conn.close()
        
        if order:
            return {
                'valid': True,
                'order': order,
                'qr_data': order_id
            }
        else:
            return {
                'valid': False,
                'message': 'Ticket not found or already verified'
            }
    except Exception as e:
        return {
            'valid': False,
            'message': f'Invalid QR code: {str(e)}'
        }

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def clear_all_orders():
    """Clear all orders from the database"""
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    # Delete all orders
    cursor.execute('DELETE FROM orders')
    conn.commit()
    conn.close()
    print("All orders cleared from database")

def send_order_confirmation_email(order_data):
    """Send order confirmation email to customer (QR code sent in final ticket email)"""
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = order_data['email']
        msg['Subject'] = f"Order Confirmation - {order_data['order_id']}"
        
        # Create HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #fa3131 0%, #ff6b6b 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .order-details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .highlight {{ color: #fa3131; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                .btn {{ background: linear-gradient(135deg, #fa3131 0%, #ff6b6b 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; }}
                .payment-screenshot {{ margin: 20px 0; text-align: center; }}
                .payment-screenshot img {{ max-width: 100%; height: auto; border: 2px solid #dee2e6; border-radius: 8px; }}
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
                        <p><strong>Order ID:</strong> <span class="highlight">{order_data['order_id']}</span></p>
                        <p><strong>Customer Name:</strong> {order_data['full_name']}</p>
                <p><strong>Email:</strong> {order_data['email']}</p>
                <p><strong>Phone:</strong> {order_data['phone']}</p>
                <p><strong>Date of Birth:</strong> {order_data['dob']}</p>
                <p><strong>Event Participation:</strong> {order_data['event_participation'].title()}</p>
                {f"<p><strong>Selected Activities:</strong> {', '.join(order_data['activities']).title()}</p>" if order_data.get('activities') and order_data['activities'] != '[]' else ""}
                {f"<p><strong>Activity Description:</strong> {order_data['activity_description']}</p>" if order_data.get('activity_description') else ""}
                <p><strong>Ticket Type:</strong> {order_data['ticket_type'].title()}</p>
                        <p><strong>Quantity:</strong> {order_data['quantity']}</p>
                        <p><strong>Price per Ticket:</strong> Rs. {order_data['price_per_ticket']:,}</p>
                        <p><strong>Total Amount:</strong> <span class="highlight">Rs. {order_data['total_amount']:,}</span></p>
                        <p><strong>Payment Method:</strong> {order_data['payment_method'].title()}</p>
                        <p><strong>Order Date:</strong> {order_data['order_date']}</p>
                    </div>
                    
                    {f'<div class="payment-screenshot"><h4>📸 Payment Screenshot</h4><img src="cid:payment_screenshot" alt="Payment Screenshot" /></div>' if order_data.get('payment_ss_filename') else ''}
                    
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
        """
        
        # Attach HTML body
        msg.attach(MIMEText(html_body, 'html'))
        
        # Attach payment screenshot if available
        if order_data.get('payment_ss_filename'):
            try:
                screenshot_path = os.path.join(UPLOAD_FOLDER, order_data['payment_ss_filename'])
                if os.path.exists(screenshot_path):
                    with open(screenshot_path, 'rb') as f:
                        img_data = f.read()
                    
                    # Create image attachment
                    from email.mime.image import MIMEImage
                    img_attachment = MIMEImage(img_data)
                    img_attachment.add_header('Content-ID', '<payment_screenshot>')
                    img_attachment.add_header('Content-Disposition', 'inline', filename=order_data['payment_ss_filename'])
                    msg.attach(img_attachment)
            except Exception as e:
                print(f"Error attaching payment screenshot: {str(e)}")
        
        # QR code will be sent in final ticket email after admin confirmation
        
        # Connect to Gmail SMTP server
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(EMAIL_USER, order_data['email'], text)
        server.quit()
        
        print(f"Order confirmation email sent to {order_data['email']}")
        return True
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

def send_final_ticket_email(order):
    """Send final ticket email with QR code and ticket template"""
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = order[4]  # email field
        msg['Subject'] = f"🎫 Your Final Ticket - {order[1]}"
        
        # Create HTML email body with ticket template
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 24px; font-weight: bold; color: #fa3131; }}
                .ticket-container {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; margin: 20px 0; position: relative; overflow: hidden; }}
                .ticket-template {{ width: 100%; max-width: 500px; margin: 0 auto; position: relative; }}
                .ticket-overlay {{ position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.1); border-radius: 15px; }}
                .ticket-info {{ position: absolute; top: 20px; left: 20px; right: 20px; color: white; z-index: 10; }}
                .ticket-title {{ font-size: 24px; font-weight: bold; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }}
                .ticket-details {{ font-size: 16px; line-height: 1.6; }}
                .qr-section {{ text-align: center; margin: 20px 0; padding: 20px; background-color: #e8f4fd; border-radius: 10px; }}
                .qr-code {{ max-width: 200px; margin: 10px auto; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                .highlight {{ color: #fa3131; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎉 Once Upon a Wedding</div>
                    <h2>Your Final Ticket is Ready!</h2>
                </div>
                
                <div class="ticket-container">
                    <div class="ticket-template">
                        <img src="cid:ticket_template" alt="Ticket Template" style="width: 100%; height: auto; border-radius: 15px;">
                        <div class="ticket-overlay"></div>
                        <div class="ticket-info">
                            <div class="ticket-title">🎫 {order[2]}</div>
                            <div class="ticket-details">
                                <strong>Order ID:</strong> {order[1]}<br>
                                <strong>Ticket Type:</strong> {order[11].title()}<br>
                                <strong>Quantity:</strong> {order[12]} ticket(s)<br>
                                <strong>Event:</strong> Once Upon a Wedding<br>
                                <strong>Date:</strong> December 20, 2025<br>
                                <strong>Time:</strong> 6:00 PM - 12:00 AM<br>
                                <strong>Location:</strong> Lahore
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="qr-section">
                    <h3>🔐 Your Digital QR Code</h3>
                    <div class="qr-code">
                        <img src="cid:qr_code" alt="QR Code" style="width: 100%; height: auto; border: 2px solid #dee2e6; border-radius: 8px;">
                    </div>
                    <div style="color: #666; font-size: 14px; margin-top: 10px;">
                        <strong>Important:</strong> Present this QR code at the event entrance for verification.
                    </div>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3>📋 Event Details</h3>
                    <p><strong>Event:</strong> Once Upon a Wedding</p>
                    <p><strong>Date:</strong> December 20, 2025</p>
                    <p><strong>Time:</strong> 6:00 PM - 12:00 AM</p>
                    <p><strong>Location:</strong> Lahore</p>
                    <p><strong>Dress Code:</strong> Formal/Semi-Formal</p>
                </div>
                
                <div class="footer">
                    <p>🎭 Thank you for choosing Once Upon a Wedding!</p>
                    <p>For any queries, please contact us at <strong>orbi.pk.mail@gmail.com</strong></p>
                    <p><em>This is your official ticket. Please keep it safe!</em></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML body
        msg.attach(MIMEText(html_body, 'html'))
        
        # Attach ticket template
        try:
            ticket_template_path = os.path.join('Ticket Qr code', 'Final Ticket with Qr code.png')
            if os.path.exists(ticket_template_path):
                with open(ticket_template_path, 'rb') as f:
                    template_data = f.read()
                
                from email.mime.image import MIMEImage
                template_attachment = MIMEImage(template_data)
                template_attachment.add_header('Content-ID', '<ticket_template>')
                template_attachment.add_header('Content-Disposition', 'inline', filename='ticket_template.png')
                msg.attach(template_attachment)
        except Exception as e:
            print(f"Error attaching ticket template: {str(e)}")
        
        # Attach QR code
        if order[21]:  # qr_code_filename field
            try:
                qr_path = os.path.join(QR_CODE_FOLDER, order[21])
                if os.path.exists(qr_path):
                    with open(qr_path, 'rb') as f:
                        qr_data = f.read()
                    
                    from email.mime.image import MIMEImage
                    qr_attachment = MIMEImage(qr_data)
                    qr_attachment.add_header('Content-ID', '<qr_code>')
                    qr_attachment.add_header('Content-Disposition', 'inline', filename=order[21])
                    msg.attach(qr_attachment)
            except Exception as e:
                print(f"Error attaching QR code: {str(e)}")
        
        # Also attach QR code as separate attachment for easy access
        if order[21]:  # qr_code_filename field
            try:
                qr_path = os.path.join(QR_CODE_FOLDER, order[21])
                if os.path.exists(qr_path):
                    with open(qr_path, 'rb') as f:
                        qr_data = f.read()
                    
                    from email.mime.image import MIMEImage
                    qr_attachment = MIMEImage(qr_data)
                    qr_attachment.add_header('Content-Disposition', 'attachment', filename=f"ticket_qr_{order[1]}.png")
                    msg.attach(qr_attachment)
            except Exception as e:
                print(f"Error attaching QR code as attachment: {str(e)}")
        
        # Connect to Gmail SMTP server
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(EMAIL_USER, order[4], text)
        server.quit()
        
        print(f"Final ticket email sent to {order[4]}")
        return True
        
    except Exception as e:
        print(f"Error sending final ticket email: {str(e)}")
        return False

def send_cancellation_email(order):
    """Send cancellation email to customer"""
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = order[4]  # email field
        msg['Subject'] = f"❌ Order Cancelled - {order[1]}"
        
        # Create HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 24px; font-weight: bold; color: #fa3131; }}
                .cancellation-notice {{ background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); padding: 30px; border-radius: 15px; margin: 20px 0; text-align: center; color: white; }}
                .cancellation-icon {{ font-size: 48px; margin-bottom: 15px; }}
                .order-details {{ background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }}
                .order-details h3 {{ color: #343a40; margin-bottom: 15px; }}
                .order-details p {{ margin-bottom: 8px; font-size: 16px; }}
                .order-details strong {{ color: #fa3131; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
                .highlight {{ color: #fa3131; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎭 Once Upon a Wedding</div>
                    <h2>Order Cancellation Notice</h2>
                </div>
                
                <div class="cancellation-notice">
                    <div class="cancellation-icon">❌</div>
                    <h2 style="margin: 0; font-size: 28px;">Order Cancelled</h2>
                    <p style="margin: 10px 0 0 0; font-size: 18px;">We're sorry to inform you that your order has been cancelled.</p>
                </div>
                
                <div class="order-details">
                    <h3>📋 Cancelled Order Details</h3>
                    <p><strong>Order ID:</strong> {order[1]}</p>
                    <p><strong>Customer Name:</strong> {order[2]}</p>
                    <p><strong>Email:</strong> {order[4]}</p>
                    <p><strong>Phone:</strong> {order[3]}</p>
                    <p><strong>Ticket Type:</strong> {order[7].title()}</p>
                    <p><strong>Quantity:</strong> {order[8]} ticket(s)</p>
                    <p><strong>Total Amount:</strong> Rs. {order[10]:,.0f}</p>
                    <p><strong>Order Date:</strong> {order[15][:10]}</p>
                    <p><strong>Cancellation Date:</strong> {datetime.now().strftime('%Y-%m-%d')}</p>
                </div>
                
                
                <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h3 style="color: #856404; margin-top: 0;">⚠️ Important Information</h3>
                    <p style="color: #856404; margin-bottom: 0;">
                        • Your ticket is no longer valid for the event<br>
                        • QR code has been deactivated<br>
                        • Refund will be processed automatically<br>
                        • Contact us if you have any questions
                    </p>
                </div>
                
                <div class="footer">
                    <p>🎭 Thank you for your understanding!</p>
                    <p>For any queries regarding this cancellation, please contact us at <strong>orbi.pk.mail@gmail.com</strong></p>
                    <p><em>We hope to serve you better in the future!</em></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Attach HTML body
        msg.attach(MIMEText(html_body, 'html'))
        
        # Connect to Gmail SMTP server
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        
        # Send email
        text = msg.as_string()
        server.sendmail(EMAIL_USER, order[4], text)
        server.quit()
        
        print(f"Cancellation email sent to {order[4]}")
        return True
        
    except Exception as e:
        print(f"Error sending cancellation email: {str(e)}")
        return False

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    # Create orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            dob TEXT NOT NULL,
            address TEXT NOT NULL,
            requirements TEXT,
            event_participation TEXT NOT NULL,
            activities TEXT,
            activity_description TEXT,
            ticket_type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price_per_ticket REAL NOT NULL,
            total_amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            payment_ss_filename TEXT,
            transaction_id TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add QR code columns if they don't exist (migration)
    try:
        cursor.execute('ALTER TABLE orders ADD COLUMN qr_code TEXT UNIQUE')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        cursor.execute('ALTER TABLE orders ADD COLUMN qr_code_filename TEXT')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        cursor.execute('ALTER TABLE orders ADD COLUMN is_verified BOOLEAN DEFAULT FALSE')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        cursor.execute('ALTER TABLE orders ADD COLUMN verified_at TIMESTAMP')
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    # Commit the migration changes
    conn.commit()
    
    # Create admin table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert default admin user if not exists
    cursor.execute('SELECT COUNT(*) FROM admin_users')
    if cursor.fetchone()[0] == 0:
        # Default admin credentials: admin / admin123
        password_hash = hashlib.sha256('admin123'.encode()).hexdigest()
        cursor.execute('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', 
                      ('admin', password_hash))
    
    # Check if new columns exist and add them if they don't
    cursor.execute("PRAGMA table_info(orders)")
    columns = [column[1] for column in cursor.fetchall()]
    
    # Add dob column if it doesn't exist
    if 'dob' not in columns:
        cursor.execute('ALTER TABLE orders ADD COLUMN dob TEXT DEFAULT ""')
        print("Added dob column to orders table")
    
    # Add event_participation column if it doesn't exist
    if 'event_participation' not in columns:
        cursor.execute('ALTER TABLE orders ADD COLUMN event_participation TEXT DEFAULT "no"')
        print("Added event_participation column to orders table")
    
    # Add activities column if it doesn't exist
    if 'activities' not in columns:
        cursor.execute('ALTER TABLE orders ADD COLUMN activities TEXT DEFAULT "[]"')
        print("Added activities column to orders table")
    
    # Add activity_description column if it doesn't exist
    if 'activity_description' not in columns:
        cursor.execute('ALTER TABLE orders ADD COLUMN activity_description TEXT DEFAULT ""')
        print("Added activity_description column to orders table")
    
    # Create contact_messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'unread',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, password_hash):
    """Verify password against hash"""
    return hash_password(password) == password_hash

@app.route('/')
def index():
    """Serve the main index page"""
    return app.send_static_file('index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return app.send_static_file(filename)

@app.route('/tickets.html')
def tickets():
    """Serve the tickets page"""
    return app.send_static_file('tickets.html')

@app.route('/checkout.html')
def checkout():
    """Serve the checkout page"""
    return app.send_static_file('checkout.html')

@app.route('/order-confirmation.html')
def order_confirmation():
    """Serve the order confirmation page"""
    return app.send_static_file('order-confirmation.html')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return app.send_static_file(f'static/uploads/{filename}')

@app.route('/submit_order', methods=['POST'])
def submit_order():
    """Handle order submission from checkout form"""
    try:
        print("Received order submission request")
        
        # Get form data
        full_name = request.form.get('fullName')
        phone = request.form.get('phone')
        email = request.form.get('email')
        dob = request.form.get('dob')
        address = request.form.get('address')
        requirements = request.form.get('requirements', '')
        event_participation = request.form.get('eventParticipation')
        activities = request.form.get('activities', '[]')
        activity_description = request.form.get('activityDescription', '')
        payment_method = request.form.get('paymentMethod')
        transaction_id = request.form.get('transactionId')
        
        print(f"Form data received: {full_name}, {phone}, {email}")
        
        # Get ticket info from localStorage (we'll need to modify frontend)
        ticket_info_json = request.form.get('ticketInfo')
        if not ticket_info_json:
            print("No ticket info found")
            return jsonify({'success': False, 'message': 'Ticket information missing'}), 400
        
        ticket_info = json.loads(ticket_info_json)
        print(f"Ticket info: {ticket_info}")
        
        # Handle file upload
        payment_ss_filename = None
        if 'paymentSS' in request.files:
            file = request.files['paymentSS']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Add timestamp to make filename unique
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
                filename = timestamp + filename
                file.save(os.path.join(UPLOAD_FOLDER, filename))
                payment_ss_filename = filename
        
        # Generate order ID
        order_id = 'OUW' + str(int(datetime.now().timestamp() * 1000))
        
        # Generate QR code
        qr_string, qr_filename = generate_qr_code(
            order_id, full_name, ticket_info['type'], ticket_info['quantity']
        )
        
        # Save to database
        conn = sqlite3.connect('ticket_orders.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO orders (order_id, full_name, phone, email, dob, address, requirements,
                              event_participation, activities, activity_description,
                              ticket_type, quantity, price_per_ticket, total_amount,
                              payment_method, payment_ss_filename, transaction_id, status,
                              qr_code, qr_code_filename)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (order_id, full_name, phone, email, dob, address, requirements,
              event_participation, activities, activity_description,
              ticket_info['type'], ticket_info['quantity'], ticket_info['pricePerTicket'],
              ticket_info['total'], payment_method, payment_ss_filename, transaction_id, 'pending',
              qr_string, qr_filename))
        
        conn.commit()
        conn.close()
        
        print(f"Order saved successfully: {order_id}")
        
        # Parse activities JSON
        try:
            activities_list = json.loads(activities) if activities else []
        except:
            activities_list = []
        
        # Prepare order data for email
        order_data = {
            'order_id': order_id,
            'full_name': full_name,
            'email': email,
            'phone': phone,
            'dob': dob,
            'event_participation': event_participation,
            'activities': activities_list,
            'activity_description': activity_description,
            'ticket_type': ticket_info['type'],
            'quantity': ticket_info['quantity'],
            'price_per_ticket': ticket_info['pricePerTicket'],
            'total_amount': ticket_info['total'],
            'payment_method': payment_method,
            'order_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'payment_ss_filename': payment_ss_filename
        }
        
        # Send confirmation email (QR code will be sent in final ticket email)
        email_sent = send_order_confirmation_email(order_data)
        if email_sent:
            print(f"Confirmation email sent to {email}")
        else:
            print(f"Failed to send email to {email}")
        
        return jsonify({
            'success': True,
            'message': 'Order submitted successfully!',
            'order_id': order_id,
            'email_sent': email_sent
        })
        
    except Exception as e:
        print(f"Error in submit_order: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/admin')
def admin_login():
    """Admin login page"""
    if 'admin_logged_in' in session:
        return redirect(url_for('admin_dashboard'))
    return render_template('admin_login.html')

@app.route('/admin/login', methods=['POST'])
def admin_login_post():
    """Handle admin login"""
    username = request.form.get('username')
    password = request.form.get('password')
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT password_hash FROM admin_users WHERE username = ?', (username,))
    result = cursor.fetchone()
    conn.close()
    
    if result and verify_password(password, result[0]):
        session['admin_logged_in'] = True
        session['admin_username'] = username
        return redirect(url_for('admin_dashboard'))
    else:
        flash('Invalid username or password', 'error')
        return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
def admin_dashboard():
    """Admin dashboard"""
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    # Get all orders
    cursor.execute('''
        SELECT * FROM orders 
        ORDER BY created_at DESC
    ''')
    orders = cursor.fetchall()
    
    # Get order statistics
    cursor.execute('SELECT COUNT(*) FROM orders')
    total_orders = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM orders WHERE status = "pending"')
    pending_orders = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM orders WHERE status = "confirmed"')
    confirmed_orders = cursor.fetchone()[0]
    
    cursor.execute('SELECT SUM(total_amount) FROM orders WHERE status = "confirmed"')
    total_revenue = cursor.fetchone()[0] or 0
    
    # Get total tickets sold
    cursor.execute('SELECT SUM(quantity) FROM orders WHERE status IN ("confirmed", "verified")')
    total_tickets_sold = cursor.fetchone()[0] or 0
    
    # Get contact message statistics
    cursor.execute('SELECT COUNT(*) FROM contact_messages')
    total_contact_messages = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM contact_messages WHERE status = "unread"')
    unread_contact_messages = cursor.fetchone()[0]
    
    conn.close()
    
    return render_template('admin_dashboard.html', 
                         orders=orders, 
                         total_orders=total_orders,
                         pending_orders=pending_orders,
                         confirmed_orders=confirmed_orders,
                         total_revenue=total_revenue,
                         total_tickets_sold=total_tickets_sold,
                         total_contact_messages=total_contact_messages,
                         unread_contact_messages=unread_contact_messages)

@app.route('/admin/order/<int:order_id>')
def admin_order_detail(order_id):
    """Admin order detail page"""
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
    order = cursor.fetchone()
    
    conn.close()
    
    if not order:
        flash('Order not found', 'error')
        return redirect(url_for('admin_dashboard'))
    
    return render_template('admin_order_detail.html', order=order)

@app.route('/admin/update_status', methods=['POST'])
def update_order_status():
    """Update order status"""
    if 'admin_logged_in' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'}), 401
    
    order_id = request.form.get('order_id')
    new_status = request.form.get('status')
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE orders 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    ''', (new_status, order_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Status updated successfully'})

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin_login'))

@app.route('/admin/clear-orders')
def clear_orders():
    """Clear all orders from database"""
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    
    clear_all_orders()
    return redirect(url_for('admin_dashboard'))

@app.route('/submit_contact', methods=['POST'])
def submit_contact():
    """Handle contact form submission"""
    try:
        data = request.get_json()
        
        name = data.get('name')
        phone = data.get('phone')
        email = data.get('email')
        message = data.get('message')
        
        if not all([name, phone, email, message]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        conn = sqlite3.connect('ticket_orders.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO contact_messages (name, phone, email, message)
            VALUES (?, ?, ?, ?)
        ''', (name, phone, email, message))
        
        conn.commit()
        conn.close()
        
        print(f"Contact message saved: {name} - {email}")
        
        return jsonify({
            'success': True,
            'message': 'Message sent successfully!'
        })
        
    except Exception as e:
        print(f"Error in submit_contact: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/admin/contact-messages')
def admin_contact_messages():
    """Admin contact messages page"""
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM contact_messages 
        ORDER BY created_at DESC
    ''')
    messages = cursor.fetchall()
    
    cursor.execute('SELECT COUNT(*) FROM contact_messages')
    total_messages = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM contact_messages WHERE status = "unread"')
    unread_messages = cursor.fetchone()[0]
    
    conn.close()
    
    return render_template('admin_contact_messages.html', 
                         messages=messages,
                         total_messages=total_messages,
                         unread_messages=unread_messages)

@app.route('/admin/mark-message-read', methods=['POST'])
def mark_message_read():
    """Mark a contact message as read"""
    if 'admin_logged_in' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'}), 401
    
    message_id = request.form.get('message_id')
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE contact_messages 
        SET status = 'read' 
        WHERE id = ?
    ''', (message_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Message marked as read'})

# QR scanner page removed - use phone camera directly

@app.route('/admin/verify-qr', methods=['POST'])
def verify_qr():
    """Verify QR code and return order information"""
    if 'admin_logged_in' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'}), 401
    
    qr_data = request.json.get('qr_data')
    result = verify_qr_code(qr_data)
    
    if result['valid']:
        return jsonify({
            'success': True,
            'order': {
                'id': result['order'][0],
                'order_id': result['order'][1],
                'full_name': result['order'][2],
                'phone': result['order'][3],
                'email': result['order'][4],
                'ticket_type': result['order'][11],
                'quantity': result['order'][12],
                'total_amount': result['order'][15],
                'status': result['order'][19],
                'created_at': result['order'][23]
            },
            'qr_data': result['qr_data']
        })
    else:
        return jsonify({
            'success': False,
            'message': result['message']
        })

@app.route('/admin/mark-ticket-verified', methods=['POST'])
def mark_ticket_verified():
    """Mark ticket as verified and expire QR code"""
    if 'admin_logged_in' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'}), 401
    
    order_id = request.json.get('order_id')
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE orders 
        SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP, status = 'verified'
        WHERE order_id = ?
    ''', (order_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Ticket verified and QR code expired'})

@app.route('/admin/confirm-order', methods=['POST'])
def confirm_order():
    """Confirm order and send final ticket email with QR code"""
    if 'admin_logged_in' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'}), 401
    
    order_id = request.json.get('order_id')
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    # Get order details
    cursor.execute('SELECT * FROM orders WHERE order_id = ?', (order_id,))
    order = cursor.fetchone()
    
    if not order:
        conn.close()
        return jsonify({'success': False, 'message': 'Order not found'}), 404
    
    # Update order status to confirmed
    cursor.execute('''
        UPDATE orders 
        SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
    ''', (order_id,))
    
    conn.commit()
    conn.close()
    
    # Send final ticket email with QR code
    email_sent = send_final_ticket_email(order)
    
    if email_sent:
        return jsonify({'success': True, 'message': 'Order confirmed and final ticket sent!'})
    else:
        return jsonify({'success': True, 'message': 'Order confirmed but failed to send email'})

@app.route('/admin/cancel-order', methods=['POST'])
def cancel_order():
    """Cancel order and send cancellation email"""
    print("Cancel order route called")
    if 'admin_logged_in' not in session:
        print("Admin not logged in")
        return jsonify({'success': False, 'message': 'Not authorized'}), 401
    
    order_id = request.json.get('order_id')
    print(f"Received order_id: {order_id}")
    
    conn = sqlite3.connect('ticket_orders.db')
    cursor = conn.cursor()
    
    # Get order details
    cursor.execute('SELECT * FROM orders WHERE order_id = ?', (order_id,))
    order = cursor.fetchone()
    
    if not order:
        conn.close()
        return jsonify({'success': False, 'message': 'Order not found'}), 404
    
    # Update order status to cancelled
    cursor.execute('''
        UPDATE orders 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
    ''', (order_id,))
    
    conn.commit()
    conn.close()
    
    # Send cancellation email
    email_sent = send_cancellation_email(order)
    
    if email_sent:
        return jsonify({'success': True, 'message': 'Order cancelled and cancellation email sent!'})
    else:
        return jsonify({'success': True, 'message': 'Order cancelled but failed to send email'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
