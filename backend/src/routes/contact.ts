import { Router } from 'express';
import { body } from 'express-validator';
import { prisma } from '@/config/database';
import { EmailService } from '@/services/emailService';
import { logger } from '@/config/logger';
import { asyncHandler } from '@/middleware/errorHandler';
import { authenticateToken, requireAdmin } from '@/middleware/auth';

const router = Router();

const validateContactMessage = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
];

// Public route
router.post('/',
  validateContactMessage,
  asyncHandler(async (req, res) => {
    const { name, phone, email, message } = req.body;

    try {
      const contactMessage = await prisma.contactMessage.create({
        data: {
          name,
          phone,
          email,
          message,
        },
      });

      // Send notification email to admin
      try {
        await EmailService.sendContactNotification(contactMessage);
      } catch (emailError) {
        logger.error('Failed to send contact notification email:', emailError);
        // Don't fail the contact submission if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { message: contactMessage },
      });
    } catch (error) {
      logger.error('Contact message creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
      });
    }
  })
);

// Admin routes
router.get('/',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contactMessage.count(),
    ]);

    res.json({
      success: true,
      message: 'Contact messages retrieved successfully',
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  })
);

router.get('/stats',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [totalMessages, unreadMessages] = await Promise.all([
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { status: 'unread' } }),
    ]);

    res.json({
      success: true,
      message: 'Contact message stats retrieved successfully',
      data: {
        totalMessages,
        unreadMessages,
      },
    });
  })
);

router.put('/:id/mark-read',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const message = await prisma.contactMessage.update({
      where: { id },
      data: { status: 'read' },
    });

    res.json({
      success: true,
      message: 'Message marked as read',
      data: { message },
    });
  })
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.contactMessage.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  })
);

export default router;
