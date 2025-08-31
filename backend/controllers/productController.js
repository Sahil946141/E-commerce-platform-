// controllers/productController.js
import Product from '../models/product.js';

const productController = {
  // Get all products with optional filtering
  getAllProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      const filters = {};
      if (req.query.category) filters.category = req.query.category;
      if (req.query.parent_category) filters.parent_category = req.query.parent_category; // NEW
      if (req.query.on_sale !== undefined) filters.on_sale = req.query.on_sale === 'true';
      
      const products = await Product.getAll({ limit, offset, ...filters });
      const totalProducts = await Product.getCount(filters);
      const totalPages = Math.ceil(totalProducts / limit);
      
      res.json({
        products,
        pagination: {
          current: page,
          total: totalPages,
          count: products.length,
          totalProducts
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  },
  
  // Get single product by ID
  getProductById: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  },
  
  // Create a new product (admin only)
  createProduct: async (req, res) => {
    try {
      const { name, description, price, image_url, category_id, is_on_sale } = req.body;
      
      if (!name || !price || !category_id) {
        return res.status(400).json({ error: 'Name, price, and category are required' });
      }
      
      const product = await Product.create({
        name,
        description,
        price,
        image_url,
        category_id,
        is_on_sale
      });
      
      res.status(201).json(product);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  },
  
  // Update a product (admin only)
  updateProduct: async (req, res) => {
    try {
      const { name, description, price, image_url, category_id, is_on_sale } = req.body;
      
      const product = await Product.update(req.params.id, {
        name,
        description,
        price,
        image_url,
        category_id,
        is_on_sale
      });
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(product);
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  },
  
  // Delete a product (admin only)
  deleteProduct: async (req, res) => {
    try {
      const product = await Product.delete(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  },
  
  // Update product inventory (admin only)
  updateInventory: async (req, res) => {
    try {
      const { size_id, color_id, stock_quantity } = req.body;
      
      if (!size_id || !color_id || stock_quantity === undefined) {
        return res.status(400).json({ error: 'Size ID, color ID, and stock quantity are required' });
      }
      
      const inventory = await Product.updateInventory(
        req.params.id, 
        size_id, 
        color_id, 
        stock_quantity
      );
      
      res.json(inventory);
    } catch (error) {
      console.error('Update inventory error:', error);
      res.status(500).json({ error: 'Failed to update inventory' });
    }
  },
  
  // Get all categories
  getCategories: async (req, res) => {
    try {
      const categories = await Product.getCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
};

export default productController;