import db from '../config/db.js';

class Cart {
  // Get or create cart for user
  static async getOrCreateCart(user_id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Check if user already has a cart
      let cartResult = await client.query(
        'SELECT * FROM cart WHERE user_id = $1',
        [user_id]
      );
      
      let cart;
      if (cartResult.rows.length === 0) {
        // Create new cart
        cartResult = await client.query(
          'INSERT INTO cart (user_id) VALUES ($1) RETURNING *',
          [user_id]
        );
        cart = cartResult.rows[0];
      } else {
        cart = cartResult.rows[0];
      }
      
      // Get cart items with product details
      const itemsResult = await client.query(`
        SELECT 
          ci.cart_item_id,
          ci.quantity,
          ci.price,
          p.product_id,
          p.name as product_name,
          p.image_url,
          s.size_id,
          s.name as size_name,
          c.color_id,
          c.name as color_name,
          c.hex_code as color_hex,
          inv.stock_quantity as available_stock
        FROM cart_items ci
        LEFT JOIN products p ON ci.product_id = p.product_id
        LEFT JOIN sizes s ON ci.size_id = s.size_id
        LEFT JOIN colors c ON ci.color_id = c.color_id
        LEFT JOIN inventory inv ON (
          ci.product_id = inv.product_id AND 
          ci.size_id = inv.size_id AND 
          ci.color_id = inv.color_id
        )
        WHERE ci.cart_id = $1
        ORDER by ci.created_at DESC
      `, [cart.cart_id]);
      
      await client.query('COMMIT');
      
      return {
        ...cart,
        items: itemsResult.rows
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Add item to cart
  static async addItem(user_id, { product_id, size_id, color_id, quantity }) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Get or create cart
      let cartResult = await client.query(
        'SELECT * FROM cart WHERE user_id = $1',
        [user_id]
      );
      
      let cart;
      if (cartResult.rows.length === 0) {
        cartResult = await client.query(
          'INSERT INTO cart (user_id) VALUES ($1) RETURNING *',
          [user_id]
        );
        cart = cartResult.rows[0];
      } else {
        cart = cartResult.rows[0];
      }
      
      // Get product price
      const productResult = await client.query(
        'SELECT price FROM products WHERE product_id = $1',
        [product_id]
      );
      
      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }
      
      const price = productResult.rows[0].price;
      
      // Check if item already exists in cart
      const existingItemResult = await client.query(
        `SELECT cart_item_id, quantity FROM cart_items 
         WHERE cart_id = $1 AND product_id = $2 AND size_id = $3 AND color_id = $4`,
        [cart.cart_id, product_id, size_id, color_id]
      );
      
      let item;
      if (existingItemResult.rows.length > 0) {
        // Update quantity
        const newQuantity = existingItemResult.rows[0].quantity + quantity;
        item = await client.query(
          `UPDATE cart_items 
           SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE cart_item_id = $2 RETURNING *`,
          [newQuantity, existingItemResult.rows[0].cart_item_id]
        );
      } else {
        // Add new item
        item = await client.query(
          `INSERT INTO cart_items (cart_id, product_id, size_id, color_id, quantity, price)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [cart.cart_id, product_id, size_id, color_id, quantity, price]
        );
      }
      
      await client.query('COMMIT');
      return await this.getOrCreateCart(user_id); // Return full cart
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Update cart item quantity
  static async updateItem(user_id, cart_item_id, quantity) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Verify user owns this cart item
      const verifyResult = await client.query(`
        SELECT ci.cart_item_id 
        FROM cart_items ci
        JOIN cart c ON ci.cart_id = c.cart_id
        WHERE ci.cart_item_id = $1 AND c.user_id = $2
      `, [cart_item_id, user_id]);
      
      if (verifyResult.rows.length === 0) {
        throw new Error('Cart item not found or not owned by user');
      }
      
      let result;
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        result = await client.query(
          'DELETE FROM cart_items WHERE cart_item_id = $1 RETURNING *',
          [cart_item_id]
        );
      } else {
        // Update quantity
        result = await client.query(
          `UPDATE cart_items 
           SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE cart_item_id = $2 RETURNING *`,
          [quantity, cart_item_id]
        );
      }
      
      await client.query('COMMIT');
      return await this.getOrCreateCart(user_id); // Return full cart
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Remove item from cart
  static async removeItem(user_id, cart_item_id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Verify user owns this cart item
      const verifyResult = await client.query(`
        SELECT ci.cart_item_id 
        FROM cart_items ci
        JOIN cart c ON ci.cart_id = c.cart_id
        WHERE ci.cart_item_id = $1 AND c.user_id = $2
      `, [cart_item_id, user_id]);
      
      if (verifyResult.rows.length === 0) {
        throw new Error('Cart item not found or not owned by user');
      }
      
      await client.query(
        'DELETE FROM cart_items WHERE cart_item_id = $1',
        [cart_item_id]
      );
      
      await client.query('COMMIT');
      return await this.getOrCreateCart(user_id); // Return full cart
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Clear entire cart
  static async clearCart(user_id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Get user's cart
      const cartResult = await client.query(
        'SELECT cart_id FROM cart WHERE user_id = $1',
        [user_id]
      );
      
      if (cartResult.rows.length === 0) {
        return { message: 'Cart is already empty' };
      }
      
      await client.query(
        'DELETE FROM cart_items WHERE cart_id = $1',
        [cartResult.rows[0].cart_id]
      );
      
      await client.query('COMMIT');
      return await this.getOrCreateCart(user_id); // Return empty cart
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Get cart count (for badge)
  static async getCartCount(user_id) {
    const result = await db.query(`
      SELECT COUNT(ci.cart_item_id) as item_count, COALESCE(SUM(ci.quantity), 0) as total_quantity
      FROM cart_items ci
      JOIN cart c ON ci.cart_id = c.cart_id
      WHERE c.user_id = $1
    `, [user_id]);
    
    return result.rows[0];
  }
}

export default Cart;