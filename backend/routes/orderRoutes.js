import express from 'express';
import orderController from '../controllers/orderController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.authenticate);

// Customer routes
router.post('/', orderController.createOrder);
router.post('/checkout/cart', orderController.checkoutFromCart); // Add this line
router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);

// Admin routes
router.get('/admin/orders', authMiddleware.authorizeRoles('admin'), orderController.getAllOrders);
router.put('/admin/orders/:id/status', authMiddleware.authorizeRoles('admin'), orderController.updateOrderStatus);

export default router;