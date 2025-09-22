// Admin Authentication Utility - Test uchun
export const AdminAuth = {
  // Test uchun hardcoded admin user
  currentUser: {
    uid: 'admin',
    email: 'admin@zamonbooks.uz',
    displayName: 'Zamon Books Admin',
    role: 'admin'
  },
  
  // Admin login (test uchun)
  async login(email, password) {
    if (email === 'admin@zamonbooks.uz' && password === 'admin123') {
      return this.currentUser;
    }
    throw new Error('Invalid credentials');
  },
  
  // Current user olish
  getCurrentUser() {
    return this.currentUser;
  },
  
  // Admin ekanligini tekshirish
  isAdmin() {
    return this.currentUser?.role === 'admin';
  },
  
  // Logout
  logout() {
    // Test uchun hech narsa qilmaymiz
    return true;
  }
};

// Global admin state
window.adminAuth = AdminAuth;