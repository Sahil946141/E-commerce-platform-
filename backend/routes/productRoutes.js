// routes/productRoutes.js
import express from 'express';
import productController from '../controllers/productController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', productController.getAllProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);

// Admin routes - require authentication and admin role
router.post('/', authMiddleware.authenticate, authMiddleware.authorizeRoles('admin'), productController.createProduct);
router.put('/:id', authMiddleware.authenticate, authMiddleware.authorizeRoles('admin'), productController.updateProduct);
router.delete('/:id', authMiddleware.authenticate, authMiddleware.authorizeRoles('admin'), productController.deleteProduct);
router.put('/:id/inventory', authMiddleware.authenticate, authMiddleware.authorizeRoles('admin'), productController.updateInventory);

export default router;