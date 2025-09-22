/**
 * Production Monitoring Script
 * Monitors production environment and sends alerts
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

class ProductionMonitor {
    constructor() {
        this.siteUrl = process.env.PRODUCTION_URL || 'https://zamonbooks.netlify.app';
        this.telegramBotToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
        this.telegramChatId = process.env.VITE_TELEGRAM_CHAT_ID;
        this.monitoringInterval = 5 * 60 * 1000; // 5 minutes
        this.alertThresholds = {
            responseTime: 5000, // 5 seconds
            errorRate: 5, // 5%
            uptime: 99 // 99%
        };
        this.metrics = {
            uptime: [],
            responseTime: [],
            errors: [],
            lastCheck: null
        };
    }

    /**
     * Start continuous monitoring
     */
    async startMonitoring() {
        console.log('🔍 Starting production monitoring...');
        console.log(`Target URL: ${this.siteUrl}`);
        console.log(`Check interval: ${this.monitoringInterval / 1000}s`);
        
        // Initial check
        await this.performHealthCheck();
        
        // Set up periodic checks
        setInterval(async () => {
            await this.performHealthCheck();
        }, this.monitoringInterval);
        
        // Set up daily summary
        setInterval(async () => {
            await this.sendDailySummary();
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        console.log('✅ Production monitoring started');
    }

    /**
     * Perform comprehensive health check
     */
    async performHealthCheck() {
        const checkTime = new Date();
        console.log(`🏥 Health check at ${checkTime.toLocaleString()}`);
        
        const results = {
            timestamp: checkTime,
            site: await this.checkSiteHealth(),
            api: await this.checkApiHealth(),
            services: await this.checkServicesHealth(),
            performance: await this.checkPerformance()
        };
        
        // Store metrics
        this.updateMetrics(results);
        
        // Check for alerts
        await this.checkAlerts(results);
        
        // Save results
        await this.saveResults(results);
        
        this.metrics.lastCheck = checkTime;
    }

    /**
     * Check main site health
     */
    async checkSiteHealth() {
        const startTime = Date.now();
        
        try {
            const response = await fetch(this.siteUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Zamon-Books-Monitor/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            const isHealthy = response.ok;
            
            return {
                status: isHealthy ? 'healthy' : 'unhealthy',
                statusCode: response.status,
                responseTime,
                contentLength: response.headers.get('content-length'),
                lastModified: response.headers.get('last-modified')
            };
            
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Check API endpoints health
     */
    async checkApiHealth() {
        const endpoints = [
            '/api/health-check',
            '/api/business-metrics?metric=overview&period=1d'
        ];
        
        const results = {};
        
        for (const endpoint of endpoints) {
            const startTime = Date.now();
            
            try {
                const response = await fetch(`${this.siteUrl}/.netlify/functions${endpoint}`, {
                    timeout: 15000,
                    headers: {
                        'Authorization': 'Bearer monitoring-token'
                    }
                });
                
                const responseTime = Date.now() - startTime;
                
                results[endpoint] = {
                    status: response.ok ? 'healthy' : 'unhealthy',
                    statusCode: response.status,
                    responseTime
                };
                
                if (response.ok && endpoint === '/health-check') {
                    const data = await response.json();
                    results[endpoint].serviceChecks = data.checks;
                }
                
            } catch (error) {
                results[endpoint] = {
                    status: 'error',
                    error: error.message,
                    responseTime: Date.now() - startTime
                };
            }
        }
        
        return results;
    }

    /**
     * Check external services health
     */
    async checkServicesHealth() {
        const services = {
            firebase: 'https://firebase.googleapis.com',
            cloudinary: `https://api.cloudinary.com/v1_1/${process.env.VITE_CLOUDINARY_CLOUD_NAME}/resources/image`,
            telegram: `https://api.telegram.org/bot${this.telegramBotToken}/getMe`
        };
        
        const results = {};
        
        for (const [service, url] of Object.entries(services)) {
            const startTime = Date.now();
            
            try {
                const response = await fetch(url, {
                    timeout: 10000,
                    method: 'HEAD'
                });
                
                results[service] = {
                    status: response.ok ? 'healthy' : 'unhealthy',
                    statusCode: response.status,
                    responseTime: Date.now() - startTime
                };
                
            } catch (error) {
                results[service] = {
                    status: 'error',
                    error: error.message,
                    responseTime: Date.now() - startTime
                };
            }
        }
        
        return results;
    }

    /**
     * Check performance metrics
     */
    async checkPerformance() {
        // This would typically use tools like Lighthouse or WebPageTest
        // For now, we'll simulate performance checks
        
        const startTime = Date.now();
        
        try {
            const response = await fetch(this.siteUrl, {
                timeout: 30000
            });
            
            const responseTime = Date.now() - startTime;
            const contentSize = parseInt(response.headers.get('content-length') || '0');
            
            return {
                loadTime: responseTime,
                contentSize,
                status: responseTime < this.alertThresholds.responseTime ? 'good' : 'slow',
                metrics: {
                    ttfb: Math.min(responseTime * 0.3, 1000), // Simulated TTFB
                    fcp: Math.min(responseTime * 0.6, 2000),  // Simulated FCP
                    lcp: Math.min(responseTime * 0.8, 2500)   // Simulated LCP
                }
            };
            
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                loadTime: Date.now() - startTime
            };
        }
    }

    /**
     * Update metrics storage
     */
    updateMetrics(results) {
        const now = Date.now();
        
        // Site uptime
        this.metrics.uptime.push({
            timestamp: now,
            isUp: results.site.status === 'healthy'
        });
        
        // Response time
        if (results.site.responseTime) {
            this.metrics.responseTime.push({
                timestamp: now,
                time: results.site.responseTime
            });
        }
        
        // Errors
        if (results.site.status !== 'healthy') {
            this.metrics.errors.push({
                timestamp: now,
                error: results.site.error || `HTTP ${results.site.statusCode}`,
                type: 'site'
            });
        }
        
        // Keep only last 24 hours of data
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        this.metrics.uptime = this.metrics.uptime.filter(m => m.timestamp > oneDayAgo);
        this.metrics.responseTime = this.metrics.responseTime.filter(m => m.timestamp > oneDayAgo);
        this.metrics.errors = this.metrics.errors.filter(m => m.timestamp > oneDayAgo);
    }

    /**
     * Check for alert conditions
     */
    async checkAlerts(results) {
        const alerts = [];
        
        // Site down alert
        if (results.site.status !== 'healthy') {
            alerts.push({
                type: 'site_down',
                severity: 'critical',
                message: `🚨 Site is DOWN!\n\nStatus: ${results.site.status}\nError: ${results.site.error || results.site.statusCode}\nTime: ${new Date().toLocaleString()}`
            });
        }
        
        // Slow response time alert
        if (results.site.responseTime > this.alertThresholds.responseTime) {
            alerts.push({
                type: 'slow_response',
                severity: 'warning',
                message: `⚠️ Slow Response Time\n\nResponse time: ${results.site.responseTime}ms\nThreshold: ${this.alertThresholds.responseTime}ms\nTime: ${new Date().toLocaleString()}`
            });
        }
        
        // API health alerts
        Object.entries(results.api).forEach(([endpoint, result]) => {
            if (result.status !== 'healthy') {
                alerts.push({
                    type: 'api_error',
                    severity: 'high',
                    message: `🔴 API Endpoint Error\n\nEndpoint: ${endpoint}\nStatus: ${result.status}\nError: ${result.error || result.statusCode}\nTime: ${new Date().toLocaleString()}`
                });
            }
        });
        
        // Service health alerts
        Object.entries(results.services).forEach(([service, result]) => {
            if (result.status !== 'healthy') {
                alerts.push({
                    type: 'service_error',
                    severity: 'high',
                    message: `🔴 External Service Error\n\nService: ${service}\nStatus: ${result.status}\nError: ${result.error || result.statusCode}\nTime: ${new Date().toLocaleString()}`
                });
            }
        });
        
        // Send alerts
        for (const alert of alerts) {
            await this.sendAlert(alert);
        }
    }

    /**
     * Send alert notification
     */
    async sendAlert(alert) {
        if (!this.telegramBotToken || !this.telegramChatId) {
            console.warn('Telegram credentials not configured for alerts');
            return;
        }
        
        try {
            const response = await fetch(
                `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: this.telegramChatId,
                        text: alert.message,
                        parse_mode: 'HTML'
                    })
                }
            );
            
            if (response.ok) {
                console.log(`📱 Alert sent: ${alert.type}`);
            } else {
                console.error('Failed to send alert:', response.status);
            }
            
        } catch (error) {
            console.error('Error sending alert:', error);
        }
    }

    /**
     * Send daily summary
     */
    async sendDailySummary() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        // Calculate uptime
        const uptimeChecks = this.metrics.uptime.filter(m => m.timestamp > oneDayAgo);
        const upCount = uptimeChecks.filter(m => m.isUp).length;
        const uptimePercentage = uptimeChecks.length > 0 ? (upCount / uptimeChecks.length * 100).toFixed(2) : 0;
        
        // Calculate average response time
        const responseTimeChecks = this.metrics.responseTime.filter(m => m.timestamp > oneDayAgo);
        const avgResponseTime = responseTimeChecks.length > 0 
            ? Math.round(responseTimeChecks.reduce((sum, m) => sum + m.time, 0) / responseTimeChecks.length)
            : 0;
        
        // Count errors
        const errorCount = this.metrics.errors.filter(m => m.timestamp > oneDayAgo).length;
        
        const summary = 
            `📊 Daily Monitoring Summary\n\n` +
            `🌐 **Site Status**\n` +
            `Uptime: ${uptimePercentage}%\n` +
            `Avg Response Time: ${avgResponseTime}ms\n` +
            `Errors: ${errorCount}\n\n` +
            `📅 Period: Last 24 hours\n` +
            `🕐 Generated: ${new Date().toLocaleString()}`;
        
        await this.sendAlert({
            type: 'daily_summary',
            severity: 'info',
            message: summary
        });
    }

    /**
     * Save monitoring results
     */
    async saveResults(results) {
        const resultsDir = path.join(process.cwd(), 'monitoring-results');
        
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        
        const filename = `monitoring-${new Date().toISOString().split('T')[0]}.json`;
        const filepath = path.join(resultsDir, filename);
        
        let dailyResults = [];
        
        if (fs.existsSync(filepath)) {
            dailyResults = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        }
        
        dailyResults.push(results);
        
        fs.writeFileSync(filepath, JSON.stringify(dailyResults, null, 2));
    }

    /**
     * Get monitoring statistics
     */
    getStats() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        const uptimeChecks = this.metrics.uptime.filter(m => m.timestamp > oneDayAgo);
        const upCount = uptimeChecks.filter(m => m.isUp).length;
        const uptimePercentage = uptimeChecks.length > 0 ? (upCount / uptimeChecks.length * 100).toFixed(2) : 0;
        
        const responseTimeChecks = this.metrics.responseTime.filter(m => m.timestamp > oneDayAgo);
        const avgResponseTime = responseTimeChecks.length > 0 
            ? Math.round(responseTimeChecks.reduce((sum, m) => sum + m.time, 0) / responseTimeChecks.length)
            : 0;
        
        const errorCount = this.metrics.errors.filter(m => m.timestamp > oneDayAgo).length;
        
        return {
            uptime: `${uptimePercentage}%`,
            averageResponseTime: `${avgResponseTime}ms`,
            errorsLast24h: errorCount,
            lastCheck: this.metrics.lastCheck,
            totalChecks: uptimeChecks.length
        };
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitor = new ProductionMonitor();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Monitoring stopped');
        process.exit(0);
    });
    
    monitor.startMonitoring().catch(error => {
        console.error('Monitoring failed:', error);
        process.exit(1);
    });
}

export default ProductionMonitor;