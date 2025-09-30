import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { corsOptions } from '@/middleware/cors';
import { generalLimiter, authLimiter, contactLimiter } from '@/middleware/rateLimiter';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { logger } from '@/config/logger';
import env from '@/config/env';
import { AuthService } from '@/services/authService';
import { QRCodeService } from '@/services/qrCodeService';

// Import routes
import authRoutes from '@/routes/auth';
import orderRoutes from '@/routes/orders';
import contactRoutes from '@/routes/contact';

// Import types
import { SocketEvents } from '@/types';

class Application {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
    this.initializeServices();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(corsOptions);

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(generalLimiter);

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/api/auth', authLimiter, authRoutes);
    this.app.use('/api/orders', orderRoutes);
    this.app.use('/api/contact', contactLimiter, contactRoutes);

    // QR code verification endpoint
    this.app.get('/api/verify-qr', async (req, res) => {
      try {
        const qrData = req.query.data as string;
        if (!qrData) {
          return res.status(400).json({
            success: false,
            message: 'QR data is required',
          });
        }

        const data = JSON.parse(decodeURIComponent(qrData));
        res.json({
          success: true,
          message: 'QR code data retrieved',
          data,
        });
      } catch (error) {
        logger.error('QR verification error:', error);
        res.status(400).json({
          success: false,
          message: 'Invalid QR code data',
        });
      }
    });

    // Serve QR code images
    this.app.get('/api/qr-codes/:filename', async (req, res) => {
      try {
        const { filename } = req.params;
        const qrCodeBuffer = await QRCodeService.getQRCodeImage(filename);
        
        if (!qrCodeBuffer) {
          return res.status(404).json({
            success: false,
            message: 'QR code not found',
          });
        }

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
        res.send(qrCodeBuffer);
      } catch (error) {
        logger.error('QR code serving error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to serve QR code',
        });
      }
    });

    // 404 handler
    this.app.use(notFoundHandler);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private initializeSocketIO(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });

      // Join admin room for real-time updates
      socket.on('join-admin', () => {
        socket.join('admin');
        logger.info(`Admin joined: ${socket.id}`);
      });

      // Join user room for order updates
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        logger.info(`User joined: ${userId}`);
      });
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Create admin user if it doesn't exist
      await AuthService.createAdminUser();
      
      // Ensure QR code directory exists
      await QRCodeService.ensureQRCodeDirectory();
      
      // Clean up old QR codes (run daily)
      setInterval(async () => {
        await QRCodeService.cleanupOldQRCodes(30);
      }, 24 * 60 * 60 * 1000); // 24 hours

      logger.info('Services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  public listen(): void {
    this.server.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Frontend URL: ${env.FRONTEND_URL}`);
    });
  }

  public getSocketIO(): SocketIOServer {
    return this.io;
  }
}

// Create and start the application
const app = new Application();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  app.server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  app.server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

app.listen();

export default app;
