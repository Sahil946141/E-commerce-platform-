import Order from '../models/Order.js';

const orderController = {
  // Create a new order
  createOrder: async (req, res) => {
    try {
      const { total_amount, shipping_address, payment_method, items } = req.body;
      
      if (!total_amount || !shipping_address || !payment_method || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required order fields' });
      }
      
      const order = await Order.create(req.user.user_id, {
        total_amount,
        shipping_address,
        payment_method,
        items
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  },
  
  // Get user's orders
  getUserOrders: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status || null;
      
      const orders = await Order.findByUserId(req.user.user_id, limit, offset, status);
      const totalOrders = await Order.getCount(req.user.user_id, status);
      const totalPages = Math.ceil(totalOrders / limit);
      
      res.json({
        orders,
        pagination: {
          current: page,
          total: totalPages,
          count: orders.length,
          totalOrders
        }
      });
    } catch (error) {
      console.error('Get user orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  },
  
  // Get order by ID
  getOrderById: async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Check if user owns this order or is admin
      if (order.user_id !== req.user.user_id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to view this order' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  },
  
  // Get all orders (admin only)
  getAllOrders: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status || null;
      
      const orders = await Order.getAll(limit, offset, status);
      const totalOrders = await Order.getCount(null, status);
      const totalPages = Math.ceil(totalOrders / limit);
      
      res.json({
        orders,
        pagination: {
          current: page,
          total: totalPages,
          count: orders.length,
          totalOrders
        }
      });
    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  },
  
  // Update order status (admin only)
  updateOrderStatus: async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const validStatuses = ['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const order = await Order.updateStatus(req.params.id, status);
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  },
  
  // Add this method to orderController.js
  checkoutFromCart: async (req, res) => {
    try {
      const { shipping_address, payment_method } = req.body;
      
      if (!shipping_address || !payment_method) {
        return res.status(400).json({ error: 'Shipping address and payment method are required' });
      }
      
      // Get user's cart
      const Cart = await import('../models/Cart.js');
      const cart = await Cart.default.getOrCreateCart(req.user.user_id);
      
      if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
      }
      
      // Calculate total amount
      const total_amount = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
      
      // Convert cart items to order items format
      const items = cart.items.map(item => ({
        product_id: item.product_id,
        size_id: item.size_id,
        color_id: item.color_id,
        quantity: item.quantity,
        price: item.price
      }));
      
      // Create order
      const order = await Order.create(req.user.user_id, {
        total_amount,
        shipping_address,
        payment_method,
        items,
        cart_id: cart.cart_id // Pass cart ID to clear it after order creation
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error('Checkout from cart error:', error);
      res.status(500).json({ error: 'Failed to checkout from cart' });
    }
  }
};

export default orderController;