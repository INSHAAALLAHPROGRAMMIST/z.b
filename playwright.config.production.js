import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for production testing
 * Tests against live production environment
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Sequential for production to avoid overload
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 1, // More retries for production
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2, // Fewer workers for production
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/production-report' }],
    ['json', { outputFile: 'test-results/production-results.json' }],
    ['junit', { outputFile: 'test-results/production-results.xml' }]
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://zamonbooks.netlify.app',

    /* Collect trace when retrying the failed test. */
    trace: 'retain-on-failure',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 15000, // Longer timeout for production
    
    /* Global timeout for navigation */
    navigationTimeout: 45000, // Longer timeout for production
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'User-Agent': 'Playwright-Production-Tests'
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against tablet viewports. */
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
    }
  ],

  /* Don't run local dev server for production tests */
  // webServer: undefined,
  
  /* Global setup and teardown for production */
  globalSetup: './e2e/production-setup.js',
  globalTeardown: './e2e/production-teardown.js',
  
  /* Test timeout - longer for production */
  timeout: 60000, // 1 minute
  
  /* Expect timeout - longer for production */
  expect: {
    timeout: 10000 // 10 seconds
  },
  
  /* Output directory */
  outputDir: 'test-results/production/',
  
  /* Test match patterns - only critical tests for production */
  testMatch: [
    '**/book-browsing.spec.js',
    '**/performance.spec.js'
  ],
  
  /* Ignore certain files */
  testIgnore: [
    '**/admin-workflow.spec.js' // Skip admin tests in production
  ]
});