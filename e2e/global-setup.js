import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting E2E test setup...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the dev server to be ready
    console.log('⏳ Waiting for dev server...');
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173');
    await page.waitForSelector('body', { timeout: 30000 });
    
    // Setup test data if needed
    console.log('📝 Setting up test data...');
    
    // You can add test data setup here
    // For example, create test users, books, etc.
    
    // Clear any existing test data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('✅ E2E test setup completed');
    
  } catch (error) {
    console.error('❌ E2E test setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;