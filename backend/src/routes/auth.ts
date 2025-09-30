import { Router } from 'express';
import { AuthController } from '@/controllers/authController';
import { authenticateToken } from '@/middleware/auth';
import { validate } from '@/middleware/validation';

const router = Router();

// Public routes
router.post('/register', 
  validate(AuthController.validateRegister),
  AuthController.register
);

router.post('/login', 
  validate(AuthController.validateLogin),
  AuthController.login
);

router.post('/refresh-token', 
  AuthController.refreshToken
);

// Protected routes
router.get('/profile', 
  authenticateToken,
  AuthController.getProfile
);

router.post('/logout', 
  AuthController.logout
);

export default router;
