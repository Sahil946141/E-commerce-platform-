import express from 'express';
import authController from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/me', authMiddleware.authenticate, authController.getCurrentUser);
router.post('/logout', authMiddleware.authenticate, authController.logout);

export default router;