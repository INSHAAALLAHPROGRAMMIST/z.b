# Production Environment Setup Guide

This guide walks you through setting up the complete production environment for Zamon Books e-commerce platform.

## 📋 Prerequisites

Before starting, ensure you have:

- Node.js 18.x or higher
- npm 9.x or higher
- Git installed and configured
- Netlify CLI installed (`npm install -g netlify-cli`)
- Firebase CLI installed (`npm install -g firebase-tools`)

## 🚀 Quick Start

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd zamon-books
   npm install
   ```

2. **Test configuration**
   ```bash
   npm run config:test
   ```

3. **Setup environment variables**
   ```bash
   npm run config:setup
   ```

4. **Deploy to production**
   ```bash
   npm run deploy:production
   ```

## 🔧 Detailed Setup Process

### Step 1: Environment Configuration

1. **Copy the production environment template**
   ```bash
   cp .env.production.complete .env.production
   ```

2. **Update environment variables**
   Edit `.env.production` and replace all placeholder values:

   **Firebase Configuration:**
   - Get values from [Firebase Console](https://console.firebase.google.com)
   - Create a new project or use existing one
   - Enable Firestore and Authentication

   **Cloudinary Configuration:**
   - Sign up at [Cloudinary](https://cloudinary.com)
   - Get cloud name, API key, and API secret
   - Create upload presets for different image types

   **Telegram Bot Configuration:**
   - Create a bot via [@BotFather](https://t.me/botfather)
   - Get bot token and set up webhook
   - Create channels for notifications

### Step 2: Service Account Setup

1. **Firebase Service Account**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate new private key
   - Add the credentials to environment variables

2. **Cloudinary Upload Presets**
   - Go to Cloudinary Console → Settings → Upload
   - Create presets for: `zamon_books_preset`, `zamon_profiles_preset`, `zamon_thumbnails_preset`

### Step 3: Netlify Configuration

1. **Login to Netlify**
   ```bash
   netlify login
   ```

2. **Create new site or link existing**
   ```bash
   netlify init
   ```

3. **Setup environment variables**
   ```bash
   npm run config:setup
   ```

### Step 4: Domain and SSL Setup

1. **Add custom domain in Netlify**
   - Go to Site settings → Domain management
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Configure DNS records**
   ```
   A Record: @ → 75.2.60.5
   CNAME Record: www → your-site.netlify.app
   ```

3. **SSL Certificate**
   - SSL will be automatically provisioned by Netlify
   - Wait for DNS propagation (up to 24 hours)

### Step 5: Firebase Setup

1. **Deploy security rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Deploy indexes**
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **Setup authentication**
   - Enable Email/Password authentication
   - Configure authorized domains

### Step 6: Testing and Validation

1. **Run configuration tests**
   ```bash
   npm run config:test
   ```

2. **Test individual services**
   ```bash
   # Test Cloudinary
   curl -X POST https://your-site.netlify.app/.netlify/functions/cloudinary-upload
   
   # Test Telegram webhook
   curl -X POST https://your-site.netlify.app/.netlify/functions/telegram-webhook
   
   # Test Firebase admin
   curl -X POST https://your-site.netlify.app/.netlify/functions/firebase-admin
   ```

### Step 7: Production Deployment

1. **Run full deployment**
   ```bash
   npm run deploy:production
   ```

2. **Verify deployment**
   - Check site accessibility
   - Test critical user flows
   - Verify all functions are working

## 🔒 Security Checklist

- [ ] All environment variables are properly set
- [ ] Firebase security rules are configured
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] API keys are properly scoped
- [ ] Sensitive data is not exposed in client-side code

## 📊 Monitoring Setup

### Netlify Analytics
- Enable in Site settings → Analytics
- Monitor traffic and performance

### Error Tracking
- Configure error monitoring service
- Set up alerts for critical errors

### Performance Monitoring
- Use Lighthouse for performance audits
- Monitor Core Web Vitals

## 🛠 Maintenance

### Regular Tasks
- Update dependencies monthly
- Review security rules quarterly
- Monitor performance metrics
- Backup database regularly

### Scaling Considerations
- Monitor Netlify function usage
- Optimize Cloudinary usage
- Review Firebase pricing
- Consider CDN for static assets

## 🆘 Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build:production
```

**Environment Variable Issues**
```bash
# List current variables
npm run config:list

# Update variables
npm run config:update
```

**Function Errors**
- Check Netlify function logs
- Verify environment variables
- Test functions locally with `netlify dev`

**SSL Certificate Issues**
- Verify DNS configuration
- Wait for propagation
- Contact Netlify support if needed

### Getting Help

- Check [Netlify Documentation](https://docs.netlify.com)
- Review [Firebase Documentation](https://firebase.google.com/docs)
- Contact support channels for specific services

## 📚 Additional Resources

- [Netlify Production Best Practices](https://docs.netlify.com/configure-builds/get-started/)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloudinary Optimization Guide](https://cloudinary.com/documentation/image_optimization)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)

## 🎯 Performance Targets

- **Page Load Time:** < 3 seconds
- **First Contentful Paint:** < 1.5 seconds
- **Largest Contentful Paint:** < 2.5 seconds
- **Cumulative Layout Shift:** < 0.1
- **First Input Delay:** < 100ms

## 📈 Success Metrics

- Site uptime > 99.9%
- Error rate < 0.1%
- Function success rate > 99%
- Image optimization > 70% size reduction
- User satisfaction score > 4.5/5

---

**Note:** This guide assumes you have basic knowledge of web development and deployment processes. If you encounter issues, refer to the troubleshooting section or seek help from the development team.