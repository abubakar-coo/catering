import { Request, Response } from 'express';
import { body, query, param } from 'express-validator';
import { OrderService } from '@/services/orderService';
import { logger } from '@/config/logger';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest, PaginationParams } from '@/types';

export class OrderController {
  static validateCreateOrder = [
    body('fullName').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
    body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
    body('address').optional().trim().isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
    body('eventParticipation').isIn(['YES', 'NO']).withMessage('Event participation must be YES or NO'),
    body('activities').optional().isArray().withMessage('Activities must be an array'),
    body('activityDescription').optional().trim().isLength({ min: 10 }).withMessage('Activity description must be at least 10 characters'),
    body('ticketType').trim().isLength({ min: 2 }).withMessage('Ticket type is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('pricePerTicket').isFloat({ min: 0 }).withMessage('Price per ticket must be a positive number'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
    body('paymentMethod').isIn(['JS_BANK', 'MCB', 'JAZZCASH']).withMessage('Invalid payment method'),
    body('transactionId').optional().trim().isLength({ min: 1 }).withMessage('Transaction ID must not be empty'),
  ];

  static validateUpdateStatus = [
    body('status').isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'VERIFIED']).withMessage('Invalid status'),
  ];

  static validateQRVerification = [
    body('qrData').trim().isLength({ min: 1 }).withMessage('QR data is required'),
  ];

  static createOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const orderData = req.body;

    try {
      const order = await OrderService.createOrder(orderData, userId);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order },
      });
    } catch (error) {
      logger.error('Order creation failed:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Order creation failed',
      });
    }
  });

  static getOrders = asyncHandler(async (req: Request, res: Response) => {
    const pagination: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const filters = {
      status: req.query.status as any,
      userId: req.query.userId as string,
      search: req.query.search as string,
    };

    try {
      const result = await OrderService.getOrders(pagination, filters);

      res.json({
        success: true,
        message: 'Orders retrieved successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Failed to fetch orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
      });
    }
  });

  static getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const order = await OrderService.getOrderById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      res.json({
        success: true,
        message: 'Order retrieved successfully',
        data: { order },
      });
    } catch (error) {
      logger.error('Failed to fetch order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order',
      });
    }
  });

  static getOrderByOrderId = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;

    try {
      const order = await OrderService.getOrderByOrderId(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      res.json({
        success: true,
        message: 'Order retrieved successfully',
        data: { order },
      });
    } catch (error) {
      logger.error('Failed to fetch order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order',
      });
    }
  });

  static updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
      const order = await OrderService.updateOrderStatus(orderId, { status });

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: { order },
      });
    } catch (error) {
      logger.error('Failed to update order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
      });
    }
  });

  static verifyQRCode = asyncHandler(async (req: Request, res: Response) => {
    const { qrData } = req.body;

    try {
      const result = await OrderService.verifyQRCode(qrData);

      if (!result.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid QR code or ticket already verified',
        });
      }

      res.json({
        success: true,
        message: 'QR code verified successfully',
        data: { order: result.order },
      });
    } catch (error) {
      logger.error('QR code verification failed:', error);
      res.status(500).json({
        success: false,
        message: 'QR code verification failed',
      });
    }
  });

  static markTicketVerified = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;

    try {
      const order = await OrderService.markTicketVerified(orderId);

      res.json({
        success: true,
        message: 'Ticket marked as verified',
        data: { order },
      });
    } catch (error) {
      logger.error('Failed to mark ticket as verified:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark ticket as verified',
      });
    }
  });

  static getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await OrderService.getDashboardStats();

      res.json({
        success: true,
        message: 'Dashboard stats retrieved successfully',
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to fetch dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats',
      });
    }
  });

  static deleteOrder = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;

    try {
      await OrderService.deleteOrder(orderId);

      res.json({
        success: true,
        message: 'Order deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete order',
      });
    }
  });
}
