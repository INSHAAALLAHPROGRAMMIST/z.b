/**
 * Load Testing Script for Zamon Books
 * Tests system performance under various load conditions
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

class LoadTestingManager {
    constructor() {
        this.baseURL = process.env.LOAD_TEST_URL || 'http://localhost:5173';
        this.results = {
            timestamp: new Date().toISOString(),
            testSuite: 'Load Testing',
            scenarios: []
        };
    }

    /**
     * Run all load testing scenarios
     */
    async runLoadTests() {
        console.log('🚀 Starting load testing suite...');
        console.log(`Target URL: ${this.baseURL}`);
        
        try {
            // Scenario 1: Concurrent user browsing
            await this.testConcurrentBrowsing();
            
            // Scenario 2: Heavy cart operations
            await this.testCartOperations();
            
            // Scenario 3: Search performance
            await this.testSearchPerformance();
            
            // Scenario 4: Admin panel load
            await this.testAdminPanelLoad();
            
            // Scenario 5: Image loading performance
            await this.testImageLoadingPerformance();
            
            // Generate report
            this.generateLoadTestReport();
            
            console.log('✅ Load testing completed successfully!');
            
        } catch (error) {
            console.error('❌ Load testing failed:', error);
            throw error;
        }
    }

    /**
     * Test concurrent user browsing
     */
    async testConcurrentBrowsing() {
        console.log('👥 Testing concurrent user browsing...');
        
        const userCounts = [5, 10, 20, 50];
        const scenario = {
            name: 'Concurrent User Browsing',
            tests: []
        };
        
        for (const userCount of userCounts) {
            console.log(`  Testing with ${userCount} concurrent users...`);
            
            const startTime = Date.now();
            const browsers = [];
            const pages = [];
            
            try {
                // Launch browsers
                for (let i = 0; i < userCount; i++) {
                    const browser = await chromium.launch({ headless: true });
                    const page = await browser.newPage();
                    browsers.push(browser);
                    pages.push(page);
                }
                
                // Navigate all users simultaneously
                const navigationPromises = pages.map(async (page, index) => {
                    const userStartTime = Date.now();
                    
                    try {
                        await page.goto(this.baseURL, { 
                            waitUntil: 'networkidle',
                            timeout: 30000 
                        });
                        
                        // Simulate user browsing
                        await page.waitForSelector('.book-card', { timeout: 15000 });
                        
                        // Click on random books
                        const bookCards = await page.locator('.book-card').count();
                        if (bookCards > 0) {
                            const randomIndex = Math.floor(Math.random() * Math.min(bookCards, 3));
                            await page.locator('.book-card').nth(randomIndex).click();
                            await page.waitForTimeout(1000);
                        }
                        
                        return {
                            userId: index + 1,
                            success: true,
                            loadTime: Date.now() - userStartTime
                        };
                        
                    } catch (error) {
                        return {
                            userId: index + 1,
                            success: false,
                            error: error.message,
                            loadTime: Date.now() - userStartTime
                        };
                    }
                });
                
                const results = await Promise.all(navigationPromises);
                const totalTime = Date.now() - startTime;
                
                const successfulUsers = results.filter(r => r.success).length;
                const averageLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
                
                scenario.tests.push({
                    userCount,
                    totalTime,
                    successfulUsers,
                    failedUsers: userCount - successfulUsers,
                    successRate: (successfulUsers / userCount) * 100,
                    averageLoadTime,
                    results
                });
                
                console.log(`    ✅ ${successfulUsers}/${userCount} users successful (${averageLoadTime.toFixed(0)}ms avg)`);
                
            } finally {
                // Cleanup browsers
                await Promise.all(browsers.map(browser => browser.close()));
            }
        }
        
        this.results.scenarios.push(scenario);
    }

    /**
     * Test cart operations under load
     */
    async testCartOperations() {
        console.log('🛒 Testing cart operations under load...');
        
        const scenario = {
            name: 'Cart Operations Load Test',
            tests: []
        };
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        
        try {
            // Test rapid cart additions
            const page = await context.newPage();
            await page.goto(this.baseURL);
            await page.waitForSelector('.book-card', { timeout: 15000 });
            
            const startTime = Date.now();
            const operations = [];
            
            // Perform 50 rapid cart operations
            for (let i = 0; i < 50; i++) {
                const operationStart = Date.now();
                
                try {
                    const addToCartButtons = await page.locator('.add-to-cart').count();
                    if (addToCartButtons > 0) {
                        const randomButton = Math.floor(Math.random() * Math.min(addToCartButtons, 5));
                        await page.locator('.add-to-cart').nth(randomButton).click();
                        await page.waitForTimeout(100); // Small delay between operations
                    }
                    
                    operations.push({
                        operation: i + 1,
                        success: true,
                        time: Date.now() - operationStart
                    });
                    
                } catch (error) {
                    operations.push({
                        operation: i + 1,
                        success: false,
                        error: error.message,
                        time: Date.now() - operationStart
                    });
                }
            }
            
            const totalTime = Date.now() - startTime;
            const successfulOps = operations.filter(op => op.success).length;
            const averageOpTime = operations.reduce((sum, op) => sum + op.time, 0) / operations.length;
            
            scenario.tests.push({
                testName: 'Rapid Cart Operations',
                totalOperations: 50,
                successfulOperations: successfulOps,
                failedOperations: 50 - successfulOps,
                totalTime,
                averageOperationTime: averageOpTime,
                operationsPerSecond: (successfulOps / (totalTime / 1000)).toFixed(2)
            });
            
            console.log(`    ✅ ${successfulOps}/50 operations successful (${averageOpTime.toFixed(0)}ms avg)`);
            
        } finally {
            await browser.close();
        }
        
        this.results.scenarios.push(scenario);
    }

    /**
     * Test search performance
     */
    async testSearchPerformance() {
        console.log('🔍 Testing search performance...');
        
        const scenario = {
            name: 'Search Performance Test',
            tests: []
        };
        
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        try {
            await page.goto(this.baseURL);
            await page.waitForSelector('input[placeholder*="qidirish"], input[placeholder*="search"]', { timeout: 10000 });
            
            const searchTerms = [
                'kitob',
                'test',
                'book',
                'author',
                'fiction',
                'non-fiction',
                'programming',
                'history',
                'science',
                'literature'
            ];
            
            for (const term of searchTerms) {
                const startTime = Date.now();
                
                try {
                    const searchInput = page.locator('input[placeholder*="qidirish"], input[placeholder*="search"]').first();
                    await searchInput.fill(term);
                    await searchInput.press('Enter');
                    
                    // Wait for search results or timeout
                    await page.waitForTimeout(2000);
                    
                    const searchTime = Date.now() - startTime;
                    
                    scenario.tests.push({
                        searchTerm: term,
                        success: true,
                        searchTime,
                        timestamp: new Date().toISOString()
                    });
                    
                    console.log(`    ✅ Search "${term}": ${searchTime}ms`);
                    
                } catch (error) {
                    scenario.tests.push({
                        searchTerm: term,
                        success: false,
                        error: error.message,
                        searchTime: Date.now() - startTime
                    });
                    
                    console.log(`    ❌ Search "${term}" failed: ${error.message}`);
                }
            }
            
        } finally {
            await browser.close();
        }
        
        this.results.scenarios.push(scenario);
    }

    /**
     * Test admin panel load
     */
    async testAdminPanelLoad() {
        console.log('👨‍💼 Testing admin panel load...');
        
        const scenario = {
            name: 'Admin Panel Load Test',
            tests: []
        };
        
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        try {
            // Test admin dashboard load
            const startTime = Date.now();
            
            await page.goto(`${this.baseURL}/admin-dashboard`);
            
            try {
                await page.waitForSelector('.admin-dashboard, .admin-layout', { timeout: 15000 });
                
                const loadTime = Date.now() - startTime;
                
                scenario.tests.push({
                    page: 'Admin Dashboard',
                    success: true,
                    loadTime,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`    ✅ Admin Dashboard: ${loadTime}ms`);
                
            } catch (error) {
                scenario.tests.push({
                    page: 'Admin Dashboard',
                    success: false,
                    error: error.message,
                    loadTime: Date.now() - startTime
                });
                
                console.log(`    ❌ Admin Dashboard failed: ${error.message}`);
            }
            
            // Test admin book management
            const bookMgmtStart = Date.now();
            
            try {
                await page.goto(`${this.baseURL}/admin/books`);
                await page.waitForSelector('.admin-book-management, .book-management', { timeout: 15000 });
                
                const bookMgmtTime = Date.now() - bookMgmtStart;
                
                scenario.tests.push({
                    page: 'Book Management',
                    success: true,
                    loadTime: bookMgmtTime
                });
                
                console.log(`    ✅ Book Management: ${bookMgmtTime}ms`);
                
            } catch (error) {
                scenario.tests.push({
                    page: 'Book Management',
                    success: false,
                    error: error.message,
                    loadTime: Date.now() - bookMgmtStart
                });
            }
            
        } finally {
            await browser.close();
        }
        
        this.results.scenarios.push(scenario);
    }

    /**
     * Test image loading performance
     */
    async testImageLoadingPerformance() {
        console.log('🖼️ Testing image loading performance...');
        
        const scenario = {
            name: 'Image Loading Performance',
            tests: []
        };
        
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        try {
            // Track image loading
            const imageLoadTimes = [];
            
            page.on('response', response => {
                if (response.request().resourceType() === 'image') {
                    const timing = response.timing();
                    imageLoadTimes.push({
                        url: response.url(),
                        status: response.status(),
                        size: response.headers()['content-length'],
                        loadTime: timing.responseEnd - timing.requestStart
                    });
                }
            });
            
            const startTime = Date.now();
            
            await page.goto(this.baseURL);
            await page.waitForSelector('.book-card', { timeout: 15000 });
            
            // Wait for images to load
            await page.waitForTimeout(5000);
            
            const totalTime = Date.now() - startTime;
            
            const successfulImages = imageLoadTimes.filter(img => img.status === 200).length;
            const averageImageLoadTime = imageLoadTimes.length > 0 
                ? imageLoadTimes.reduce((sum, img) => sum + img.loadTime, 0) / imageLoadTimes.length 
                : 0;
            
            scenario.tests.push({
                totalImages: imageLoadTimes.length,
                successfulImages,
                failedImages: imageLoadTimes.length - successfulImages,
                averageLoadTime: averageImageLoadTime,
                totalTime,
                images: imageLoadTimes
            });
            
            console.log(`    ✅ ${successfulImages}/${imageLoadTimes.length} images loaded (${averageImageLoadTime.toFixed(0)}ms avg)`);
            
        } finally {
            await browser.close();
        }
        
        this.results.scenarios.push(scenario);
    }

    /**
     * Generate load test report
     */
    generateLoadTestReport() {
        const reportPath = path.join(process.cwd(), 'load-test-report.json');
        const htmlReportPath = path.join(process.cwd(), 'load-test-report.html');
        
        // Save JSON report
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        // Generate HTML report
        const htmlContent = this.generateHTMLReport();
        fs.writeFileSync(htmlReportPath, htmlContent);
        
        console.log(`📊 Load test report generated:`);
        console.log(`   JSON: ${reportPath}`);
        console.log(`   HTML: ${htmlReportPath}`);
        
        // Display summary
        this.displaySummary();
    }

    /**
     * Generate HTML report
     */
    generateHTMLReport() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - Zamon Books</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .scenario { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .scenario h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .test-result { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; }
        .success { border-left: 4px solid #28a745; }
        .failure { border-left: 4px solid #dc3545; }
        .metric { display: inline-block; margin: 10px 15px 10px 0; }
        .metric-value { font-size: 1.5em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; font-size: 0.9em; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Load Test Report</h1>
            <p>Generated: ${new Date(this.results.timestamp).toLocaleString()}</p>
            <p>Target URL: ${this.baseURL}</p>
        </div>
        
        ${this.results.scenarios.map(scenario => `
            <div class="scenario">
                <h2>${scenario.name}</h2>
                ${scenario.tests.map(test => `
                    <div class="test-result ${test.success !== false ? 'success' : 'failure'}">
                        <h3>${test.testName || test.page || 'Test Result'}</h3>
                        ${this.formatTestResult(test)}
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    }

    formatTestResult(test) {
        if (test.userCount !== undefined) {
            return `
                <div class="metric">
                    <div class="metric-value">${test.userCount}</div>
                    <div class="metric-label">Concurrent Users</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${test.successRate?.toFixed(1)}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${test.averageLoadTime?.toFixed(0)}ms</div>
                    <div class="metric-label">Avg Load Time</div>
                </div>
            `;
        } else if (test.totalOperations !== undefined) {
            return `
                <div class="metric">
                    <div class="metric-value">${test.operationsPerSecond}</div>
                    <div class="metric-label">Operations/Second</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${test.averageOperationTime?.toFixed(0)}ms</div>
                    <div class="metric-label">Avg Operation Time</div>
                </div>
            `;
        } else if (test.loadTime !== undefined) {
            return `
                <div class="metric">
                    <div class="metric-value">${test.loadTime}ms</div>
                    <div class="metric-label">Load Time</div>
                </div>
            `;
        }
        return '<p>Test completed</p>';
    }

    /**
     * Display summary
     */
    displaySummary() {
        console.log('\n📊 Load Test Summary');
        console.log('===================');
        
        this.results.scenarios.forEach(scenario => {
            console.log(`\n${scenario.name}:`);
            
            scenario.tests.forEach(test => {
                if (test.userCount !== undefined) {
                    console.log(`  ${test.userCount} users: ${test.successRate?.toFixed(1)}% success, ${test.averageLoadTime?.toFixed(0)}ms avg`);
                } else if (test.searchTerm !== undefined) {
                    console.log(`  "${test.searchTerm}": ${test.success ? test.searchTime + 'ms' : 'FAILED'}`);
                } else if (test.page !== undefined) {
                    console.log(`  ${test.page}: ${test.success ? test.loadTime + 'ms' : 'FAILED'}`);
                }
            });
        });
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const loadTester = new LoadTestingManager();
    loadTester.runLoadTests().catch(error => {
        console.error('Load testing failed:', error);
        process.exit(1);
    });
}

export default LoadTestingManager;