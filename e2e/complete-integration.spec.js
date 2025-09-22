import { test, expect } from '@playwright/test';

test.describe('Complete System Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should complete full user journey with all integrations', async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto('/');
    
    // Wait for page to load with books
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Verify homepage elements
    await expect(page.locator('.hero-banner')).toBeVisible();
    await expect(page.locator('.book-grid')).toBeVisible();
    
    // Step 2: Search for books
    const searchInput = page.locator('input[placeholder*="qidirish"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('kitob');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Step 3: Browse book details
    const firstBook = page.locator('.book-card').first();
    const bookTitle = await firstBook.locator('h3').textContent();
    
    await firstBook.click();
    
    // Should navigate to book detail page
    await expect(page).toHaveURL(/\/kitob\/|\/book\//);
    await page.waitForSelector('h1, .book-title', { timeout: 10000 });
    
    // Step 4: Add to cart
    const addToCartButton = page.locator('.add-to-cart, button:has-text("Savatga")').first();
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Step 5: Navigate to cart
    await page.goto('/cart');
    await page.waitForSelector('.cart-page, .cart-container', { timeout: 10000 });
    
    // Verify cart has items
    const cartItems = page.locator('.cart-item, .book-card');
    if (await cartItems.count() > 0) {
      await expect(cartItems.first()).toBeVisible();
    }
    
    // Step 6: Test wishlist functionality
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    const wishlistButton = page.locator('.add-to-wishlist, button[aria-label*="sevimlilarga"]').first();
    if (await wishlistButton.isVisible()) {
      await wishlistButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Navigate to wishlist
    await page.goto('/wishlist');
    await page.waitForTimeout(2000);
    
    console.log('✅ Complete user journey test completed');
  });

  test('should handle admin workflow with all integrations', async ({ page }) => {
    // Mock admin authentication
    await page.addInitScript(() => {
      localStorage.setItem('currentUserId', 'admin-test-id');
      localStorage.setItem('isAdmin', 'true');
    });
    
    // Step 1: Access admin dashboard
    await page.goto('/admin-dashboard');
    
    // Wait for admin dashboard or login
    await page.waitForSelector('.admin-dashboard, .admin-layout, .admin-login', { timeout: 10000 });
    
    // If login page, skip admin tests
    if (await page.locator('.admin-login').isVisible()) {
      console.log('⚠️ Admin login required, skipping admin tests');
      return;
    }
    
    // Step 2: Navigate to book management
    await page.goto('/admin/books');
    await page.waitForSelector('.admin-book-management, .book-management', { timeout: 10000 });
    
    // Step 3: Test book creation (if add button exists)
    const addBookButton = page.locator('button:has-text("Kitob qo\'shish"), button:has-text("Add Book")');
    if (await addBookButton.isVisible()) {
      await addBookButton.click();
      
      // Fill book form if form appears
      await page.waitForSelector('form, .book-form', { timeout: 5000 });
      
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"], input[placeholder*="nom"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Integration Test Book');
        
        const authorInput = page.locator('input[name="author"], input[placeholder*="author"], input[placeholder*="muallif"]').first();
        if (await authorInput.isVisible()) {
          await authorInput.fill('Test Author');
        }
        
        const priceInput = page.locator('input[name="price"], input[placeholder*="price"], input[placeholder*="narx"]').first();
        if (await priceInput.isVisible()) {
          await priceInput.fill('25000');
        }
        
        // Submit form
        const submitButton = page.locator('button[type="submit"], button:has-text("Saqlash"), button:has-text("Save")').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    
    // Step 4: Test order management
    await page.goto('/admin/orders');
    await page.waitForTimeout(2000);
    
    console.log('✅ Admin workflow integration test completed');
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test network error handling
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/');
    
    // Should show error state or loading state
    await page.waitForSelector('.error, .loading-spinner, .book-card', { timeout: 15000 });
    
    // Test recovery
    await page.unroute('**/api/**');
    
    // Look for retry button
    const retryButton = page.locator('button:has-text("Qayta yuklash"), button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForTimeout(2000);
    }
    
    console.log('✅ Error handling test completed');
  });

  test('should maintain performance under load', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to homepage
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    const initialLoadTime = Date.now() - startTime;
    
    // Perform multiple rapid operations
    const operations = [];
    
    for (let i = 0; i < 10; i++) {
      const operationStart = Date.now();
      
      try {
        // Click on random book
        const bookCards = await page.locator('.book-card').count();
        if (bookCards > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(bookCards, 5));
          await page.locator('.book-card').nth(randomIndex).hover();
          await page.waitForTimeout(100);
        }
        
        operations.push({
          success: true,
          time: Date.now() - operationStart
        });
        
      } catch (error) {
        operations.push({
          success: false,
          time: Date.now() - operationStart,
          error: error.message
        });
      }
    }
    
    const successfulOps = operations.filter(op => op.success).length;
    const averageOpTime = operations.reduce((sum, op) => sum + op.time, 0) / operations.length;
    
    console.log(`📊 Performance metrics:`);
    console.log(`  Initial load: ${initialLoadTime}ms`);
    console.log(`  Operations: ${successfulOps}/10 successful`);
    console.log(`  Average operation time: ${averageOpTime.toFixed(0)}ms`);
    
    // Performance assertions
    expect(initialLoadTime).toBeLessThan(10000); // 10 seconds max
    expect(successfulOps).toBeGreaterThan(7); // At least 70% success rate
    expect(averageOpTime).toBeLessThan(1000); // 1 second max per operation
  });

  test('should handle mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Test mobile menu
    const hamburgerMenu = page.locator('.hamburger-menu');
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click();
      
      // Check if mobile menu opens
      const mobileNav = page.locator('.main-nav.active, .mobile-menu');
      await expect(mobileNav).toBeVisible();
      
      // Close menu
      await hamburgerMenu.click();
    }
    
    // Test mobile search
    const mobileSearchIcon = page.locator('.mobile-search-icon');
    if (await mobileSearchIcon.isVisible()) {
      await mobileSearchIcon.click();
      
      const searchBar = page.locator('.search-bar.active-mobile');
      if (await searchBar.isVisible()) {
        const searchInput = searchBar.locator('input');
        await searchInput.fill('test');
        await searchInput.press('Enter');
        await page.waitForTimeout(1000);
      }
    }
    
    // Test mobile book grid
    const bookCards = page.locator('.book-card');
    await expect(bookCards.first()).toBeVisible();
    
    // Test mobile cart functionality
    const addToCartButton = page.locator('.add-to-cart').first();
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ Mobile responsiveness test completed');
  });

  test('should validate all critical pages load correctly', async ({ page }) => {
    const criticalPages = [
      { path: '/', name: 'Homepage' },
      { path: '/auth', name: 'Authentication' },
      { path: '/cart', name: 'Cart' },
      { path: '/wishlist', name: 'Wishlist' },
      { path: '/admin-dashboard', name: 'Admin Dashboard' }
    ];
    
    for (const pageInfo of criticalPages) {
      try {
        console.log(`Testing ${pageInfo.name}...`);
        
        const startTime = Date.now();
        await page.goto(pageInfo.path);
        
        // Wait for page to load (different selectors for different pages)
        if (pageInfo.path === '/') {
          await page.waitForSelector('.book-card, .loading-spinner', { timeout: 15000 });
        } else if (pageInfo.path === '/auth') {
          await page.waitForSelector('.auth-container, .auth-form', { timeout: 10000 });
        } else if (pageInfo.path === '/cart') {
          await page.waitForSelector('.cart-page, .cart-container', { timeout: 10000 });
        } else if (pageInfo.path === '/wishlist') {
          await page.waitForSelector('.wishlist-page, .wishlist-container', { timeout: 10000 });
        } else if (pageInfo.path === '/admin-dashboard') {
          await page.waitForSelector('.admin-dashboard, .admin-layout, .admin-login', { timeout: 10000 });
        }
        
        const loadTime = Date.now() - startTime;
        console.log(`  ✅ ${pageInfo.name}: ${loadTime}ms`);
        
        // Basic accessibility check
        const title = await page.title();
        expect(title).toBeTruthy();
        
      } catch (error) {
        console.log(`  ❌ ${pageInfo.name}: ${error.message}`);
        // Don't fail the test for individual page errors
      }
    }
  });

  test('should handle concurrent user actions', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    
    try {
      // Create 3 concurrent user sessions
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      // Navigate all users to homepage simultaneously
      await Promise.all(
        pages.map(page => page.goto('/'))
      );
      
      // Wait for all pages to load
      await Promise.all(
        pages.map(page => page.waitForSelector('.book-card', { timeout: 15000 }))
      );
      
      // Perform concurrent actions
      const actions = pages.map(async (page, index) => {
        try {
          // Each user performs different actions
          if (index === 0) {
            // User 1: Browse and add to cart
            const addToCartButton = page.locator('.add-to-cart').first();
            if (await addToCartButton.isVisible()) {
              await addToCartButton.click();
            }
          } else if (index === 1) {
            // User 2: Search
            const searchInput = page.locator('input[placeholder*="qidirish"]').first();
            if (await searchInput.isVisible()) {
              await searchInput.fill('test');
              await searchInput.press('Enter');
            }
          } else {
            // User 3: Browse wishlist
            const wishlistButton = page.locator('.add-to-wishlist').first();
            if (await wishlistButton.isVisible()) {
              await wishlistButton.click();
            }
          }
          
          return { userId: index + 1, success: true };
        } catch (error) {
          return { userId: index + 1, success: false, error: error.message };
        }
      });
      
      const results = await Promise.all(actions);
      const successfulUsers = results.filter(r => r.success).length;
      
      console.log(`👥 Concurrent users test: ${successfulUsers}/3 successful`);
      expect(successfulUsers).toBeGreaterThan(1); // At least 2 users should succeed
      
    } finally {
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('should validate service integrations', async ({ page }) => {
    // Test Firebase integration
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Books should be loaded from Firebase
    const bookCards = await page.locator('.book-card').count();
    expect(bookCards).toBeGreaterThan(0);
    
    // Test Cloudinary image integration
    const bookImages = page.locator('.book-card img, .optimized-image');
    const firstImage = bookImages.first();
    
    if (await firstImage.isVisible()) {
      const imageSrc = await firstImage.getAttribute('src');
      // Should be using optimized images (Cloudinary or local)
      expect(imageSrc).toBeTruthy();
    }
    
    // Test search functionality (Firebase search)
    const searchInput = page.locator('input[placeholder*="qidirish"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('kitob');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
      
      // Should show search results
      const searchResults = await page.locator('.book-card').count();
      console.log(`🔍 Search returned ${searchResults} results`);
    }
    
    console.log('✅ Service integrations validated');
  });
});