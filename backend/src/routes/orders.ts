import { Router } from 'express';
import { OrderController } from '@/controllers/orderController';
import { authenticateToken, requireAdmin, requireUser } from '@/middleware/auth';
import { validate } from '@/middleware/validation';

const router = Router();

// Public routes
router.post('/',
  validate(OrderController.validateCreateOrder),
  OrderController.createOrder
);

router.get('/verify-qr',
  OrderController.verifyQRCode
);

// Protected routes (require authentication)
router.get('/',
  authenticateToken,
  OrderController.getOrders
);

router.get('/stats',
  authenticateToken,
  requireAdmin,
  OrderController.getDashboardStats
);

router.get('/:id',
  authenticateToken,
  OrderController.getOrderById
);

router.get('/order/:orderId',
  authenticateToken,
  OrderController.getOrderByOrderId
);

// Admin only routes
router.put('/:orderId/status',
  authenticateToken,
  requireAdmin,
  validate(OrderController.validateUpdateStatus),
  OrderController.updateOrderStatus
);

router.post('/verify-ticket/:orderId',
  authenticateToken,
  requireAdmin,
  OrderController.markTicketVerified
);

router.delete('/:orderId',
  authenticateToken,
  requireAdmin,
  OrderController.deleteOrder
);

export default router;
