// Product fetching and display functions
class ProductService {
  static async fetchProducts(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`http://localhost:5000/api/products?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      return { products: [] };
    }
  }

  static createProductCard(product) {
    return `
      <div class="product-card" data-product-id="${product.product_id}">
        <div class="product-image">
          <img src="${product.image_url}" alt="${product.name}" loading="lazy">
          ${product.is_on_sale ? '<span class="product-badge">SALE</span>' : ''}
          <div class="product-actions">
            <button class="action-btn wishlist-btn" title="Add to Wishlist">
              <i class="far fa-heart"></i>
            </button>
            <button class="action-btn quick-view-btn" title="Quick View">
              <i class="far fa-eye"></i>
            </button>
          </div>
        </div>
        <div class="product-info">
          <h3>${product.name}</h3>
          <div class="product-price">
            <span class="current-price">${product.price}</span>
            ${product.is_on_sale ? '<span class="original-price">$${(product.price * 1.2).toFixed(2)}</span>' : ''}
          </div>
          <button class="add-to-cart-btn" data-product-id="${product.product_id}">
            Add to Cart
          </button>
        </div>
      </div>
    `;
  }

  static async loadNewArrivals() {
    const data = await this.fetchProducts({ limit: 5 });
    const container = document.getElementById('new-arrivals');
    
    if (container && data.products) {
      container.innerHTML = data.products.map(product => 
        this.createProductCard(product)
      ).join('');
    }
  }

  static async loadSaleItems() {
    const data = await this.fetchProducts({ on_sale: true, limit: 5 });
    const container = document.getElementById('sale-items');
    
    if (container && data.products) {
      container.innerHTML = data.products.map(product => 
        this.createProductCard(product)
      ).join('');
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Load products for homepage sections
  ProductService.loadNewArrivals();
  ProductService.loadSaleItems();
  
  // Add event listeners for cart functionality
  document.addEventListener('click', function(e) {
    if (e.target.closest('.add-to-cart-btn')) {
      const productId = e.target.closest('.add-to-cart-btn').dataset.productId;
      // Add your cart logic here
      console.log('Add to cart:', productId);
    }
  });
});