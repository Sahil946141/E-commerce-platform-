// init.js - Initialize API and global functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is already logged in
  const token = apiService.getToken();
  if (token) {
    // Fetch user profile and update UI
    apiService.getProfile()
      .then(profile => {
        updateUserUI(profile);
      })
      .catch(error => {
        console.error('Failed to fetch profile:', error);
        apiService.removeToken(); // Remove invalid token
      });
  }
  
  // Load categories for navigation
  loadCategories();
  
  // Load featured products
  loadFeaturedProducts();
});

// Function to update UI with user data
function updateUserUI(user) {
  const userElements = document.querySelectorAll('.user-name, .user-avatar');
  userElements.forEach(element => {
    if (element.classList.contains('user-name')) {
      element.textContent = user.name || user.email;
    }
    if (element.classList.contains('user-avatar')) {
      // Set avatar image if available
      if (user.avatar) {
        element.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
      }
    }
  });
  
  // Update auth buttons
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  
  if (loginBtn && signupBtn) {
    loginBtn.textContent = 'Log Out';
    loginBtn.onclick = () => apiService.logout().then(() => window.location.reload());
    signupBtn.style.display = 'none';
  }
}

// Function to load categories
async function loadCategories() {
  try {
    const categories = await apiService.getCategories();
    // Update your categories navigation with real data
    updateCategoriesUI(categories);
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// Function to load featured products
async function loadFeaturedProducts() {
  try {
    const products = await apiService.getFeaturedProducts();
    // Update featured products section with real data
    updateFeaturedProductsUI(products);
  } catch (error) {
    console.error('Failed to load featured products:', error);
  }
}

// UI update functions (to be implemented based on your HTML structure)
function updateCategoriesUI(categories) {
  // Implementation depends on your HTML structure
  console.log('Categories loaded:', categories);
}

function updateFeaturedProductsUI(products) {
  // Implementation depends on your HTML structure
  console.log('Featured products loaded:', products);
}