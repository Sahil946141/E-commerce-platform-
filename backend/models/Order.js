import db from '../config/db.js';

class Order {
  // Create a new order with items
  static async create(user_id, orderData) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const { total_amount, shipping_address, payment_method, items } = orderData;
      
      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total_amount, shipping_address, payment_method)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [user_id, total_amount, shipping_address, payment_method]
      );
      
      const order = orderResult.rows[0];
      
      // Insert order items and update inventory
      for (const item of items) {
        // Insert order item
        await client.query(
          `INSERT INTO order_items (order_id, product_id, size_id, color_id, quantity, price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.order_id, item.product_id, item.size_id, item.color_id, item.quantity, item.price]
        );
        
        // Update inventory (reduce stock)
        await client.query(
          `UPDATE inventory 
           SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP
           WHERE product_id = $2 AND size_id = $3 AND color_id = $4`,
          [item.quantity, item.product_id, item.size_id, item.color_id]
        );
      }
      
      if (orderData.cart_id) {
        await client.query(
          'DELETE FROM cart_items WHERE cart_id = $1',
          [orderData.cart_id]
        );
      }
      
      await client.query('COMMIT');
      return await this.findById(order.order_id); // Return full order details
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Get orders by user ID
  static async findByUserId(user_id, limit = 10, offset = 0, status = null) {
    let query = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'order_item_id', oi.order_item_id,
                 'product_id', oi.product_id,
                 'product_name', p.name,
                 'image_url', p.image_url,
                 'size_id', oi.size_id,
                 'size_name', s.name,
                 'color_id', oi.color_id,
                 'color_name', c.name,
                 'color_hex', c.hex_code,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.product_id
       LEFT JOIN sizes s ON oi.size_id = s.size_id
       LEFT JOIN colors c ON oi.color_id = c.color_id
       WHERE o.user_id = $1
    `;
    
    const params = [user_id];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }
    
    query += ` GROUP BY o.order_id
               ORDER BY o.created_at DESC
               LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    
    params.push(limit, offset);
    
    const ordersResult = await db.query(query, params);
    return ordersResult.rows;
  }
  
  // Get order by ID
  static async findById(order_id) {
    const orderResult = await db.query(
      `SELECT o.*, 
              json_agg(
                json_build_object(
                  'order_item_id', oi.order_item_id,
                  'product_id', oi.product_id,
                  'product_name', p.name,
                  'image_url', p.image_url,
                  'size_id', oi.size_id,
                  'size_name', s.name,
                  'color_id', oi.color_id,
                  'color_name', c.name,
                  'color_hex', c.hex_code,
                  'quantity', oi.quantity,
                  'price', oi.price
                )
              ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.product_id
       LEFT JOIN sizes s ON oi.size_id = s.size_id
       LEFT JOIN colors c ON oi.color_id = c.color_id
       WHERE o.order_id = $1
       GROUP BY o.order_id`,
      [order_id]
    );
    
    return orderResult.rows[0];
  }
  
  // Get all orders (for admin)
  static async getAll(limit = 10, offset = 0, status = null) {
    let query = `
      SELECT o.*, 
             u.email as user_email,
             u.full_name as user_name,
             COUNT(oi.order_item_id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` WHERE o.status = $${paramCount}`;
      params.push(status);
    }
    
    query += ` GROUP BY o.order_id, u.user_id
               ORDER BY o.created_at DESC
               LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    
    params.push(limit, offset);
    
    const ordersResult = await db.query(query, params);
    return ordersResult.rows;
  }
  
  // Update order status
  static async updateStatus(order_id, status) {
    const result = await db.query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE order_id = $2 RETURNING *`,
      [status, order_id]
    );
    
    return result.rows[0];
  }
  
  // Get count of orders for pagination
  static async getCount(user_id = null, status = null) {
    let query = 'SELECT COUNT(*) FROM orders';
    const params = [];
    let paramCount = 0;
    
    if (user_id) {
      paramCount++;
      query += ` WHERE user_id = $${paramCount}`;
      params.push(user_id);
    }
    
    if (status) {
      if (paramCount > 0) {
        query += ` AND status = $${paramCount + 1}`;
      } else {
        query += ` WHERE status = $${paramCount + 1}`;
      }
      params.push(status);
    }
    
    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }
}

export default Order;