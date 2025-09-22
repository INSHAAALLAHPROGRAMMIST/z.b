#!/usr/bin/env node

/**
 * Netlify Environment Variables Setup Script
 * Automates the process of setting up environment variables in Netlify
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
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
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

class NetlifyEnvSetup {
  constructor() {
    this.siteId = process.env.NETLIFY_SITE_ID;
    this.envFile = '.env.production.complete';
    this.requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_CLOUDINARY_CLOUD_NAME',
      'VITE_TELEGRAM_BOT_TOKEN',
      'VITE_SITE_URL'
    ];
  }

  // Check if Netlify CLI is installed
  checkNetlifyCLI() {
    try {
      execSync('netlify --version', { stdio: 'pipe' });
      log.success('Netlify CLI is installed');
      return true;
    } catch (error) {
      log.error('Netlify CLI is not installed');
      log.info('Install it with: npm install -g netlify-cli');
      return false;
    }
  }

  // Check if user is logged in to Netlify
  checkNetlifyAuth() {
    try {
      const result = execSync('netlify status', { stdio: 'pipe', encoding: 'utf8' });
      if (result.includes('Logged in')) {
        log.success('Logged in to Netlify');
        return true;
      }
    } catch (error) {
      log.error('Not logged in to Netlify');
      log.info('Login with: netlify login');
      return false;
    }
    return false;
  }

  // Parse environment file
  parseEnvFile() {
    if (!existsSync(this.envFile)) {
      log.error(`Environment file ${this.envFile} not found`);
      return null;
    }

    const content = readFileSync(this.envFile, 'utf8');
    const vars = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key && value && !value.includes('your_') && !value.includes('xxxxx')) {
          vars[key] = value;
        }
      }
    });

    return vars;
  }

  // Get current Netlify environment variables
  getCurrentEnvVars() {
    try {
      const result = execSync('netlify env:list --json', { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      return JSON.parse(result);
    } catch (error) {
      log.warning('Could not fetch current environment variables');
      return [];
    }
  }

  // Set environment variable in Netlify
  setEnvVar(key, value, context = 'production') {
    try {
      execSync(`netlify env:set ${key} "${value}" --context ${context}`, { 
        stdio: 'pipe' 
      });
      return true;
    } catch (error) {
      log.error(`Failed to set ${key}: ${error.message}`);
      return false;
    }
  }

  // Validate required variables
  validateRequiredVars(vars) {
    const missing = this.requiredVars.filter(key => !vars[key]);
    
    if (missing.length > 0) {
      log.error('Missing required environment variables:');
      missing.forEach(key => log.error(`  - ${key}`));
      return false;
    }
    
    return true;
  }

  // Main setup process
  async setup() {
    log.title('🚀 Netlify Environment Variables Setup');

    // Check prerequisites
    if (!this.checkNetlifyCLI() || !this.checkNetlifyAuth()) {
      process.exit(1);
    }

    // Parse environment file
    log.info('Parsing environment file...');
    const vars = this.parseEnvFile();
    if (!vars) {
      process.exit(1);
    }

    log.success(`Found ${Object.keys(vars).length} environment variables`);

    // Validate required variables
    if (!this.validateRequiredVars(vars)) {
      log.error('Please update the environment file with actual values');
      process.exit(1);
    }

    // Get current variables
    log.info('Fetching current Netlify environment variables...');
    const currentVars = this.getCurrentEnvVars();
    const currentKeys = currentVars.map(v => v.key);

    // Set variables
    log.info('Setting environment variables in Netlify...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const [key, value] of Object.entries(vars)) {
      if (currentKeys.includes(key)) {
        log.warning(`Skipping ${key} (already exists)`);
        skipCount++;
        continue;
      }

      if (this.setEnvVar(key, value)) {
        log.success(`Set ${key}`);
        successCount++;
      } else {
        errorCount++;
      }
    }

    // Summary
    log.title('📊 Setup Summary');
    log.info(`✓ Successfully set: ${successCount} variables`);
    log.info(`⚠ Skipped existing: ${skipCount} variables`);
    if (errorCount > 0) {
      log.info(`✗ Failed: ${errorCount} variables`);
    }

    if (successCount > 0) {
      log.success('\n🎉 Environment variables setup completed!');
      log.info('You can now deploy your site with: netlify deploy --prod');
    }
  }

  // Update existing variables
  async update() {
    log.title('🔄 Update Netlify Environment Variables');

    if (!this.checkNetlifyCLI() || !this.checkNetlifyAuth()) {
      process.exit(1);
    }

    const vars = this.parseEnvFile();
    if (!vars) {
      process.exit(1);
    }

    log.info('Updating environment variables...');
    let updateCount = 0;

    for (const [key, value] of Object.entries(vars)) {
      if (this.setEnvVar(key, value)) {
        log.success(`Updated ${key}`);
        updateCount++;
      }
    }

    log.success(`\n🎉 Updated ${updateCount} environment variables!`);
  }

  // List current variables
  async list() {
    log.title('📋 Current Netlify Environment Variables');

    if (!this.checkNetlifyCLI() || !this.checkNetlifyAuth()) {
      process.exit(1);
    }

    const vars = this.getCurrentEnvVars();
    
    if (vars.length === 0) {
      log.info('No environment variables found');
      return;
    }

    vars.forEach(variable => {
      const value = variable.value.length > 50 
        ? variable.value.substring(0, 47) + '...'
        : variable.value;
      
      log.info(`${variable.key}: ${value}`);
    });

    log.info(`\nTotal: ${vars.length} variables`);
  }
}

// CLI interface
const command = process.argv[2];
const setup = new NetlifyEnvSetup();

switch (command) {
  case 'setup':
    setup.setup();
    break;
  case 'update':
    setup.update();
    break;
  case 'list':
    setup.list();
    break;
  default:
    log.title('🛠 Netlify Environment Setup Tool');
    log.info('Usage:');
    log.info('  node scripts/setup-netlify-env.js setup  - Initial setup');
    log.info('  node scripts/setup-netlify-env.js update - Update existing');
    log.info('  node scripts/setup-netlify-env.js list   - List current vars');
    break;
}