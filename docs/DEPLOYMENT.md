# Deployment Guide - Zamon Books

This document provides comprehensive information about deploying the Zamon Books application to production using Netlify.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Pipeline](#deployment-pipeline)
- [Branch Strategy](#branch-strategy)
- [Database Management](#database-management)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Overview

The Zamon Books application uses Netlify for hosting with the following architecture:

- **Frontend**: React SPA hosted on Netlify CDN
- **Functions**: Serverless functions for API endpoints
- **Database**: Firebase Firestore
- **Images**: Cloudinary CDN
- **Notifications**: Telegram Bot API

## Prerequisites

### Required Accounts
- Netlify account with site configured
- Firebase project with Firestore enabled
- Cloudinary account for image management
- Telegram bot for notifications

### Required Tools
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
netlify link --id YOUR_SITE_ID
```

### Environment Variables
Create `.env.production` file:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_API_SECRET=your_api_secret

# Telegram Configuration
VITE_TELEGRAM_BOT_TOKEN=your_bot_token
VITE_TELEGRAM_CHAT_ID=your_chat_id

# Netlify Configuration
NETLIFY_SITE_ID=your_site_id
NETLIFY_AUTH_TOKEN=your_auth_token

# Firebase Admin (for server-side operations)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_TOKEN=your_firebase_token
```

## Deployment Pipeline

### Automated Deployment (Recommended)

The application uses GitHub Actions for automated deployment:

1. **Trigger**: Push to `main` branch or manual trigger
2. **Tests**: Run unit, integration, and E2E tests
3. **Build**: Create production build
4. **Deploy**: Deploy to Netlify
5. **Health Check**: Verify deployment health
6. **Notification**: Send deployment status

### Manual Deployment

```bash
# Full production deployment
npm run deploy:production

# Or use the deployment script
node scripts/netlify-deploy.js deploy

# Preview deployment
node scripts/netlify-deploy.js preview
```

### Deployment Steps

1. **Pre-deployment Checks**
   ```bash
   # Run linting
   npm run lint
   
   # Run tests
   npm run test:ci
   
   # Check environment variables
   npm run config:test
   ```

2. **Database Backup**
   ```bash
   # Create pre-deployment backup
   node scripts/database-migration.js pre-deploy
   ```

3. **Build Application**
   ```bash
   # Production build
   npm run build:production
   ```

4. **Deploy to Netlify**
   ```bash
   # Deploy with health checks
   netlify deploy --prod --dir=dist
   ```

5. **Post-deployment Verification**
   ```bash
   # Run health checks
   curl https://your-site.netlify.app/.netlify/functions/health-check
   
   # Run smoke tests
   npm run test:e2e -- --config=playwright.config.production.js
   ```

## Branch Strategy

### Branch-based Deployments

- **`main`**: Production deployments
- **`develop`**: Staging deployments (deploy previews)
- **`feature/*`**: Feature branch previews

### Deploy Previews

Netlify automatically creates deploy previews for:
- Pull requests to `main`
- Pushes to `develop`
- Manual deployments from feature branches

```bash
# Create feature preview
git checkout -b feature/new-feature
git push origin feature/new-feature
netlify deploy --alias=feature-new-feature
```

## Database Management

### Migration Strategy

```bash
# Run pending migrations
node scripts/database-migration.js migrate

# Create new migration
mkdir -p database-migrations
cat > database-migrations/001-add-new-field.js << 'EOF'
export async function up(db) {
  // Migration logic here
  const books = await db.collection('books').get();
  const batch = db.batch();
  
  books.forEach(doc => {
    batch.update(doc.ref, { newField: 'defaultValue' });
  });
  
  await batch.commit();
}

export async function down(db) {
  // Rollback logic here
}
EOF
```

### Backup Strategy

- **Automatic**: Pre-deployment backups
- **Scheduled**: Daily backups via GitHub Actions
- **Manual**: On-demand backups

```bash
# Create backup
node scripts/database-migration.js backup

# Restore from backup
node scripts/database-migration.js restore backup-2024-01-15.json

# Clean old backups
node scripts/database-migration.js cleanup
```

## Monitoring and Health Checks

### Health Check Endpoint

The application provides a comprehensive health check at:
```
GET /.netlify/functions/health-check
```

Response format:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "firebase": {
      "status": "healthy",
      "responseTime": 150
    },
    "cloudinary": {
      "status": "healthy",
      "responseTime": 200
    },
    "telegram": {
      "status": "healthy",
      "responseTime": 100
    }
  },
  "totalResponseTime": 450
}
```

### Monitoring Setup

1. **Netlify Analytics**: Built-in traffic and performance monitoring
2. **Uptime Monitoring**: External service (UptimeRobot, Pingdom)
3. **Error Tracking**: Sentry or similar service
4. **Performance Monitoring**: Lighthouse CI

### Alerts Configuration

```bash
# Setup monitoring alerts
curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -d "api_key=YOUR_API_KEY" \
  -d "format=json" \
  -d "type=1" \
  -d "url=https://your-site.netlify.app/.netlify/functions/health-check" \
  -d "friendly_name=Zamon Books Health Check"
```

## Rollback Procedures

### Automatic Rollback

The deployment pipeline includes automatic rollback on:
- Health check failures
- Critical errors in post-deployment tests
- Database migration failures

### Manual Rollback

```bash
# Rollback to previous deployment
node scripts/netlify-deploy.js rollback

# Or use Netlify CLI
netlify api listSiteDeploys --data='{"site_id":"YOUR_SITE_ID"}'
netlify api restoreSiteDeploy --data='{"site_id":"YOUR_SITE_ID","deploy_id":"PREVIOUS_DEPLOY_ID"}'
```

### Database Rollback

```bash
# Rollback database to pre-deployment backup
node scripts/database-migration.js rollback
```

### Rollback Checklist

1. ✅ Identify the issue and impact
2. ✅ Notify team of rollback decision
3. ✅ Execute rollback procedure
4. ✅ Verify rollback success
5. ✅ Update monitoring and alerts
6. ✅ Document incident and lessons learned

## Performance Optimization

### Build Optimization

```javascript
// vite.config.production.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore'],
          'cloudinary-vendor': ['@cloudinary/react']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

### CDN Configuration

```toml
# netlify.toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## Security Configuration

### Headers

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
```

### Environment Variables

Never commit sensitive environment variables. Use:
- Netlify Environment Variables UI
- GitHub Secrets for CI/CD
- Local `.env` files (gitignored)

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Check build logs
netlify logs

# Local build test
npm run build:production

# Check for missing dependencies
npm audit
```

#### Deployment Failures

```bash
# Check deployment status
netlify status

# View deployment logs
netlify logs --function=deployment-webhook

# Manual deployment
netlify deploy --prod --dir=dist --debug
```

#### Health Check Failures

```bash
# Test health endpoint locally
curl http://localhost:8888/.netlify/functions/health-check

# Check individual services
curl https://api.cloudinary.com/v1_1/YOUR_CLOUD/resources/image
curl https://api.telegram.org/botYOUR_TOKEN/getMe
```

#### Database Issues

```bash
# Check Firebase connection
firebase projects:list

# Test Firestore rules
firebase firestore:rules:get

# Check indexes
firebase firestore:indexes
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment variable
export DEBUG=netlify:*

# Run deployment with debug
node scripts/netlify-deploy.js deploy
```

### Support Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Project GitHub Issues](https://github.com/your-repo/issues)

## Maintenance

### Regular Tasks

- **Weekly**: Review deployment metrics and performance
- **Monthly**: Clean up old backups and deployments
- **Quarterly**: Review and update dependencies
- **Annually**: Review and update security configurations

### Monitoring Checklist

- ✅ Site uptime and availability
- ✅ Performance metrics (Core Web Vitals)
- ✅ Error rates and types
- ✅ Database performance
- ✅ CDN cache hit rates
- ✅ Function execution times
- ✅ Security scan results

---

For additional support or questions about deployment, please refer to the troubleshooting section or create an issue in the project repository.