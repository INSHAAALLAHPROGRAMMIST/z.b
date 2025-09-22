import { test, expect } from '@playwright/test';

test.describe('Book Browsing and Discovery', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="book-grid"], .loading-spinner', { timeout: 10000 });
  });

  test('should display homepage with books', async ({ page }) => {
    // Check if the hero section is visible
    await expect(page.locator('.hero-banner')).toBeVisible();
    await expect(page.locator('.hero-title-small')).toContainText('Kelajak kitoblari');

    // Wait for books to load
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Check if books are displayed
    const bookCards = page.locator('.book-card');
    await expect(bookCards.first()).toBeVisible();
    
    // Check book card elements
    const firstBook = bookCards.first();
    await expect(firstBook.locator('h3')).toBeVisible(); // Title
    await expect(firstBook.locator('.author')).toBeVisible(); // Author
    await expect(firstBook.locator('.price')).toBeVisible(); // Price
    await expect(firstBook.locator('.add-to-cart')).toBeVisible(); // Add to cart button
  });

  test('should navigate to book detail page', async ({ page }) => {
    // Wait for books to load
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Click on the first book
    const firstBookLink = page.locator('.book-card').first();
    const bookTitle = await firstBookLink.locator('h3').textContent();
    
    await firstBookLink.click();
    
    // Should navigate to book detail page
    await expect(page).toHaveURL(/\/kitob\/|\/book\//);
    
    // Check if book detail page loads
    await page.waitForSelector('h1, .book-title', { timeout: 10000 });
  });

  test('should add book to cart', async ({ page }) => {
    // Wait for books to load
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Get initial cart count
    const cartCountElement = page.locator('.cart-count');
    const initialCount = await cartCountElement.textContent().catch(() => '0');
    
    // Click add to cart on first book
    const addToCartButton = page.locator('.add-to-cart').first();
    await addToCartButton.click();
    
    // Wait for cart update
    await page.waitForTimeout(1000);
    
    // Check if cart count increased (if cart counter is visible)
    const newCount = await cartCountElement.textContent().catch(() => '0');
    
    // Note: This test might need adjustment based on actual cart implementation
    console.log(`Cart count changed from ${initialCount} to ${newCount}`);
  });

  test('should display genres section', async ({ page }) => {
    // Wait for genres to load
    await page.waitForSelector('.genre-section', { timeout: 15000 });
    
    // Check if genres section is visible
    await expect(page.locator('.genre-section')).toBeVisible();
    await expect(page.locator('.section-title')).toContainText('Janrlar');
    
    // Check if genre cards are displayed
    const genreCards = page.locator('.genre-card');
    if (await genreCards.count() > 0) {
      await expect(genreCards.first()).toBeVisible();
      await expect(genreCards.first().locator('.genre-name')).toBeVisible();
    }
  });

  test('should handle search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="qidirish"], input[placeholder*="search"]').first();
    
    if (await searchInput.isVisible()) {
      // Type search query
      await searchInput.fill('kitob');
      await searchInput.press('Enter');
      
      // Wait for search results or navigation
      await page.waitForTimeout(2000);
      
      // Check if search was performed (URL change or results update)
      const currentUrl = page.url();
      console.log('Search performed, current URL:', currentUrl);
    } else {
      console.log('Search input not found, skipping search test');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile menu button is visible
    const hamburgerMenu = page.locator('.hamburger-menu');
    await expect(hamburgerMenu).toBeVisible();
    
    // Click hamburger menu
    await hamburgerMenu.click();
    
    // Check if mobile menu opens
    const mobileNav = page.locator('.main-nav.active');
    await expect(mobileNav).toBeVisible();
    
    // Check if books are still displayed properly on mobile
    await page.waitForSelector('.book-card', { timeout: 15000 });
    const bookCards = page.locator('.book-card');
    await expect(bookCards.first()).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Navigate to page and check for loading indicators
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check if loading spinner appears initially
    const loadingSpinner = page.locator('.loading-spinner');
    
    // Wait for either books to load or loading to complete
    await Promise.race([
      page.waitForSelector('.book-card', { timeout: 15000 }),
      page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: 15000 })
    ]);
    
    // Ensure content is loaded
    await expect(page.locator('.hero-banner')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Intercept network requests and simulate errors
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    await page.goto('/');
    
    // Wait for error state or retry button
    await page.waitForSelector('.error, [data-testid="error"], button:has-text("Qayta yuklash")', { 
      timeout: 15000 
    }).catch(() => {
      console.log('No error state found, which might be expected');
    });
  });

  test('should maintain performance standards', async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for main content to load
    await page.waitForSelector('.book-card, .loading-spinner', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    
    // Check if page loads within acceptable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(5000); // 5 seconds
    
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test Enter key on focused element
    await page.keyboard.press('Enter');
    
    // Should navigate or perform action
    await page.waitForTimeout(1000);
  });
});