// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';

// State Management
let cart = [];
let wishlist = [];
let currentUser = null;

// DOM Elements
const searchInput = document.querySelector('.search-input');
const wishlistIcon = document.querySelector('.wishlist-count');
const cartIcon = document.querySelector('.cart-count');
const cartPreview = document.querySelector('.cart-preview');
const wishlistPreview = document.querySelector('.wishlist-preview');

// Initialize the application
function initGlobalElements() {
  loadCart();
  loadWishlist();
  checkAuthStatus();
  setupEventListeners();
  updateUI();
  updateAuthUI();
}

function updateAuthUI() {
  const authContainer = document.getElementById('auth-container');
  if (!authContainer) return;
  
  const isLoggedIn = checkAuthStatus();
  
  if (isLoggedIn && currentUser) {
    // User is logged in - show profile dropdown
    const firstName = currentUser.full_name ? currentUser.full_name.split(' ')[0] : 'User';
    const userInitial = currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U';
    
    authContainer.innerHTML = `
      <div class="user-profile" id="user-profile">
        <div class="user-avatar">
          ${currentUser.avatar_url ? `<img src="${currentUser.avatar_url}" alt="${currentUser.full_name}">` : userInitial}
        </div>
        <span class="user-greeting">Hi, ${firstName}</span>
        <div class="user-dropdown" id="user-dropdown">
          <a href="profile.html" class="user-dropdown-item">
            <i class="fas fa-user"></i> My Profile
          </a>
          <a href="orders.html" class="user-dropdown-item">
            <i class="fas fa-shopping-bag"></i> My Orders
          </a>
          <a href="wishlist.html" class="user-dropdown-item">
            <i class="fas fa-heart"></i> My Wishlist
          </a>
          <div class="user-dropdown-divider"></div>
          <a href="#" class="user-dropdown-item" id="logout-link">
            <i class="fas fa-sign-out-alt"></i> Logout
          </a>
        </div>
      </div>
    `;
    
    // Add event listeners for dropdown
    const userProfile = document.getElementById('user-profile');
    const userDropdown = document.getElementById('user-dropdown');
    const logoutLink = document.getElementById('logout-link');
    
    if (userProfile) {
      userProfile.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });
    }
    
    if (logoutLink) {
      logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        logout();
      });
    }
    
  } else {
    // User is not logged in - show login/signup buttons
    authContainer.innerHTML = `
      <a href="auth.html?action=login" class="auth-btn login-btn">Login</a>
      <a href="auth.html?action=register" class="auth-btn signup-btn">Sign Up</a>
    `;
  }
}

// Check authentication status
function checkAuthStatus() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const userData = localStorage.getItem(USER_DATA_KEY);

  if (token && userData) {
    try {
      currentUser = JSON.parse(userData);
      return true;
    } catch (e) {
      console.error('Error parsing user data:', e);
      // Clear invalid data
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      currentUser = null;
      return false;
    }
  }
  return false;
}

// Setup event listeners
function setupEventListeners() {
  // Search functionality
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }

  // Cart icon click
  const cartButton = document.querySelector('.icon-btn .fa-shopping-bag')?.closest('.icon-btn');
  if (cartButton) {
    cartButton.addEventListener('click', toggleCartPreview);
  }

  // Wishlist icon click
  if (wishlistIcon) {
    wishlistIcon.addEventListener('click', toggleWishlistPreview);
  }

  // Close previews when clicking outside
  document.addEventListener('click', (e) => {
    if (wishlistIcon && !wishlistIcon.contains(e.target) && wishlistPreview && !wishlistPreview.contains(e.target)) {
      wishlistPreview.style.display = 'none';
    }
    if (cartIcon && !cartIcon.contains(e.target) && cartPreview && !cartPreview.contains(e.target)) {
      cartPreview.style.display = 'none';
    }
    
    // Close user dropdown when clicking outside
    const userDropdown = document.getElementById('user-dropdown');
    const userProfile = document.getElementById('user-profile');
    if (userDropdown && userDropdown.classList.contains('show') && userProfile && !userProfile.contains(e.target)) {
      userDropdown.classList.remove('show');
    }
  });
}

// Load cart from localStorage
function loadCart() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
    } catch (e) {
      console.error('Error parsing cart data:', e);
      cart = [];
    }
  }
}

// Load wishlist from localStorage
function loadWishlist() {
  const savedWishlist = localStorage.getItem('wishlist');
  if (savedWishlist) {
    try {
      wishlist = JSON.parse(savedWishlist);
    } catch (e) {
      console.error('Error parsing wishlist data:', e);
      wishlist = [];
    }
  }
}

// Update UI elements
function updateUI() {
  const cartCount = document.querySelector('.cart-count');
  if (cartCount) {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.setAttribute('data-count', totalItems);
  }

  if (wishlistIcon) {
    wishlistIcon.setAttribute('data-count', wishlist.length);
  }
}

// Handle search functionality
function handleSearch(e) {
  const query = e.target.value.trim();
  if (query.length < 2) return;
  window.location.href = `search.html?q=${encodeURIComponent(query)}`;
}

// Toggle cart preview
function toggleCartPreview() {
  updateCartPreview();
  if (cartPreview) {
    cartPreview.style.display = cartPreview.style.display === 'block' ? 'none' : 'block';
  }
  if (wishlistPreview) {
    wishlistPreview.style.display = 'none';
  }
}

// Toggle wishlist preview (only for logged-in users)
function toggleWishlistPreview() {
  if (!checkAuthStatus()) {
    // Redirect to login with return URL
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `auth.html?action=login&redirect=${currentUrl}`;
    return;
  }
  updateWishlistPreview();
  if (wishlistPreview) {
    wishlistPreview.style.display = wishlistPreview.style.display === 'block' ? 'none' : 'block';
  }
  if (cartPreview) {
    cartPreview.style.display = 'none';
  }
}

// Update cart preview
function updateCartPreview() {
  if (!cartPreview) return;
  
  const container = cartPreview;
  container.innerHTML = '';
  if (cart.length === 0) {
    container.innerHTML = '<p style="padding: 1rem; text-align: center;">Your cart is empty</p>';
    return;
  }
  let total = 0;
  const previewFragment = document.createDocumentFragment();
  cart.slice(0, 3).forEach(item => {
    total += item.price * item.quantity;
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-preview-item';
    cartItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/50'">
      <div>
        <h4>${item.name}</h4>
        <p>$${item.price} x ${item.quantity}</p>
      </div>
    `;
    previewFragment.appendChild(cartItem);
  });
  const totalEl = document.createElement('div');
  totalEl.className = 'cart-preview-total';
  totalEl.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
      <span>Subtotal:</span>
      <span>$${total.toFixed(2)}</span>
    </div>
    <a href="cart.html" class="btn" style="display: block; text-align: center; background: var(--accent); color: white; padding: 0.5rem; border-radius: var(--border-radius); text-decoration: none;">View Cart</a>
  `;
  previewFragment.appendChild(totalEl);
  container.appendChild(previewFragment);
}

// Update wishlist preview
function updateWishlistPreview() {
  if (!wishlistPreview) return;
  
  const container = wishlistPreview;
  container.innerHTML = '';
  if (wishlist.length === 0) {
    container.innerHTML = '<p style="padding: 1rem; text-align: center;">Your wishlist is empty</p>';
    return;
  }
  const previewFragment = document.createDocumentFragment();
  wishlist.slice(0, 3).forEach(item => {
    const wishlistItem = document.createElement('div');
    wishlistItem.className = 'wishlist-preview-item';
    wishlistItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/50'">
      <div>
        <h4>${item.name}</h4>
        <p>$${item.price}</p>
      </div>
    `;
    previewFragment.appendChild(wishlistItem);
  });
  const viewAllLink = document.createElement('a');
  viewAllLink.href = 'wishlist.html';
  viewAllLink.className = 'btn';
  viewAllLink.style.display = 'block';
  viewAllLink.style.textAlign = 'center';
  viewAllLink.style.background = 'var(--accent)';
  viewAllLink.style.color = 'white';
  viewAllLink.style.padding = '0.5rem';
  viewAllLink.style.borderRadius = 'var(--border-radius)';
  viewAllLink.style.textDecoration = 'none';
  viewAllLink.textContent = 'View Wishlist';
  previewFragment.appendChild(viewAllLink);
  container.appendChild(previewFragment);
}

// Enhanced logout function
function logout() {
  // Call backend logout endpoint
  fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}`,
      'Content-Type': 'application/json'
    }
  }).catch(err => console.error('Logout API error:', err));
  
  // Clear local storage
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem('cart');  // Clears cart completely
  currentUser = null;
  
  // Update UI
  updateAuthUI();
  
  // Show notification
  showNotification('You have been logged out successfully.', 'success');
  
  // Redirect to homepage if not already there
  if (!window.location.pathname.endsWith('index.html')) {
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  }
}

// Show notification function
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Add close event
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Function to check if a route is protected
function isProtectedRoute() {
  const protectedRoutes = ['profile.html', 'orders.html', 'wishlist.html', 'checkout.html'];
  const currentPage = window.location.pathname.split('/').pop();
  return protectedRoutes.includes(currentPage);
}

// Function to redirect to login if not authenticated
function requireAuth() {
  if (!checkAuthStatus() && isProtectedRoute()) {
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `auth.html?action=login&redirect=${currentUrl}`;
    return false;
  }
  return true;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initGlobalElements();
  
  // Check if redirected from auth with success message
  const urlParams = new URLSearchParams(window.location.search);
  const authMessage = urlParams.get('authMessage');
  const authMessageType = urlParams.get('authMessageType');
  
  if (authMessage) {
    showNotification(authMessage, authMessageType || 'success');
    
    // Clean URL - but preserve other parameters that might be needed
    const url = new URL(window.location);
    url.searchParams.delete('authMessage');
    url.searchParams.delete('authMessageType');
    window.history.replaceState({}, document.title, url.toString());
  }
});
async function addToCart(productId, sizeId, colorId, quantity = 1) {
  if (!checkAuthStatus()) {
    // Redirect to login with return URL
    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = `auth.html?action=login&redirect=${currentUrl}`;
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/cart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_id: productId,
        size_id: sizeId,
        color_id: colorId,
        quantity: quantity
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const cartData = await response.json();
    
    // Update UI
    updateUI();
    updateCartPreview();
    
    // Show success message
    showNotification('Item added to cart successfully', 'success');
    
    return true;
  } catch (error) {
    console.error('Error adding to cart:', error);
    showNotification('Failed to add item to cart', 'error');
    return false;
  }
}

// Function to get cart count from server (more accurate than localStorage)
async function getCartCountFromServer() {
  if (!checkAuthStatus()) {
    return { item_count: 0, total_quantity: 0 };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/cart/count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const countData = await response.json();
      return countData;
    }
  } catch (error) {
    console.error('Error fetching cart count:', error);
  }
  
  return { item_count: 0, total_quantity: 0 };
}

// Enhanced updateUI function to use server data
async function updateUI() {
  const cartCount = document.querySelector('.cart-count');
  if (cartCount) {
    // Try to get count from server first
    const serverCount = await getCartCountFromServer();
    const totalItems = serverCount.total_quantity || 0;
    cartCount.setAttribute('data-count', totalItems);
  }

  if (wishlistIcon) {
    wishlistIcon.setAttribute('data-count', wishlist.length);
  }
}
// Call this on protected pages
if (isProtectedRoute()) {
  document.addEventListener('DOMContentLoaded', function() {
    if (!requireAuth()) {
      // Stop further execution if not authenticated
      return;
    }
    // Continue loading protected page content
    initGlobalElements();
  });
}