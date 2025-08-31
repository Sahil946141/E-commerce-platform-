// db.js - Updated with product tables (ES Module version)
import { config } from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Verify connection immediately (only once)
pool.once('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize tables with better error handling
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Existing user tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        avatar_url TEXT,
        role VARCHAR(50) DEFAULT 'customer',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `);
    
    // New product tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        parent_id INTEGER REFERENCES categories(category_id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS products (
        product_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        image_url TEXT,
        category_id INTEGER REFERENCES categories(category_id),
        is_on_sale BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS sizes (
        size_id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS colors (
        color_id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        hex_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS inventory (
        inventory_id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(product_id) ON DELETE CASCADE,
        size_id INTEGER REFERENCES sizes(size_id),
        color_id INTEGER REFERENCES colors(color_id),
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, size_id, color_id)
      );
    `);
    await client.query(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount NUMERIC(10,2) NOT NULL,
    shipping_address TEXT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id),
    size_id INTEGER REFERENCES sizes(size_id),
    color_id INTEGER REFERENCES colors(color_id),
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
await client.query(`
  CREATE TABLE IF NOT EXISTS cart (
    cart_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES cart(cart_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(product_id),
    size_id INTEGER REFERENCES sizes(size_id),
    color_id INTEGER REFERENCES colors(color_id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id, size_id, color_id)
  );
`);
    await client.query('COMMIT');
    console.log('✅ All tables verified/created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Table creation error:', err.stack);
    throw err;
  } finally {
    client.release();
  }
};

// Insert sample data for testing
const insertSampleData = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if categories already exist to avoid duplicates
    const existingCategories = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(existingCategories.rows[0].count) === 0) {
      // Insert main categories
      const categories = await client.query(`
        INSERT INTO categories (name, parent_id) VALUES 
        ('Men', NULL),
        ('Women', NULL),
        ('Accessories', NULL),
        ('Sale', NULL)
        RETURNING category_id;
      `);
      
      // Get the inserted category IDs
      const menId = categories.rows[0].category_id;
      const womenId = categories.rows[1].category_id;
      const accessoriesId = categories.rows[2].category_id;
      const saleId = categories.rows[3].category_id;
      
      // Insert subcategories
      await client.query(`
        INSERT INTO categories (name, parent_id) VALUES 
        ('Top', $1),
        ('Bottom', $1),
        ('Footwear', $1),
        ('Top', $2),
        ('Dress', $2),
        ('Footwear', $2),
        ('Jewelry', $3),
        ('Bags', $3),
        ('Hats', $3);
      `, [menId, womenId, accessoriesId]);
      
      console.log('✅ Sample categories inserted');
    }
    
    // Check if sizes already exist
    const existingSizes = await client.query('SELECT COUNT(*) FROM sizes');
    if (parseInt(existingSizes.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO sizes (name) VALUES 
        ('XS'), ('S'), ('M'), ('L'), ('XL'), ('XXL');
      `);
      console.log('✅ Sample sizes inserted');
    }
    
    // Check if colors already exist
    const existingColors = await client.query('SELECT COUNT(*) FROM colors');
    if (parseInt(existingColors.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO colors (name, hex_code) VALUES 
        ('Black', '#000000'),
        ('White', '#FFFFFF'),
        ('Red', '#FF0000'),
        ('Blue', '#0000FF'),
        ('Green', '#00FF00'),
        ('Yellow', '#FFFF00'),
        ('Purple', '#800080'),
        ('Pink', '#FFC0CB'),
        ('Brown', '#A52A2A'),
        ('Gray', '#808080');
      `);
      console.log('✅ Sample colors inserted');
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Sample data insertion error:', err.stack);
  } finally {
    client.release();
  }
};

// Test connection and initialize
(async () => {
  try {
    await pool.query('SELECT NOW()');
    await initDB();
    await insertSampleData();
  } catch (err) {
    console.error('❌ Database initialization failed:', err.stack);
    process.exit(1);
  }
})();

export default pool;