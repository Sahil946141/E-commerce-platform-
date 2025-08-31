import Cart from '../models/Cart.js';

const cartController = {
  // Get user's cart
  getCart: async (req, res) => {
    try {
      const cart = await Cart.getOrCreateCart(req.user.user_id);
      res.json(cart);
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ error: 'Failed to fetch cart' });
    }
  },
  
  // Add item to cart
  addToCart: async (req, res) => {
    try {
      const { product_id, size_id, color_id, quantity = 1 } = req.body;
      
      if (!product_id || !size_id || !color_id) {
        return res.status(400).json({ 
          error: 'Product ID, size ID, and color ID are required' 
        });
      }
      
      const cart = await Cart.addItem(req.user.user_id, {
        product_id,
        size_id,
        color_id,
        quantity: parseInt(quantity)
      });
      
      res.status(201).json(cart);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ error: 'Failed to add item to cart' });
    }
  },
  
  // Update cart item quantity
  updateCartItem: async (req, res) => {
    try {
      const { quantity } = req.body;
      const { itemId } = req.params;
      
      if (quantity === undefined) {
        return res.status(400).json({ error: 'Quantity is required' });
      }
      
      const cart = await Cart.updateItem(
        req.user.user_id, 
        parseInt(itemId), 
        parseInt(quantity)
      );
      
      res.json(cart);
    } catch (error) {
      console.error('Update cart item error:', error);
      res.status(500).json({ error: 'Failed to update cart item' });
    }
  },
  
  // Remove item from cart
  removeCartItem: async (req, res) => {
    try {
      const { itemId } = req.params;
      
      const cart = await Cart.removeItem(req.user.user_id, parseInt(itemId));
      res.json(cart);
    } catch (error) {
      console.error('Remove cart item error:', error);
      res.status(500).json({ error: 'Failed to remove item from cart' });
    }
  },
  
  // Clear entire cart
  clearCart: async (req, res) => {
    try {
      const cart = await Cart.clearCart(req.user.user_id);
      res.json(cart);
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({ error: 'Failed to clear cart' });
    }
  },
  
  // Get cart count (for badge)
  getCartCount: async (req, res) => {
    try {
      const count = await Cart.getCartCount(req.user.user_id);
      res.json(count);
    } catch (error) {
      console.error('Get cart count error:', error);
      res.status(500).json({ error: 'Failed to get cart count' });
    }
  }
};

export default cartController;