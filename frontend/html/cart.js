// Cart-specific functionality for cart.html
class CartPage {
  constructor() {
    this.cartItems = [];
    this.init();
  }

  async init() {
    // Check authentication first
    if (!this.checkAuth()) {
      return;
    }

    // Load cart data
    await this.loadCartData();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  checkAuth() {
    // Use global.js function to check if user is authenticated
    if (typeof requireAuth === 'function' && !requireAuth()) {
      return false;
    }
    
    // If requireAuth is not available, check manually
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = `auth.html?action=login&redirect=${encodeURIComponent(window.location.href)}`;
      return false;
    }
    
    return true;
  }

  async loadCartData() {
    try {
      this.showLoadingState();
      
      const response = await fetch(`${API_BASE_URL}/cart`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const cartData = await response.json();
      this.cartItems = cartData.items || [];
      
      this.renderCart();
    } catch (error) {
      console.error('Error loading cart:', error);
      this.showErrorState();
    }
  }

  showLoadingState() {
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('empty-cart').style.display = 'none';
    document.getElementById('cart-with-items').style.display = 'none';
  }

  showErrorState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('empty-cart').style.display = 'none';
    document.getElementById('cart-with-items').style.display = 'none';
  }

  showEmptyCartState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('empty-cart').style.display = 'block';
    document.getElementById('cart-with-items').style.display = 'none';
  }

  showCartWithItems() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('empty-cart').style.display = 'none';
    document.getElementById('cart-with-items').style.display = 'grid';
  }

  renderCart() {
    if (this.cartItems.length === 0) {
      this.showEmptyCartState();
      return;
    }

    this.showCartWithItems();
    
    // Render cart items
    const cartItemsContainer = document.getElementById('cart-items-list');
    cartItemsContainer.innerHTML = '';
    
    this.cartItems.forEach(item => {
      const itemElement = this.createCartItemElement(item);
      cartItemsContainer.appendChild(itemElement);
    });
    
    // Update summary
    this.updateCartSummary();
  }

  createCartItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'cart-item';
    itemElement.setAttribute('data-item-id', item.cart_item_id);
    
    const subtotal = (item.price * item.quantity).toFixed(2);
    
    itemElement.innerHTML = `
      <img src="${item.image_url || 'https://via.placeholder.com/100'}" 
           alt="${item.product_name}" 
           class="cart-item-image"
           onerror="this.src='https://via.placeholder.com/100'">
      
      <div class="cart-item-details">
        <h3>${item.product_name}</h3>
        <p>Size: ${item.size_name}</p>
        <p>Color: ${item.color_name}</p>
        <div class="cart-item-price">$${item.price}</div>
      </div>
      
      <div class="quantity-controls">
        <button class="quantity-btn decrease-btn" data-item-id="${item.cart_item_id}">-</button>
        <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
               data-item-id="${item.cart_item_id}">
        <button class="quantity-btn increase-btn" data-item-id="${item.cart_item_id}">+</button>
      </div>
      
      <div class="cart-item-subtotal">$${subtotal}</div>
      
      <button class="remove-item" data-item-id="${item.cart_item_id}" title="Remove item">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    return itemElement;
  }

  updateCartSummary() {
    const subtotal = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
    const tax = subtotal * 0.08; // 8% tax
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('shipping').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${(subtotal + shipping + tax).toFixed(2)}`;
  }

  setupEventListeners() {
    // Delegate events for dynamic elements
    document.getElementById('cart-items-list').addEventListener('click', (e) => {
      const target = e.target;
      const itemId = target.closest('[data-item-id]')?.getAttribute('data-item-id');
      
      if (!itemId) return;
      
      if (target.classList.contains('decrease-btn') || target.closest('.decrease-btn')) {
        this.decreaseQuantity(itemId);
      } else if (target.classList.contains('increase-btn') || target.closest('.increase-btn')) {
        this.increaseQuantity(itemId);
      } else if (target.classList.contains('remove-item') || target.closest('.remove-item')) {
        this.removeItem(itemId);
      }
    });
    
    // Input change events for direct quantity editing
    document.getElementById('cart-items-list').addEventListener('change', (e) => {
      if (e.target.classList.contains('quantity-input')) {
        const itemId = e.target.getAttribute('data-item-id');
        const newQuantity = parseInt(e.target.value);
        
        if (newQuantity > 0) {
          this.updateQuantity(itemId, newQuantity);
        } else {
          // Reset to previous value if invalid
          const item = this.cartItems.find(i => i.cart_item_id == itemId);
          if (item) {
            e.target.value = item.quantity;
          }
        }
      }
    });
    
    // Checkout button
    document.getElementById('checkout-btn').addEventListener('click', () => {
      this.proceedToCheckout();
    });
  }

  async decreaseQuantity(itemId) {
    const item = this.cartItems.find(i => i.cart_item_id == itemId);
    if (!item) return;
    
    const newQuantity = item.quantity - 1;
    
    if (newQuantity <= 0) {
      this.removeItem(itemId);
    } else {
      await this.updateQuantity(itemId, newQuantity);
    }
  }

  async increaseQuantity(itemId) {
    const item = this.cartItems.find(i => i.cart_item_id == itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + 1;
    await this.updateQuantity(itemId, newQuantity);
  }

  async updateQuantity(itemId, newQuantity) {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedCart = await response.json();
      this.cartItems = updatedCart.items || [];
      
      this.renderCart();
      
      // Update global cart count
      if (typeof updateUI === 'function') {
        updateUI();
      }
      
      if (typeof showNotification === 'function') {
        showNotification('Cart updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      
      if (typeof showNotification === 'function') {
        showNotification('Failed to update cart', 'error');
      }
      
      // Reload cart to sync with server
      this.loadCartData();
    }
  }

  async removeItem(itemId) {
    if (!confirm('Are you sure you want to remove this item from your cart?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedCart = await response.json();
      this.cartItems = updatedCart.items || [];
      
      this.renderCart();
      
      // Update global cart count
      if (typeof updateUI === 'function') {
        updateUI();
      }
      
      if (typeof showNotification === 'function') {
        showNotification('Item removed from cart', 'success');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      
      if (typeof showNotification === 'function') {
        showNotification('Failed to remove item', 'error');
      }
      
      // Reload cart to sync with server
      this.loadCartData();
    }
  }

  proceedToCheckout() {
    if (this.cartItems.length === 0) {
      if (typeof showNotification === 'function') {
        showNotification('Your cart is empty', 'error');
      }
      return;
    }
    
    // Redirect to checkout page
    window.location.href = 'checkout.html';
  }
}

// Initialize cart page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  new CartPage();
});