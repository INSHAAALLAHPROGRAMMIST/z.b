/**
 * Netlify Production Configuration
 * Domain, SSL, and hosting settings for production
 */

export const netlifyProductionConfig = {
  // Site configuration
  site: {
    name: 'zamon-books',
    customDomain: process.env.VITE_SITE_URL?.replace('https://', '') || 'zamon-books.com',
    defaultDomain: 'zamon-books.netlify.app',
    
    // Build settings
    buildCommand: 'npm run build:production',
    publishDirectory: 'dist',
    functionsDirectory: 'netlify/functions',
    
    // Node.js version
    nodeVersion: '18',
    npmVersion: '9'
  },
  
  // SSL/TLS configuration
  ssl: {
    // Automatic HTTPS redirect
    httpsRedirect: true,
    
    // Force SSL
    forceSSL: true,
    
    // HSTS (HTTP Strict Transport Security)
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    
    // Certificate settings
    certificate: {
      // Let's Encrypt automatic certificate
      autoRenewal: true,
      
      // Custom certificate (if needed)
      customCert: false,
      certPath: null,
      keyPath: null,
      chainPath: null
    }
  },
  
  // Domain configuration
  domains: {
    primary: process.env.VITE_SITE_URL?.replace('https://', '') || 'zamon-books.com',
    aliases: [
      'www.zamon-books.com',
      'zamonbooks.com',
      'www.zamonbooks.com'
    ],
    
    // Subdomain configuration
    subdomains: {
      api: 'api.zamon-books.com',
      admin: 'admin.zamon-books.com',
      cdn: 'cdn.zamon-books.com'
    }
  },
  
  // Headers configuration
  headers: {
    // Security headers
    security: {
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' 
          https://www.googletagmanager.com 
          https://www.google-analytics.com
          https://connect.facebook.net
          https://mc.yandex.ru;
        style-src 'self' 'unsafe-inline' 
          https://fonts.googleapis.com;
        font-src 'self' 
          https://fonts.gstatic.com;
        img-src 'self' data: blob: 
          https://res.cloudinary.com 
          https://www.google-analytics.com
          https://www.facebook.com;
        connect-src 'self' 
          https://api.telegram.org
          https://api.cloudinary.com
          https://*.firebaseio.com
          https://*.googleapis.com
          https://www.google-analytics.com;
        frame-src 'none';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim()
    },
    
    // Performance headers
    performance: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Vary': 'Accept-Encoding',
      'X-DNS-Prefetch-Control': 'on'
    },
    
    // CORS headers
    cors: {
      'Access-Control-Allow-Origin': process.env.VITE_SITE_URL || 'https://zamon-books.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  },
  
  // Redirects configuration
  redirects: [
    // WWW redirect
    {
      from: 'https://www.zamon-books.com/*',
      to: 'https://zamon-books.com/:splat',
      status: 301,
      force: true
    },
    
    // Alternative domain redirects
    {
      from: 'https://zamonbooks.com/*',
      to: 'https://zamon-books.com/:splat',
      status: 301,
      force: true
    },
    
    // HTTP to HTTPS redirect
    {
      from: 'http://zamon-books.com/*',
      to: 'https://zamon-books.com/:splat',
      status: 301,
      force: true
    },
    
    // SPA fallback
    {
      from: '/*',
      to: '/index.html',
      status: 200
    }
  ],
  
  // Environment-specific settings
  environments: {
    production: {
      context: 'production',
      branch: 'main',
      
      // Build settings
      build: {
        command: 'npm run build:production',
        environment: {
          NODE_ENV: 'production',
          VITE_ENV: 'production'
        }
      },
      
      // Deploy settings
      deploy: {
        autoPublish: true,
        skipDrafts: false
      }
    },
    
    staging: {
      context: 'branch-deploy',
      branch: 'staging',
      
      build: {
        command: 'npm run build',
        environment: {
          NODE_ENV: 'staging',
          VITE_ENV: 'staging'
        }
      },
      
      deploy: {
        autoPublish: false,
        skipDrafts: true
      }
    },
    
    preview: {
      context: 'deploy-preview',
      
      build: {
        command: 'npm run build',
        environment: {
          NODE_ENV: 'development',
          VITE_ENV: 'preview'
        }
      }
    }
  },
  
  // Functions configuration
  functions: {
    directory: 'netlify/functions',
    
    // Runtime settings
    runtime: 'nodejs18.x',
    timeout: 30,
    memorySize: 1024,
    
    // Environment variables for functions
    environment: {
      NODE_ENV: 'production',
      TZ: 'Asia/Tashkent'
    },
    
    // External dependencies
    externalNodeModules: [
      'firebase-admin',
      'cloudinary',
      'node-telegram-bot-api'
    ]
  },
  
  // Analytics and monitoring
  analytics: {
    // Netlify Analytics
    netlifyAnalytics: true,
    
    // Google Analytics
    googleAnalytics: process.env.VITE_GA_MEASUREMENT_ID,
    
    // Performance monitoring
    performanceMonitoring: true,
    
    // Error tracking
    errorTracking: true
  },
  
  // Forms configuration (if needed)
  forms: {
    enabled: true,
    spamFilter: true,
    notifications: {
      email: 'admin@zamon-books.com'
    }
  },
  
  // Edge functions (if needed)
  edge: {
    enabled: false,
    functions: []
  }
};

// Generate Netlify TOML configuration
export const generateNetlifyToml = (config = netlifyProductionConfig) => {
  return `
# Netlify Configuration File
# Generated automatically - do not edit manually

[build]
  command = "${config.site.buildCommand}"
  publish = "${config.site.publishDirectory}"
  functions = "${config.site.functionsDirectory}"

[build.environment]
  NODE_VERSION = "${config.site.nodeVersion}"
  NPM_VERSION = "${config.site.npmVersion}"
  NODE_ENV = "production"

# Production context
[context.production]
  command = "${config.environments.production.build.command}"

# Staging context
[context.branch-deploy]
  command = "${config.environments.staging.build.command}"

# Deploy preview context
[context.deploy-preview]
  command = "${config.environments.preview.build.command}"

# Functions configuration
[functions]
  directory = "${config.functions.directory}"
  node_bundler = "esbuild"

# Redirects
${config.redirects.map(redirect => `
[[redirects]]
  from = "${redirect.from}"
  to = "${redirect.to}"
  status = ${redirect.status}${redirect.force ? '\n  force = true' : ''}
`).join('')}

# Headers
[[headers]]
  for = "/*"
  [headers.values]
${Object.entries(config.headers.security).map(([key, value]) => 
  `    ${key} = "${value}"`
).join('\n')}

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.@(js|css|woff2|woff|ttf|eot)"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.@(jpg|jpeg|png|gif|svg|webp|avif|ico)"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Edge functions (if enabled)
${config.edge.enabled ? `
[[edge_functions]]
  function = "main"
  path = "/*"
` : ''}
`.trim();
};

// Domain setup instructions
export const domainSetupInstructions = {
  steps: [
    {
      step: 1,
      title: 'Purchase Domain',
      description: 'Purchase your custom domain from a domain registrar',
      actions: [
        'Choose a domain registrar (Namecheap, GoDaddy, etc.)',
        'Purchase the domain (e.g., zamon-books.com)',
        'Verify domain ownership'
      ]
    },
    {
      step: 2,
      title: 'Add Domain to Netlify',
      description: 'Add your custom domain in Netlify dashboard',
      actions: [
        'Go to Site settings > Domain management',
        'Click "Add custom domain"',
        'Enter your domain name',
        'Verify domain ownership'
      ]
    },
    {
      step: 3,
      title: 'Configure DNS',
      description: 'Update DNS records at your domain registrar',
      actions: [
        'Add CNAME record: www -> your-site.netlify.app',
        'Add A record: @ -> 75.2.60.5',
        'Or use Netlify DNS for easier management'
      ]
    },
    {
      step: 4,
      title: 'Enable SSL',
      description: 'SSL certificate will be automatically provisioned',
      actions: [
        'Wait for DNS propagation (up to 24 hours)',
        'SSL certificate will be automatically issued',
        'Verify HTTPS is working'
      ]
    }
  ],
  
  dnsRecords: {
    a: [
      { name: '@', value: '75.2.60.5' },
      { name: '@', value: '99.83.190.102' },
      { name: '@', value: '198.61.188.130' },
      { name: '@', value: '34.102.136.180' }
    ],
    cname: [
      { name: 'www', value: 'your-site.netlify.app' }
    ]
  }
};

// Validation function
export const validateNetlifyConfig = (config) => {
  const errors = [];
  
  if (!config.site.customDomain) {
    errors.push('Custom domain is required');
  }
  
  if (!config.site.buildCommand) {
    errors.push('Build command is required');
  }
  
  if (!config.site.publishDirectory) {
    errors.push('Publish directory is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Netlify configuration errors: ${errors.join(', ')}`);
  }
  
  return true;
};