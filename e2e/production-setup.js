import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🌐 Starting production E2E test setup...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://zamonbooks.netlify.app';
    
    // Wait for the production site to be ready
    console.log(`⏳ Checking production site availability: ${baseURL}`);
    
    let retries = 5;
    let siteReady = false;
    
    while (retries > 0 && !siteReady) {
      try {
        const response = await page.goto(baseURL, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        if (response.ok()) {
          siteReady = true;
          console.log('✅ Production site is accessible');
        } else {
          throw new Error(`HTTP ${response.status()}`);
        }
      } catch (error) {
        console.log(`⚠️ Site check failed (${6 - retries}/5): ${error.message}`);
        retries--;
        
        if (retries > 0) {
          console.log('⏳ Waiting 10 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    if (!siteReady) {
      throw new Error('Production site is not accessible after multiple retries');
    }
    
    // Check health endpoint
    console.log('🏥 Checking health endpoint...');
    try {
      const healthResponse = await page.goto(`${baseURL}/.netlify/functions/health-check`, {
        timeout: 15000
      });
      
      if (healthResponse.ok()) {
        const healthData = await healthResponse.json();
        console.log(`✅ Health check passed: ${healthData.status}`);
        
        // Log any degraded services
        if (healthData.status === 'degraded') {
          console.log('⚠️ Some services are degraded:');
          Object.entries(healthData.checks).forEach(([service, check]) => {
            if (check.status !== 'healthy') {
              console.log(`  - ${service}: ${check.status}`);
            }
          });
        }
      } else {
        console.log('⚠️ Health check endpoint returned non-200 status');
      }
    } catch (error) {
      console.log('⚠️ Health check failed:', error.message);
    }
    
    // Warm up critical pages
    console.log('🔥 Warming up critical pages...');
    const criticalPages = ['/', '/auth', '/cart'];
    
    for (const pagePath of criticalPages) {
      try {
        await page.goto(`${baseURL}${pagePath}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        console.log(`✅ Warmed up: ${pagePath}`);
      } catch (error) {
        console.log(`⚠️ Failed to warm up ${pagePath}: ${error.message}`);
      }
    }
    
    // Clear any test data or cookies
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('✅ Production E2E test setup completed');
    
  } catch (error) {
    console.error('❌ Production E2E test setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;