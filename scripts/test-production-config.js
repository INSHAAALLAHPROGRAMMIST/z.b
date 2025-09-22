#!/usr/bin/env node

/**
 * Production Configuration Testing Script
 * Validates all production configurations before deployment
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Import configuration modules
import { cloudinaryProductionConfig, validateCloudinaryConfig } from '../config/cloudinary.production.js';
import { telegramProductionConfig, validateTelegramConfig } from '../config/telegram.production.js';
import { netlifyProductionConfig, validateNetlifyConfig } from '../config/netlify.production.js';

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
  section: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}`)
};

class ConfigurationTester {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.testResults = {
      environment: false,
      cloudinary: false,
      telegram: false,
      netlify: false,
      firebase: false,
      security: false,
      performance: false
    };
  }

  // Main testing function
  async runAllTests() {
    log.title('🧪 Production Configuration Testing');

    await this.testEnvironmentVariables();
    await this.testCloudinaryConfig();
    await this.testTelegramConfig();
    await this.testNetlifyConfig();
    await this.testFirebaseConfig();
    await this.testSecurityConfig();
    await this.testPerformanceConfig();

    this.generateReport();
  }

  // Test environment variables
  async testEnvironmentVariables() {
    log.section('📋 Testing Environment Variables');

    const envFile = '.env.production.complete';
    if (!existsSync(envFile)) {
      this.addError('Environment file not found', envFile);
      return;
    }

    const envContent = readFileSync(envFile, 'utf8');
    const envVars = this.parseEnvFile(envContent);

    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_CLOUDINARY_CLOUD_NAME',
      'VITE_CLOUDINARY_API_KEY',
      'VITE_TELEGRAM_BOT_TOKEN',
      'VITE_SITE_URL',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY'
    ];

    const missingVars = [];
    const invalidVars = [];

    requiredVars.forEach(varName => {
      if (!envVars[varName]) {
        missingVars.push(varName);
      } else if (envVars[varName].includes('your_') || envVars[varName].includes('xxxxx')) {
        invalidVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      this.addError('Missing environment variables', missingVars.join(', '));
    }

    if (invalidVars.length > 0) {
      this.addError('Invalid environment variables (placeholder values)', invalidVars.join(', '));
    }

    // Test URL format
    if (envVars.VITE_SITE_URL && !envVars.VITE_SITE_URL.startsWith('https://')) {
      this.addError('Site URL must use HTTPS', envVars.VITE_SITE_URL);
    }

    if (missingVars.length === 0 && invalidVars.length === 0) {
      this.testResults.environment = true;
      log.success('Environment variables validation passed');
    }
  }

  // Test Cloudinary configuration
  async testCloudinaryConfig() {
    log.section('☁️ Testing Cloudinary Configuration');

    try {
      validateCloudinaryConfig(cloudinaryProductionConfig);
      
      // Test API connectivity (if credentials are available)
      if (process.env.VITE_CLOUDINARY_API_KEY && process.env.VITE_CLOUDINARY_API_SECRET) {
        await this.testCloudinaryAPI();
      } else {
        this.addWarning('Cloudinary API credentials not available for connectivity test');
      }

      // Validate configuration structure
      this.validateCloudinaryStructure();

      this.testResults.cloudinary = true;
      log.success('Cloudinary configuration validation passed');

    } catch (error) {
      this.addError('Cloudinary configuration invalid', error.message);
    }
  }

  // Test Telegram configuration
  async testTelegramConfig() {
    log.section('📱 Testing Telegram Configuration');

    try {
      validateTelegramConfig(telegramProductionConfig);

      // Test bot API connectivity (if token is available)
      if (process.env.VITE_TELEGRAM_BOT_TOKEN) {
        await this.testTelegramAPI();
      } else {
        this.addWarning('Telegram bot token not available for connectivity test');
      }

      // Validate message templates
      this.validateTelegramTemplates();

      this.testResults.telegram = true;
      log.success('Telegram configuration validation passed');

    } catch (error) {
      this.addError('Telegram configuration invalid', error.message);
    }
  }

  // Test Netlify configuration
  async testNetlifyConfig() {
    log.section('🌐 Testing Netlify Configuration');

    try {
      validateNetlifyConfig(netlifyProductionConfig);

      // Test Netlify CLI availability
      try {
        execSync('netlify --version', { stdio: 'pipe' });
        log.info('Netlify CLI is available');
      } catch (error) {
        this.addWarning('Netlify CLI not installed');
      }

      // Validate netlify.toml file
      if (existsSync('netlify.toml')) {
        this.validateNetlifyToml();
      } else {
        this.addWarning('netlify.toml file not found');
      }

      // Validate functions
      this.validateNetlifyFunctions();

      this.testResults.netlify = true;
      log.success('Netlify configuration validation passed');

    } catch (error) {
      this.addError('Netlify configuration invalid', error.message);
    }
  }

  // Test Firebase configuration
  async testFirebaseConfig() {
    log.section('🔥 Testing Firebase Configuration');

    // Check firebase.json
    if (!existsSync('firebase.json')) {
      this.addError('firebase.json not found');
      return;
    }

    try {
      const firebaseConfig = JSON.parse(readFileSync('firebase.json', 'utf8'));
      
      // Validate structure
      if (!firebaseConfig.firestore) {
        this.addError('Firestore configuration missing in firebase.json');
      }

      if (!firebaseConfig.hosting) {
        this.addError('Hosting configuration missing in firebase.json');
      }

      // Check security rules
      if (existsSync('firestore.rules')) {
        try {
          execSync('firebase firestore:rules:validate', { stdio: 'pipe' });
          log.success('Firebase security rules are valid');
        } catch (error) {
          this.addError('Firebase security rules validation failed', error.message);
        }
      } else {
        this.addError('firestore.rules file not found');
      }

      // Check indexes
      if (existsSync('firestore.indexes.json')) {
        const indexes = JSON.parse(readFileSync('firestore.indexes.json', 'utf8'));
        if (!indexes.indexes || indexes.indexes.length === 0) {
          this.addWarning('No Firestore indexes defined');
        }
      } else {
        this.addWarning('firestore.indexes.json file not found');
      }

      this.testResults.firebase = true;
      log.success('Firebase configuration validation passed');

    } catch (error) {
      this.addError('Firebase configuration invalid', error.message);
    }
  }

  // Test security configuration
  async testSecurityConfig() {
    log.section('🔒 Testing Security Configuration');

    // Check for sensitive data in environment files
    const envFiles = ['.env', '.env.local', '.env.production'];
    
    envFiles.forEach(file => {
      if (existsSync(file)) {
        const content = readFileSync(file, 'utf8');
        
        // Check for common sensitive patterns
        const sensitivePatterns = [
          { pattern: /password\s*=\s*[^#\n]+/i, name: 'Password' },
          { pattern: /secret\s*=\s*[^#\n]+/i, name: 'Secret' },
          { pattern: /private_key\s*=\s*[^#\n]+/i, name: 'Private Key' }
        ];

        sensitivePatterns.forEach(({ pattern, name }) => {
          if (pattern.test(content)) {
            this.addWarning(`${name} found in ${file} - ensure it's properly secured`);
          }
        });
      }
    });

    // Check HTTPS enforcement
    const netlifyToml = existsSync('netlify.toml') ? readFileSync('netlify.toml', 'utf8') : '';
    if (!netlifyToml.includes('force = true') && !netlifyToml.includes('https')) {
      this.addWarning('HTTPS enforcement not configured in netlify.toml');
    }

    // Check security headers
    if (!netlifyToml.includes('X-Frame-Options')) {
      this.addWarning('Security headers not configured in netlify.toml');
    }

    this.testResults.security = true;
    log.success('Security configuration validation passed');
  }

  // Test performance configuration
  async testPerformanceConfig() {
    log.section('⚡ Testing Performance Configuration');

    // Check build configuration
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    
    if (!packageJson.scripts['build:production']) {
      this.addWarning('Production build script not found');
    }

    // Check for optimization plugins
    const viteConfig = existsSync('vite.config.production.js') 
      ? readFileSync('vite.config.production.js', 'utf8')
      : '';

    if (!viteConfig.includes('terser') && !viteConfig.includes('minify')) {
      this.addWarning('Minification not configured in Vite config');
    }

    // Check caching headers
    const netlifyToml = existsSync('netlify.toml') ? readFileSync('netlify.toml', 'utf8') : '';
    if (!netlifyToml.includes('Cache-Control')) {
      this.addWarning('Caching headers not configured');
    }

    this.testResults.performance = true;
    log.success('Performance configuration validation passed');
  }

  // Helper methods
  parseEnvFile(content) {
    const vars = {};
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        vars[key] = value;
      }
    });
    return vars;
  }

  async testCloudinaryAPI() {
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.VITE_CLOUDINARY_CLOUD_NAME}/image/list`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.VITE_CLOUDINARY_API_KEY}:${process.env.VITE_CLOUDINARY_API_SECRET}`).toString('base64')}`
        }
      });

      if (response.ok) {
        log.success('Cloudinary API connectivity test passed');
      } else {
        this.addError('Cloudinary API connectivity test failed', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addError('Cloudinary API connectivity test failed', error.message);
    }
  }

  async testTelegramAPI() {
    try {
      const response = await fetch(`https://api.telegram.org/bot${process.env.VITE_TELEGRAM_BOT_TOKEN}/getMe`);
      const data = await response.json();

      if (data.ok) {
        log.success(`Telegram bot connectivity test passed - Bot: ${data.result.username}`);
      } else {
        this.addError('Telegram API connectivity test failed', data.description);
      }
    } catch (error) {
      this.addError('Telegram API connectivity test failed', error.message);
    }
  }

  validateCloudinaryStructure() {
    const required = ['cloudName', 'optimization', 'transformations', 'security'];
    required.forEach(key => {
      if (!cloudinaryProductionConfig[key]) {
        this.addError(`Cloudinary configuration missing: ${key}`);
      }
    });
  }

  validateTelegramTemplates() {
    const templates = telegramProductionConfig.templates;
    if (!templates || !templates.newOrder || !templates.orderStatus) {
      this.addError('Telegram message templates incomplete');
    }
  }

  validateNetlifyToml() {
    const content = readFileSync('netlify.toml', 'utf8');
    
    if (!content.includes('[build]')) {
      this.addError('Build configuration missing in netlify.toml');
    }

    if (!content.includes('[[redirects]]')) {
      this.addWarning('Redirects not configured in netlify.toml');
    }
  }

  validateNetlifyFunctions() {
    const requiredFunctions = ['telegram-webhook.js', 'cloudinary-upload.js', 'firebase-admin.js'];
    
    requiredFunctions.forEach(func => {
      if (!existsSync(`netlify/functions/${func}`)) {
        this.addError(`Netlify function missing: ${func}`);
      }
    });
  }

  addError(message, details = '') {
    this.errors.push({ message, details });
    log.error(`${message}${details ? `: ${details}` : ''}`);
  }

  addWarning(message, details = '') {
    this.warnings.push({ message, details });
    log.warning(`${message}${details ? `: ${details}` : ''}`);
  }

  generateReport() {
    log.title('📊 Configuration Test Report');

    const passedTests = Object.values(this.testResults).filter(Boolean).length;
    const totalTests = Object.keys(this.testResults).length;

    log.info(`Tests passed: ${passedTests}/${totalTests}`);
    log.info(`Errors: ${this.errors.length}`);
    log.info(`Warnings: ${this.warnings.length}`);

    if (this.errors.length === 0) {
      log.success('\n🎉 All configuration tests passed!');
      log.info('Your production environment is ready for deployment.');
    } else {
      log.error('\n💥 Configuration tests failed!');
      log.info('Please fix the errors before deploying to production.');
      
      console.log('\n📋 Summary of Issues:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}${error.details ? `: ${error.details}` : ''}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}${warning.details ? `: ${warning.details}` : ''}`);
      });
    }

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// Run tests
const tester = new ConfigurationTester();
tester.runAllTests().catch(error => {
  log.error(`Test runner failed: ${error.message}`);
  process.exit(1);
});