// config.js - API Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api', // Your backend API base URL
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      PROFILE: '/auth/me',
      LOGOUT: '/auth/logout'
    },
    PRODUCTS: {
      LIST: '/products',
      CATEGORIES: '/products/categories',
      FEATURED: '/products/featured',
      SEARCH: '/products/search'
    },
    CART: '/cart',
    ORDERS: '/orders',
    WISHLIST: '/wishlist'
  },
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API_CONFIG;
}