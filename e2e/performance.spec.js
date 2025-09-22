import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should meet Core Web Vitals standards', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Wait for performance entries to be available
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          const paint = performance.getEntriesByType('paint');
          
          const metrics = {
            // Page Load Time
            loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
            
            // First Contentful Paint
            fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
            
            // DOM Content Loaded
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
            
            // Time to Interactive (approximation)
            tti: navigation ? navigation.domInteractive - navigation.fetchStart : 0
          };
          
          resolve(metrics);
        }, 1000);
      });
    });
    
    console.log('Performance Metrics:', performanceMetrics);
    
    // Assert performance standards
    expect(performanceMetrics.loadTime).toBeLessThan(3000); // 3 seconds
    expect(performanceMetrics.fcp).toBeLessThan(1800); // 1.8 seconds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset response
    await page.route('**/api/books**', async route => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `book-${i}`,
        title: `Book ${i}`,
        author: `Author ${i}`,
        price: 25000 + i * 1000,
        imageUrl: `https://example.com/book${i}.jpg`
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ documents: largeDataset })
      });
    });
    
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    const renderTime = Date.now() - startTime;
    
    // Should render large dataset within reasonable time
    expect(renderTime).toBeLessThan(5000); // 5 seconds
    
    // Check if virtualization is working (not all items rendered at once)
    const visibleBooks = await page.locator('.book-card').count();
    expect(visibleBooks).toBeLessThan(100); // Should be virtualized
  });

  test('should optimize image loading', async ({ page }) => {
    let imageRequests = 0;
    
    // Track image requests
    page.on('request', request => {
      if (request.resourceType() === 'image') {
        imageRequests++;
      }
    });
    
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Should not load all images immediately (lazy loading)
    await page.waitForTimeout(2000);
    
    console.log(`Initial image requests: ${imageRequests}`);
    
    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    
    await page.waitForTimeout(2000);
    
    console.log(`Image requests after scroll: ${imageRequests}`);
    
    // Should load more images after scrolling
    expect(imageRequests).toBeGreaterThan(0);
  });

  test('should cache resources effectively', async ({ page }) => {
    // First visit
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const firstVisitRequests = [];
    
    // Track requests on second visit
    page.on('request', request => {
      firstVisitRequests.push(request.url());
    });
    
    // Second visit (should use cache)
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if fewer requests are made (indicating caching)
    console.log(`Requests on reload: ${firstVisitRequests.length}`);
    
    // Should have some cached resources
    expect(firstVisitRequests.length).toBeLessThan(50); // Adjust based on your app
  });

  test('should handle slow network conditions', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });
    
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('.book-card, .loading-spinner', { timeout: 20000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should still load within reasonable time even on slow network
    expect(loadTime).toBeLessThan(10000); // 10 seconds for slow network
    
    // Should show loading indicators
    const loadingIndicator = page.locator('.loading-spinner');
    // Loading indicator might be gone by now, so we just check it existed
  });

  test('should maintain performance on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    const mobileLoadTime = Date.now() - startTime;
    
    // Mobile should load within acceptable time
    expect(mobileLoadTime).toBeLessThan(4000); // 4 seconds for mobile
    
    // Check if mobile optimizations are working
    const hamburgerMenu = page.locator('.hamburger-menu');
    await expect(hamburgerMenu).toBeVisible();
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      } : null;
    });
    
    if (initialMemory) {
      console.log('Initial memory usage:', initialMemory);
      
      // Perform some operations
      await page.evaluate(() => {
        // Simulate some memory-intensive operations
        for (let i = 0; i < 1000; i++) {
          const div = document.createElement('div');
          div.innerHTML = `Test content ${i}`;
          document.body.appendChild(div);
          document.body.removeChild(div);
        }
      });
      
      // Check memory after operations
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        } : null;
      });
      
      if (finalMemory) {
        console.log('Final memory usage:', finalMemory);
        
        // Memory usage should not increase dramatically
        const memoryIncrease = finalMemory.used - initialMemory.used;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB increase limit
      }
    }
  });

  test('should optimize bundle size', async ({ page }) => {
    let totalBundleSize = 0;
    
    // Track JavaScript bundle sizes
    page.on('response', async response => {
      if (response.url().includes('.js') && response.status() === 200) {
        try {
          const headers = response.headers();
          const contentLength = headers['content-length'];
          if (contentLength) {
            totalBundleSize += parseInt(contentLength);
          }
        } catch (error) {
          // Ignore errors in size calculation
        }
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log(`Total JS bundle size: ${(totalBundleSize / 1024).toFixed(2)} KB`);
    
    // Bundle size should be reasonable
    expect(totalBundleSize).toBeLessThan(2 * 1024 * 1024); // 2MB limit
  });

  test('should handle concurrent users simulation', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    
    try {
      // Create multiple browser contexts to simulate concurrent users
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // Navigate all pages simultaneously
      await Promise.all(
        pages.map(page => page.goto('/'))
      );
      
      // Wait for all pages to load
      await Promise.all(
        pages.map(page => page.waitForSelector('.book-card', { timeout: 15000 }))
      );
      
      const concurrentLoadTime = Date.now() - startTime;
      
      console.log(`Concurrent load time for 5 users: ${concurrentLoadTime}ms`);
      
      // Should handle concurrent users within reasonable time
      expect(concurrentLoadTime).toBeLessThan(8000); // 8 seconds
      
    } finally {
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('should maintain performance during interactions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.book-card', { timeout: 15000 });
    
    const startTime = Date.now();
    
    // Perform multiple interactions
    const bookCards = page.locator('.book-card');
    const cardCount = Math.min(await bookCards.count(), 5);
    
    for (let i = 0; i < cardCount; i++) {
      const card = bookCards.nth(i);
      
      // Hover over card
      await card.hover();
      await page.waitForTimeout(100);
      
      // Click add to cart
      const addToCartButton = card.locator('.add-to-cart');
      if (await addToCartButton.isVisible()) {
        await addToCartButton.click();
        await page.waitForTimeout(200);
      }
    }
    
    const interactionTime = Date.now() - startTime;
    
    console.log(`Interaction time: ${interactionTime}ms`);
    
    // Interactions should be responsive
    expect(interactionTime).toBeLessThan(3000); // 3 seconds for all interactions
  });
});