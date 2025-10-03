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

// Sample products for homepage - 2 men, 2 women, 1 accessory
const sampleProducts = [
  {
    name: "Men's White Slim-Fit T-Shirt",
    description: "Classic cotton slim-fit white tee for everyday wear.",
    price: 699,
    image_url: "/images/productshomepage/image2.avif",  // from H&M listing
    category_id: 1,  // Men
    is_on_sale: false
  },
  {
    name: "Men's Black Zip Hoodie",
    description: "Black zip-up hoodie with a sleek and heavyweight design.",
    price: 4680,
    image_url: "/images/productshomepage/image3.jpg",  // sample
    category_id: 1,  // Men
    is_on_sale: false
  },
  {
    name: "Women's White Fitted T-Shirt",
    description: "Fitted white tee designed for a flattering silhouette.",
    price: 499,
    image_url: "/images/productshomepage/image1.avif",  // H&M listing
    category_id: 2,  // Women
    is_on_sale: true
  },
  {
    name: "Women's Polyamide Black Hoodie",
    description: "Black hoodie crafted from polyamide for a lightweight feel.",
    price: 2150,
    image_url: "https://chatgpt.com/?hints=search&q=Zara+Polyamide+Hoodie",  // Zara listing  
    category_id: 2,  // Women
    is_on_sale: true
  },
  {
    name: "Unisex Leather Belt (Accessory)",
    description: "Classic black leather belt with metal buckle — works for both men & women.",
    price: 799,
    image_url: "https://example.com/images/classic-black-leather-belt.jpg",  // placeholder — you'll need real URL  
    category_id: 3,  // Accessories
    is_on_sale: false
  }
]

;

const seedProducts = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting product seeding...');
    
    // Check if products already exist to avoid duplicates
    const existingProducts = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(existingProducts.rows[0].count) > 0) {
      console.log('⚠️ Products already exist in database. Skipping seeding.');
      await client.query('ROLLBACK');
      return;
    }
    
    // Insert products
    for (const product of sampleProducts) {
      const result = await client.query(
        `INSERT INTO products (name, description, price, image_url, category_id, is_on_sale) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING product_id`,
        [product.name, product.description, product.price, product.image_url, product.category_id, product.is_on_sale]
      );
      
      console.log(`✅ Added product: ${product.name}`);
      
      // Add basic inventory for each product (size M, color Black)
      await client.query(
        `INSERT INTO inventory (product_id, size_id, color_id, stock_quantity) 
         VALUES ($1, $2, $3, $4)`,
        [result.rows[0].product_id, 3, 1, 50] // size_id 3 = M, color_id 1 = Black
      );
    }
    
    await client.query('COMMIT');
    console.log('🎉 Product seeding completed successfully!');
    console.log(`📦 Added ${sampleProducts.length} products with basic inventory`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run the seeding
seedProducts().catch(console.error);