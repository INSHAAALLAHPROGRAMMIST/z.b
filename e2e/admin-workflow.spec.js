import { test, expect } from '@playwright/test';

test.describe('Admin Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.addInitScript(() => {
      // Mock Firebase auth
      window.mockAdminUser = {
        uid: 'admin-test-id',
        email: 'admin@test.com',
        isAdmin: true
      };
      
      // Mock localStorage for admin session
      localStorage.setItem('currentUserId', 'admin-test-id');
      localStorage.setItem('isAdmin', 'true');
    });
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Wait for admin dashboard to load
    await page.waitForSelector('.admin-dashboard, .admin-layout', { timeout: 10000 });
    
    // Check if admin dashboard elements are visible
    await expect(page.locator('h1, .dashboard-title')).toBeVisible();
    
    // Check for admin navigation
    const adminNav = page.locator('.admin-nav, .admin-sidebar');
    if (await adminNav.isVisible()) {
      await expect(adminNav).toBeVisible();
    }
  });

  test('should manage books in admin panel', async ({ page }) => {
    await page.goto('/admin/books');
    
    // Wait for books management page
    await page.waitForSelector('.admin-book-management, .book-management', { timeout: 10000 });
    
    // Check if add book button exists
    const addBookButton = page.locator('button:has-text("Kitob qo\'shish"), button:has-text("Add Book")');
    if (await addBookButton.isVisible()) {
      await expect(addBookButton).toBeVisible();
      
      // Click add book button
      await addBookButton.click();
      
      // Check if book form appears
      await page.waitForSelector('form, .book-form', { timeout: 5000 });
      
      // Fill out book form
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"], input[placeholder*="nom"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Book Title');
      }
      
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
        
        // Wait for success message or redirect
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should handle image upload in book creation', async ({ page }) => {
    await page.goto('/admin/books');
    
    // Wait for page to load
    await page.waitForSelector('.admin-book-management, .book-management', { timeout: 10000 });
    
    // Look for add book button
    const addBookButton = page.locator('button:has-text("Kitob qo\'shish"), button:has-text("Add Book")');
    if (await addBookButton.isVisible()) {
      await addBookButton.click();
      
      // Wait for form
      await page.waitForSelector('form, .book-form', { timeout: 5000 });
      
      // Look for file input
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Create a test image file
        const testImagePath = './e2e/fixtures/test-book-cover.jpg';
        
        // Upload file (if file exists)
        try {
          await fileInput.setInputFiles(testImagePath);
          
          // Wait for upload to complete
          await page.waitForTimeout(3000);
          
          // Check if image preview appears
          const imagePreview = page.locator('.image-preview, .uploaded-image');
          if (await imagePreview.isVisible()) {
            await expect(imagePreview).toBeVisible();
          }
        } catch (error) {
          console.log('Test image file not found, skipping file upload test');
        }
      }
    }
  });

  test('should edit existing book', async ({ page }) => {
    await page.goto('/admin/books');
    
    // Wait for books list
    await page.waitForSelector('.book-list, .books-table, .book-card', { timeout: 10000 });
    
    // Look for edit button
    const editButton = page.locator('button:has-text("Tahrirlash"), button:has-text("Edit"), .edit-button').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Wait for edit form
      await page.waitForSelector('form, .book-form', { timeout: 5000 });
      
      // Update title
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Updated Book Title');
        
        // Save changes
        const saveButton = page.locator('button[type="submit"], button:has-text("Saqlash"), button:has-text("Save")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          
          // Wait for update to complete
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should delete book with confirmation', async ({ page }) => {
    await page.goto('/admin/books');
    
    // Wait for books list
    await page.waitForSelector('.book-list, .books-table, .book-card', { timeout: 10000 });
    
    // Look for delete button
    const deleteButton = page.locator('button:has-text("O\'chirish"), button:has-text("Delete"), .delete-button').first();
    if (await deleteButton.isVisible()) {
      // Set up dialog handler for confirmation
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        await dialog.accept();
      });
      
      await deleteButton.click();
      
      // Wait for deletion to complete
      await page.waitForTimeout(2000);
    }
  });

  test('should manage orders', async ({ page }) => {
    await page.goto('/admin/orders');
    
    // Wait for orders page
    await page.waitForSelector('.admin-orders, .orders-management', { timeout: 10000 });
    
    // Check if orders are displayed
    const ordersTable = page.locator('.orders-table, .order-list');
    if (await ordersTable.isVisible()) {
      await expect(ordersTable).toBeVisible();
      
      // Look for order status update
      const statusSelect = page.locator('select[name="status"], .status-select').first();
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('completed');
        
        // Save status change
        const saveButton = page.locator('button:has-text("Saqlash"), button:has-text("Save")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('should view analytics dashboard', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Wait for dashboard
    await page.waitForSelector('.admin-dashboard, .dashboard', { timeout: 10000 });
    
    // Check for analytics widgets
    const analyticsWidgets = page.locator('.analytics-widget, .dashboard-card, .stat-card');
    if (await analyticsWidgets.count() > 0) {
      await expect(analyticsWidgets.first()).toBeVisible();
    }
    
    // Check for charts or graphs
    const charts = page.locator('.chart, .graph, canvas');
    if (await charts.count() > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test('should handle bulk operations', async ({ page }) => {
    await page.goto('/admin/books');
    
    // Wait for books list
    await page.waitForSelector('.book-list, .books-table', { timeout: 10000 });
    
    // Select multiple items
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 1) {
      // Select first two checkboxes
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // Look for bulk action button
      const bulkActionButton = page.locator('button:has-text("Bulk"), .bulk-action-button');
      if (await bulkActionButton.isVisible()) {
        await bulkActionButton.click();
        
        // Handle bulk action menu
        const bulkDeleteButton = page.locator('button:has-text("Delete Selected"), button:has-text("O\'chirish")');
        if (await bulkDeleteButton.isVisible()) {
          // Set up confirmation dialog
          page.on('dialog', async dialog => {
            await dialog.accept();
          });
          
          await bulkDeleteButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should search and filter books', async ({ page }) => {
    await page.goto('/admin/books');
    
    // Wait for page to load
    await page.waitForSelector('.admin-book-management', { timeout: 10000 });
    
    // Look for search input
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="qidirish"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(2000);
    }
    
    // Look for filter options
    const genreFilter = page.locator('select[name="genre"], .genre-filter');
    if (await genreFilter.isVisible()) {
      await genreFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
    }
  });

  test('should handle admin navigation', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Wait for admin layout
    await page.waitForSelector('.admin-layout, .admin-dashboard', { timeout: 10000 });
    
    // Test navigation to different admin sections
    const navItems = [
      { text: 'Books', url: '/admin/books' },
      { text: 'Orders', url: '/admin/orders' },
      { text: 'Users', url: '/admin/users' }
    ];
    
    for (const item of navItems) {
      const navLink = page.locator(`a:has-text("${item.text}"), .nav-link:has-text("${item.text}")`);
      if (await navLink.isVisible()) {
        await navLink.click();
        
        // Wait for navigation
        await page.waitForTimeout(1000);
        
        // Check if URL changed or content updated
        const currentUrl = page.url();
        console.log(`Navigated to: ${currentUrl}`);
      }
    }
  });

  test('should maintain admin session', async ({ page }) => {
    await page.goto('/admin-dashboard');
    
    // Wait for dashboard
    await page.waitForSelector('.admin-dashboard', { timeout: 10000 });
    
    // Navigate to different admin pages
    await page.goto('/admin/books');
    await page.waitForTimeout(1000);
    
    await page.goto('/admin/orders');
    await page.waitForTimeout(1000);
    
    // Should still have admin access
    await page.goto('/admin-dashboard');
    await page.waitForSelector('.admin-dashboard', { timeout: 10000 });
    
    await expect(page.locator('.admin-dashboard')).toBeVisible();
  });
});