// api.js - API Communication Functions
class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...options.headers
      },
      ...options
    };

    // Add auth token if available
    const token = this.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get authentication token from localStorage
  getToken() {
    return localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token) {
    localStorage.setItem('authToken', token);
  }

  // Remove authentication token
  removeToken() {
    localStorage.removeItem('authToken');
  }

  // Auth API methods
  async login(credentials) {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async register(userData) {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async getProfile() {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
  }

  async logout() {
    this.removeToken();
    // Optionally call backend logout endpoint if needed
  }

  // Products API methods
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `${API_CONFIG.ENDPOINTS.PRODUCTS.LIST}${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getProduct(id) {
    return this.request(`${API_CONFIG.ENDPOINTS.PRODUCTS.LIST}/${id}`);
  }

  async getCategories() {
    return this.request(API_CONFIG.ENDPOINTS.PRODUCTS.CATEGORIES);
  }

  async getFeaturedProducts() {
    return this.request(API_CONFIG.ENDPOINTS.PRODUCTS.FEATURED);
  }

  async searchProducts(query, params = {}) {
    const searchParams = new URLSearchParams({ q: query, ...params }).toString();
    return this.request(`${API_CONFIG.ENDPOINTS.PRODUCTS.SEARCH}?${searchParams}`);
  }

  // Cart API methods
  async getCart() {
    return this.request(API_CONFIG.ENDPOINTS.CART);
  }

  async addToCart(productId, quantity = 1) {
    return this.request(API_CONFIG.ENDPOINTS.CART, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });
  }

  async updateCartItem(itemId, quantity) {
    return this.request(`${API_CONFIG.ENDPOINTS.CART}/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    });
  }

  async removeFromCart(itemId) {
    return this.request(`${API_CONFIG.ENDPOINTS.CART}/${itemId}`, {
      method: 'DELETE'
    });
  }

  // Orders API methods
  async getOrders() {
    return this.request(API_CONFIG.ENDPOINTS.ORDERS);
  }

  async getOrder(id) {
    return this.request(`${API_CONFIG.ENDPOINTS.ORDERS}/${id}`);
  }

  async createOrder(orderData) {
    return this.request(API_CONFIG.ENDPOINTS.ORDERS, {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  // Wishlist API methods
  async getWishlist() {
    return this.request(API_CONFIG.ENDPOINTS.WISHLIST);
  }

  async addToWishlist(productId) {
    return this.request(API_CONFIG.ENDPOINTS.WISHLIST, {
      method: 'POST',
      body: JSON.stringify({ productId })
    });
  }

  async removeFromWishlist(productId) {
    return this.request(`${API_CONFIG.ENDPOINTS.WISHLIST}/${productId}`, {
      method: 'DELETE'
    });
  }
}

// Create a global instance
const apiService = new ApiService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiService;
}