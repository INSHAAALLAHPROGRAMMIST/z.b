/**
 * Netlify Deployment Script
 * Handles production deployment with health checks and rollback capabilities
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

class NetlifyDeploymentManager {
    constructor() {
        this.siteId = process.env.NETLIFY_SITE_ID;
        this.authToken = process.env.NETLIFY_AUTH_TOKEN;
        this.apiBase = 'https://api.netlify.com/api/v1';
        this.deploymentTimeout = 10 * 60 * 1000; // 10 minutes
        
        if (!this.siteId || !this.authToken) {
            throw new Error('NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN must be set');
        }
    }

    /**
     * Deploy to production with full pipeline
     */
    async deployToProduction(options = {}) {
        const {
            skipTests = false,
            skipBackup = false,
            skipHealthCheck = false,
            message = 'Production deployment'
        } = options;

        console.log('🚀 Starting production deployment pipeline...');
        
        try {
            // Step 1: Pre-deployment checks
            await this.runPreDeploymentChecks(skipTests);
            
            // Step 2: Create database backup
            if (!skipBackup) {
                await this.createPreDeploymentBackup();
            }
            
            // Step 3: Build application
            await this.buildApplication();
            
            // Step 4: Deploy to Netlify
            const deployment = await this.deployToNetlify(message);
            
            // Step 5: Wait for deployment to be ready
            await this.waitForDeployment(deployment.id);
            
            // Step 6: Run post-deployment health checks
            if (!skipHealthCheck) {
                await this.runPostDeploymentHealthChecks(deployment.ssl_url);
            }
            
            // Step 7: Update DNS and finalize
            await this.finalizeDeployment(deployment);
            
            console.log('✅ Production deployment completed successfully!');
            console.log(`🌐 Site URL: ${deployment.ssl_url}`);
            
            return {
                success: true,
                deploymentId: deployment.id,
                url: deployment.ssl_url,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Production deployment failed:', error);
            
            // Attempt rollback if deployment was partially successful
            await this.handleDeploymentFailure(error);
            
            throw error;
        }
    }

    /**
     * Deploy preview for testing
     */
    async deployPreview(branch = 'develop') {
        console.log(`🔍 Deploying preview for branch: ${branch}`);
        
        try {
            // Build for preview
            execSync('npm run build', { stdio: 'inherit' });
            
            // Deploy preview
            const result = execSync(
                `netlify deploy --dir=dist --message="Preview deployment for ${branch}"`,
                { encoding: 'utf8' }
            );
            
            const previewUrl = this.extractPreviewUrl(result);
            
            console.log(`✅ Preview deployed: ${previewUrl}`);
            
            return {
                success: true,
                previewUrl,
                branch
            };
            
        } catch (error) {
            console.error('❌ Preview deployment failed:', error);
            throw error;
        }
    }

    /**
     * Run pre-deployment checks
     */
    async runPreDeploymentChecks(skipTests = false) {
        console.log('🔍 Running pre-deployment checks...');
        
        // Check Git status
        try {
            const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
            if (gitStatus.trim()) {
                console.warn('⚠️ Warning: Uncommitted changes detected');
            }
        } catch (error) {
            console.warn('⚠️ Could not check Git status');
        }
        
        // Run linting
        console.log('📋 Running linter...');
        execSync('npm run lint', { stdio: 'inherit' });
        
        // Run tests
        if (!skipTests) {
            console.log('🧪 Running tests...');
            execSync('npm run test:run', { stdio: 'inherit' });
        }
        
        // Check environment variables
        this.validateEnvironmentVariables();
        
        console.log('✅ Pre-deployment checks passed');
    }

    /**
     * Create pre-deployment backup
     */
    async createPreDeploymentBackup() {
        console.log('💾 Creating pre-deployment backup...');
        
        try {
            const { DatabaseMigrationManager } = await import('./database-migration.js');
            const migrationManager = new DatabaseMigrationManager();
            
            await migrationManager.createPreDeploymentBackup();
            
            console.log('✅ Pre-deployment backup created');
        } catch (error) {
            console.error('❌ Backup creation failed:', error);
            throw error;
        }
    }

    /**
     * Build application for production
     */
    async buildApplication() {
        console.log('🔨 Building application...');
        
        try {
            execSync('npm run build:production', { stdio: 'inherit' });
            
            // Verify build output
            const distPath = path.join(process.cwd(), 'dist');
            if (!fs.existsSync(distPath)) {
                throw new Error('Build output directory not found');
            }
            
            const indexPath = path.join(distPath, 'index.html');
            if (!fs.existsSync(indexPath)) {
                throw new Error('index.html not found in build output');
            }
            
            console.log('✅ Application built successfully');
        } catch (error) {
            console.error('❌ Build failed:', error);
            throw error;
        }
    }

    /**
     * Deploy to Netlify
     */
    async deployToNetlify(message) {
        console.log('🚀 Deploying to Netlify...');
        
        try {
            const result = execSync(
                `netlify deploy --prod --dir=dist --message="${message}"`,
                { encoding: 'utf8' }
            );
            
            const deploymentInfo = this.parseNetlifyOutput(result);
            
            console.log(`✅ Deployed to Netlify: ${deploymentInfo.ssl_url}`);
            
            return deploymentInfo;
        } catch (error) {
            console.error('❌ Netlify deployment failed:', error);
            throw error;
        }
    }

    /**
     * Wait for deployment to be ready
     */
    async waitForDeployment(deploymentId) {
        console.log(`⏳ Waiting for deployment ${deploymentId} to be ready...`);
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < this.deploymentTimeout) {
            try {
                const response = await fetch(
                    `${this.apiBase}/sites/${this.siteId}/deploys/${deploymentId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.authToken}`
                        }
                    }
                );
                
                const deployment = await response.json();
                
                if (deployment.state === 'ready') {
                    console.log('✅ Deployment is ready');
                    return deployment;
                } else if (deployment.state === 'error') {
                    throw new Error(`Deployment failed: ${deployment.error_message}`);
                }
                
                console.log(`⏳ Deployment state: ${deployment.state}`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                
            } catch (error) {
                console.error('Error checking deployment status:', error);
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            }
        }
        
        throw new Error('Deployment timeout - deployment did not become ready in time');
    }

    /**
     * Run post-deployment health checks
     */
    async runPostDeploymentHealthChecks(siteUrl) {
        console.log('🏥 Running post-deployment health checks...');
        
        const checks = [
            { name: 'Site Accessibility', url: siteUrl },
            { name: 'Health Endpoint', url: `${siteUrl}/.netlify/functions/health-check` },
            { name: 'Home Page', url: `${siteUrl}/` },
            { name: 'Auth Page', url: `${siteUrl}/auth` },
            { name: 'Cart Page', url: `${siteUrl}/cart` }
        ];
        
        const results = [];
        
        for (const check of checks) {
            try {
                console.log(`🔍 Checking: ${check.name}`);
                
                const response = await fetch(check.url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Netlify-Health-Check'
                    }
                });
                
                const result = {
                    name: check.name,
                    url: check.url,
                    status: response.ok ? 'healthy' : 'unhealthy',
                    statusCode: response.status,
                    responseTime: response.headers.get('x-response-time')
                };
                
                results.push(result);
                
                if (response.ok) {
                    console.log(`✅ ${check.name}: OK (${response.status})`);
                } else {
                    console.log(`❌ ${check.name}: Failed (${response.status})`);
                }
                
            } catch (error) {
                console.log(`❌ ${check.name}: Error - ${error.message}`);
                results.push({
                    name: check.name,
                    url: check.url,
                    status: 'unhealthy',
                    error: error.message
                });
            }
        }
        
        // Check if critical endpoints are healthy
        const criticalChecks = results.filter(r => 
            ['Site Accessibility', 'Home Page'].includes(r.name)
        );
        
        const failedCritical = criticalChecks.filter(r => r.status !== 'healthy');
        
        if (failedCritical.length > 0) {
            throw new Error(`Critical health checks failed: ${failedCritical.map(r => r.name).join(', ')}`);
        }
        
        console.log('✅ Post-deployment health checks passed');
        
        return results;
    }

    /**
     * Finalize deployment
     */
    async finalizeDeployment(deployment) {
        console.log('🎯 Finalizing deployment...');
        
        // Update deployment metadata
        const metadata = {
            deploymentId: deployment.id,
            url: deployment.ssl_url,
            timestamp: new Date().toISOString(),
            branch: deployment.branch,
            commitSha: deployment.commit_ref
        };
        
        // Save deployment info
        const deploymentInfoPath = path.join(process.cwd(), 'deployment-info.json');
        fs.writeFileSync(deploymentInfoPath, JSON.stringify(metadata, null, 2));
        
        // Send success notification
        await this.sendDeploymentNotification('success', metadata);
        
        console.log('✅ Deployment finalized');
    }

    /**
     * Handle deployment failure
     */
    async handleDeploymentFailure(error) {
        console.log('🚨 Handling deployment failure...');
        
        try {
            // Send failure notification
            await this.sendDeploymentNotification('failure', { error: error.message });
            
            // Optionally trigger rollback
            if (process.env.AUTO_ROLLBACK === 'true') {
                console.log('🔄 Auto-rollback enabled, attempting rollback...');
                await this.rollbackDeployment();
            }
            
        } catch (rollbackError) {
            console.error('❌ Rollback failed:', rollbackError);
        }
    }

    /**
     * Rollback deployment
     */
    async rollbackDeployment() {
        console.log('🔄 Rolling back deployment...');
        
        try {
            // Get previous successful deployment
            const response = await fetch(
                `${this.apiBase}/sites/${this.siteId}/deploys?state=ready&per_page=2`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                }
            );
            
            const deployments = await response.json();
            const previousDeployment = deployments[1]; // Second most recent
            
            if (!previousDeployment) {
                throw new Error('No previous deployment found for rollback');
            }
            
            // Restore previous deployment
            await fetch(
                `${this.apiBase}/sites/${this.siteId}/deploys/${previousDeployment.id}/restore`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                }
            );
            
            console.log(`✅ Rolled back to deployment: ${previousDeployment.id}`);
            
            // Rollback database if needed
            const { DatabaseMigrationManager } = await import('./database-migration.js');
            const migrationManager = new DatabaseMigrationManager();
            await migrationManager.rollbackToPreviousBackup();
            
            console.log('✅ Rollback completed');
            
        } catch (error) {
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }

    /**
     * Helper methods
     */
    validateEnvironmentVariables() {
        const requiredVars = [
            'VITE_FIREBASE_API_KEY',
            'VITE_FIREBASE_PROJECT_ID',
            'VITE_CLOUDINARY_CLOUD_NAME',
            'NETLIFY_SITE_ID',
            'NETLIFY_AUTH_TOKEN'
        ];
        
        const missing = requiredVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    parseNetlifyOutput(output) {
        // Parse Netlify CLI output to extract deployment info
        const lines = output.split('\n');
        const info = {};
        
        lines.forEach(line => {
            if (line.includes('Deploy path:')) {
                info.deploy_path = line.split(':')[1].trim();
            } else if (line.includes('Website URL:')) {
                info.ssl_url = line.split(':')[1].trim();
            } else if (line.includes('Unique Deploy URL:')) {
                info.deploy_url = line.split(':')[1].trim();
            }
        });
        
        return info;
    }

    extractPreviewUrl(output) {
        const lines = output.split('\n');
        const urlLine = lines.find(line => line.includes('Website draft URL:'));
        return urlLine ? urlLine.split(':')[1].trim() : null;
    }

    async sendDeploymentNotification(status, metadata) {
        // Send notification via Telegram or other service
        const message = status === 'success' 
            ? `✅ Deployment Successful\nURL: ${metadata.url}\nTime: ${metadata.timestamp}`
            : `❌ Deployment Failed\nError: ${metadata.error}\nTime: ${new Date().toISOString()}`;
        
        console.log('📢 Notification:', message);
        
        // Implementation would send actual notification
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const manager = new NetlifyDeploymentManager();
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'deploy':
                await manager.deployToProduction();
                break;
                
            case 'preview':
                const branch = process.argv[3] || 'develop';
                await manager.deployPreview(branch);
                break;
                
            case 'rollback':
                await manager.rollbackDeployment();
                break;
                
            default:
                console.log('Available commands:');
                console.log('  deploy - Deploy to production');
                console.log('  preview [branch] - Deploy preview');
                console.log('  rollback - Rollback deployment');
        }
    } catch (error) {
        console.error('Command failed:', error);
        process.exit(1);
    }
}

export default NetlifyDeploymentManager;