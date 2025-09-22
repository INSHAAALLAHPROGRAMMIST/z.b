#!/usr/bin/env node

/**
 * Production Deployment Script
 * Comprehensive deployment automation for Netlify production
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (step, total, msg) => console.log(`${colors.magenta}[${step}/${total}]${colors.reset} ${msg}`)
};

class ProductionDeployment {
  constructor() {
    this.startTime = Date.now();
    this.steps = [
      'Pre-deployment checks',
      'Environment validation',
      'Build optimization',
      'Security validation',
      'Performance testing',
      'Deployment execution',
      'Post-deployment verification',
      'Health checks'
    ];
    this.currentStep = 0;
  }

  // Execute a step with error handling
  async executeStep(stepName, stepFunction) {
    this.currentStep++;
    log.step(this.currentStep, this.steps.length, stepName);
    
    try {
      await stepFunction();
      log.success(`${stepName} completed`);
    } catch (error) {
      log.error(`${stepName} failed: ${error.message}`);
      throw error;
    }
  }

  // Main deployment process
  async deploy() {
    log.title('🚀 Production Deployment Started');
    
    try {
      await this.executeStep('Pre-deployment checks', () => this.preDeploymentChecks());
      await this.executeStep('Environment validation', () => this.validateEnvironment());
      await this.executeStep('Build optimization', () => this.buildOptimized());
      await this.executeStep('Security validation', () => this.validateSecurity());
      await this.executeStep('Performance testing', () => this.performanceTest());
      await this.executeStep('Deployment execution', () => this.deployToNetlify());
      await this.executeStep('Post-deployment verification', () => this.postDeploymentChecks());
      await this.executeStep('Health checks', () => this.healthChecks());

      const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
      log.title(`🎉 Deployment completed successfully in ${duration}s`);
      
    } catch (error) {
      log.title('💥 Deployment failed');
      log.error(error.message);
      process.exit(1);
    }
  }

  // Step 1: Pre-deployment checks
  async preDeploymentChecks() {
    // Check if we're on the correct branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      log.warning(`Deploying from branch: ${currentBranch}`);
    }

    // Check for uncommitted changes
    try {
      execSync('git diff --exit-code', { stdio: 'pipe' });
      execSync('git diff --cached --exit-code', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('Uncommitted changes detected. Please commit or stash changes before deployment.');
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '18';
    if (!nodeVersion.startsWith(`v${requiredVersion}`)) {
      log.warning(`Node.js version ${nodeVersion} detected. Recommended: v${requiredVersion}.x`);
    }

    // Check if required tools are installed
    const tools = ['netlify', 'firebase'];
    for (const tool of tools) {
      try {
        execSync(`${tool} --version`, { stdio: 'pipe' });
      } catch (error) {
        throw new Error(`${tool} CLI not found. Please install it first.`);
      }
    }

    log.info('Pre-deployment checks passed');
  }

  // Step 2: Environment validation
  async validateEnvironment() {
    const requiredEnvVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_CLOUDINARY_CLOUD_NAME',
      'VITE_TELEGRAM_BOT_TOKEN',
      'VITE_SITE_URL'
    ];

    // Check .env.production.complete file
    if (!existsSync('.env.production.complete')) {
      throw new Error('.env.production.complete file not found');
    }

    const envContent = readFileSync('.env.production.complete', 'utf8');
    const missingVars = [];

    requiredEnvVars.forEach(varName => {
      const regex = new RegExp(`^${varName}=(.+)$`, 'm');
      const match = envContent.match(regex);
      
      if (!match || match[1].includes('your_') || match[1].includes('xxxxx')) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      throw new Error(`Missing or invalid environment variables: ${missingVars.join(', ')}`);
    }

    // Validate Netlify configuration
    try {
      execSync('netlify status', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('Not logged in to Netlify. Run: netlify login');
    }

    log.info('Environment validation passed');
  }

  // Step 3: Build optimization
  async buildOptimized() {
    // Clean previous builds
    if (existsSync('dist')) {
      execSync('rm -rf dist', { stdio: 'inherit' });
    }

    // Install dependencies
    log.info('Installing dependencies...');
    execSync('npm ci', { stdio: 'inherit' });

    // Run linting
    log.info('Running linter...');
    try {
      execSync('npm run lint', { stdio: 'inherit' });
    } catch (error) {
      log.warning('Linting issues detected, but continuing...');
    }

    // Run tests
    log.info('Running tests...');
    try {
      execSync('npm run test:run', { stdio: 'inherit' });
    } catch (error) {
      log.warning('Some tests failed, but continuing...');
    }

    // Build for production
    log.info('Building for production...');
    execSync('npm run build:production', { stdio: 'inherit' });

    // Verify build output
    if (!existsSync('dist/index.html')) {
      throw new Error('Build failed - index.html not found in dist/');
    }

    log.info('Build optimization completed');
  }

  // Step 4: Security validation
  async validateSecurity() {
    // Check for sensitive data in build
    const buildFiles = execSync('find dist -name "*.js" -o -name "*.html"', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);

    const sensitivePatterns = [
      /sk_live_[a-zA-Z0-9]+/g, // Stripe live keys
      /pk_live_[a-zA-Z0-9]+/g, // Stripe publishable keys
      /AIza[0-9A-Za-z\\-_]{35}/g, // Google API keys
      /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g, // Google OAuth
      /xoxb-[0-9]{11}-[0-9]{11}-[0-9A-Za-z]{24}/g, // Slack tokens
    ];

    for (const file of buildFiles) {
      const content = readFileSync(file, 'utf8');
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          throw new Error(`Potential sensitive data found in ${file}`);
        }
      }
    }

    // Validate Firebase security rules
    if (existsSync('firestore.rules')) {
      log.info('Validating Firebase security rules...');
      try {
        execSync('firebase firestore:rules:validate', { stdio: 'pipe' });
      } catch (error) {
        throw new Error('Firebase security rules validation failed');
      }
    }

    log.info('Security validation passed');
  }

  // Step 5: Performance testing
  async performanceTest() {
    // Check bundle size
    const statsFile = 'dist/stats.json';
    if (existsSync(statsFile)) {
      const stats = JSON.parse(readFileSync(statsFile, 'utf8'));
      const totalSize = stats.assets?.reduce((sum, asset) => sum + asset.size, 0) || 0;
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (totalSize > maxSize) {
        log.warning(`Bundle size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit (5MB)`);
      }
    }

    // Check for large assets
    const largeAssets = execSync('find dist -type f -size +1M', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);

    if (largeAssets.length > 0) {
      log.warning(`Large assets detected: ${largeAssets.join(', ')}`);
    }

    log.info('Performance testing completed');
  }

  // Step 6: Deploy to Netlify
  async deployToNetlify() {
    // Deploy to Netlify
    log.info('Deploying to Netlify...');
    
    try {
      const deployOutput = execSync('netlify deploy --prod --dir=dist', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Extract deploy URL
      const urlMatch = deployOutput.match(/Website URL:\s+(https:\/\/[^\s]+)/);
      if (urlMatch) {
        this.deployUrl = urlMatch[1];
        log.success(`Deployed to: ${this.deployUrl}`);
      }
      
    } catch (error) {
      throw new Error(`Netlify deployment failed: ${error.message}`);
    }

    // Deploy Firebase rules and indexes
    if (existsSync('firebase.json')) {
      log.info('Deploying Firebase rules and indexes...');
      try {
        execSync('firebase deploy --only firestore:rules,firestore:indexes', { stdio: 'inherit' });
      } catch (error) {
        log.warning('Firebase deployment failed, but continuing...');
      }
    }

    log.info('Deployment execution completed');
  }

  // Step 7: Post-deployment verification
  async postDeploymentChecks() {
    if (!this.deployUrl) {
      log.warning('Deploy URL not found, skipping post-deployment checks');
      return;
    }

    // Wait for deployment to propagate
    log.info('Waiting for deployment to propagate...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check if site is accessible
    try {
      const response = await fetch(this.deployUrl);
      if (!response.ok) {
        throw new Error(`Site returned status ${response.status}`);
      }
      log.success('Site is accessible');
    } catch (error) {
      throw new Error(`Site accessibility check failed: ${error.message}`);
    }

    // Check critical pages
    const criticalPages = ['/', '/books', '/admin'];
    for (const page of criticalPages) {
      try {
        const response = await fetch(`${this.deployUrl}${page}`);
        if (response.ok) {
          log.success(`Page ${page} is accessible`);
        } else {
          log.warning(`Page ${page} returned status ${response.status}`);
        }
      } catch (error) {
        log.warning(`Failed to check page ${page}: ${error.message}`);
      }
    }

    log.info('Post-deployment verification completed');
  }

  // Step 8: Health checks
  async healthChecks() {
    if (!this.deployUrl) {
      log.warning('Deploy URL not found, skipping health checks');
      return;
    }

    // Check Netlify Functions
    const functions = ['health', 'telegram-webhook', 'cloudinary-upload'];
    for (const func of functions) {
      try {
        const response = await fetch(`${this.deployUrl}/.netlify/functions/${func}`, {
          method: 'GET'
        });
        
        if (response.ok || response.status === 405) { // 405 is OK for POST-only functions
          log.success(`Function ${func} is responding`);
        } else {
          log.warning(`Function ${func} returned status ${response.status}`);
        }
      } catch (error) {
        log.warning(`Failed to check function ${func}: ${error.message}`);
      }
    }

    // Generate deployment report
    this.generateDeploymentReport();

    log.info('Health checks completed');
  }

  // Generate deployment report
  generateDeploymentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      deployUrl: this.deployUrl,
      duration: ((Date.now() - this.startTime) / 1000).toFixed(2),
      branch: execSync('git branch --show-current', { encoding: 'utf8' }).trim(),
      commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      nodeVersion: process.version,
      status: 'success'
    };

    writeFileSync('deployment-report.json', JSON.stringify(report, null, 2));
    log.success('Deployment report generated: deployment-report.json');
  }
}

// CLI interface
const deployment = new ProductionDeployment();

// Handle process termination
process.on('SIGINT', () => {
  log.warning('\nDeployment interrupted by user');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Start deployment
deployment.deploy().catch((error) => {
  log.error(`Deployment failed: ${error.message}`);
  process.exit(1);
});