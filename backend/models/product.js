// models/Product.js
import db from '../config/db.js';

class Product {
  // Get all products with optional filtering and pagination
  static async getAll({ limit = 10, offset = 0, category = null, parent_category = null, on_sale = null } = {}) {
    let query = `
      SELECT 
        p.product_id, 
        p.name, 
        p.description, 
        p.price, 
        p.image_url, 
        p.is_on_sale,
        p.created_at,
        p.updated_at,
        c.category_id,
        c.name as category_name,
        parent.name as parent_category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN categories parent ON c.parent_id = parent.category_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // NEW: Support for parent_category + category combination
    if (parent_category && category) {
      paramCount++;
      query += ` AND parent.name ILIKE $${paramCount} AND c.name ILIKE $${paramCount + 1}`;
      params.push(`%${parent_category}%`, `%${category}%`);
      paramCount++; // Increment again for the second parameter
    }
    else if (parent_category) {
      paramCount++;
      query += ` AND parent.name ILIKE $${paramCount}`;
      params.push(`%${parent_category}%`);
    }
    else if (category) {
      paramCount++;
      query += ` AND (c.name ILIKE $${paramCount} OR parent.name ILIKE $${paramCount})`;
      params.push(`%${category}%`);
    }
    
    if (on_sale !== null) {
      paramCount++;
      query += ` AND p.is_on_sale = $${paramCount}`;
      params.push(on_sale);
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    return result.rows;
  }
  
  // Get product by ID with details
  static async findById(product_id) {
    const productResult = await db.query(`
      SELECT 
        p.*,
        c.name as category_name,
        parent.name as parent_category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN categories parent ON c.parent_id = parent.category_id
      WHERE p.product_id = $1
    `, [product_id]);
    
    if (productResult.rows.length === 0) {
      return null;
    }
    
    const product = productResult.rows[0];
    
    // Get inventory with size and color details
    const inventoryResult = await db.query(`
      SELECT 
        i.inventory_id,
        i.stock_quantity,
        s.size_id,
        s.name as size_name,
        c.color_id,
        c.name as color_name,
        c.hex_code as color_hex
      FROM inventory i
      LEFT JOIN sizes s ON i.size_id = s.size_id
      LEFT JOIN colors c ON i.color_id = c.color_id
      WHERE i.product_id = $1
      ORDER BY s.name, c.name
    `, [product_id]);
    
    product.inventory = inventoryResult.rows;
    
    return product;
  }
  
  // Create a new product
  static async create(productData) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const { name, description, price, image_url, category_id, is_on_sale } = productData;
      
      const productResult = await client.query(`
        INSERT INTO products (name, description, price, image_url, category_id, is_on_sale)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [name, description, price, image_url, category_id, is_on_sale || false]);
      
      await client.query('COMMIT');
      return productResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Update a product
  static async update(product_id, productData) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const { name, description, price, image_url, category_id, is_on_sale } = productData;
      
      const productResult = await client.query(`
        UPDATE products 
        SET name = $1, description = $2, price = $3, image_url = $4, 
            category_id = $5, is_on_sale = $6, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $7
        RETURNING *
      `, [name, description, price, image_url, category_id, is_on_sale, product_id]);
      
      await client.query('COMMIT');
      return productResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Delete a product
  static async delete(product_id) {
    const result = await db.query(
      'DELETE FROM products WHERE product_id = $1 RETURNING product_id',
      [product_id]
    );
    return result.rows[0];
  }
  
  // Update inventory for a product
  static async updateInventory(product_id, size_id, color_id, stock_quantity) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Check if inventory record exists
      const existingInventory = await client.query(
        'SELECT * FROM inventory WHERE product_id = $1 AND size_id = $2 AND color_id = $3',
        [product_id, size_id, color_id]
      );
      
      let result;
      if (existingInventory.rows.length > 0) {
        // Update existing inventory
        result = await client.query(`
          UPDATE inventory 
          SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2 AND size_id = $3 AND color_id = $4
          RETURNING *
        `, [stock_quantity, product_id, size_id, color_id]);
      } else {
        // Create new inventory record
        result = await client.query(`
          INSERT INTO inventory (product_id, size_id, color_id, stock_quantity)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [product_id, size_id, color_id, stock_quantity]);
      }
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Get all categories
 static async getCategories() {
  const result = await db.query(`
    WITH RECURSIVE category_tree AS (
      SELECT 
        category_id, 
        name, 
        parent_id, 
        name::TEXT AS path  -- CAST to TEXT explicitly
      FROM categories 
      WHERE parent_id IS NULL
      
      UNION ALL
      
      SELECT 
        c.category_id, 
        c.name, 
        c.parent_id, 
        (ct.path || ' > ' || c.name)::TEXT  -- CAST to TEXT explicitly
      FROM categories c
      INNER JOIN category_tree ct ON c.parent_id = ct.category_id
    )
    SELECT * FROM category_tree ORDER BY path;
  `);
  return result.rows;
}
  
  // Get count of products for pagination
  static async getCount(filters = {}) {
    let query = 'SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.category_id LEFT JOIN categories parent ON c.parent_id = parent.category_id WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    // NEW: Support for parent_category + category combination
    if (filters.parent_category && filters.category) {
      paramCount++;
      query += ` AND parent.name ILIKE $${paramCount} AND c.name ILIKE $${paramCount + 1}`;
      params.push(`%${filters.parent_category}%`, `%${filters.category}%`);
      paramCount++; // Increment again for the second parameter
    }
    else if (filters.parent_category) {
      paramCount++;
      query += ` AND parent.name ILIKE $${paramCount}`;
      params.push(`%${filters.parent_category}%`);
    }
    else if (filters.category) {
      paramCount++;
      query += ` AND (c.name ILIKE $${paramCount} OR parent.name ILIKE $${paramCount})`;
      params.push(`%${filters.category}%`);
    }
    
    if (filters.on_sale !== undefined) {
      paramCount++;
      query += ` AND p.is_on_sale = $${paramCount}`;
      params.push(filters.on_sale);
    }
    
    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }
}

export default Product;