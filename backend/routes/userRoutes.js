import express from 'express';
import userController from '../controllers/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.authenticate);

// Get current user profile
router.get('/profile', userController.getProfile);

// Update current user profile (changed route name)
router.put('/profile/update', userController.updateProfile);

// Admin only routes
router.get('/admin/users', authMiddleware.authorizeRoles('admin'), userController.getAllUsers);
router.get('/admin/users/:id', authMiddleware.authorizeRoles('admin'), userController.getUserById);
router.delete('/admin/users/:id', authMiddleware.authorizeRoles('admin'), userController.deactivateUser);

// User can deactivate their own account
router.delete('/profile/deactivate', userController.deactivateUser);

export default router;