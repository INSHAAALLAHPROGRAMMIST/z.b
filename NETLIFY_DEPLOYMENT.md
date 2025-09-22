# 🚀 Netlify Deployment Guide - Zamon Books

## 📋 Netlify ga Deploy Qilish Qadamlari

### 1. Netlify Account Yaratish

1. [Netlify.com](https://netlify.com) ga o'ting
2. GitHub account bilan sign up qiling
3. Dashboard ga kiring

### 2. Git Repository Bog'lash

#### Avtomatik Deploy (Tavsiya etiladi):
1. Netlify Dashboard da "New site from Git" tugmasini bosing
2. GitHub repository ni tanlang
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `18`

#### Manual Deploy:
```bash
# Build yaratish
npm run build

# Netlify CLI orqali deploy
npm run netlify:deploy
```

### 3. Environment Variables Sozlash

Netlify Dashboard da Site Settings > Environment Variables ga o'ting va quyidagilarni qo'shing:

```bash
# Firebase Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_production_project_id
VITE_DATABASE_ID=your_production_database_id

# Cloudinary Settings
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset

# Telegram Bot
VITE_TELEGRAM_BOT_TOKEN=your_bot_token
VITE_TELEGRAM_CHAT_ID=your_chat_id

# Google Analytics
VITE_GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX-X

# Build Settings
NODE_ENV=production
CI=false
```

### 4. Custom Domain Sozlash (Ixtiyoriy)

1. Netlify Dashboard da Domain Settings ga o'ting
2. "Add custom domain" tugmasini bosing
3. Domain name kiriting (masalan: zamonbooks.uz)
4. DNS settings ni yangilang:
   ```
   Type: CNAME
   Name: www
   Value: your-site-name.netlify.app
   
   Type: A
   Name: @
   Value: 75.2.60.5
   ```

### 5. SSL Certificate

Netlify avtomatik ravishda Let's Encrypt SSL certificate beradi. Faqat:
1. Domain Settings > HTTPS ga o'ting
2. "Verify DNS configuration" tugmasini bosing
3. SSL certificate avtomatik faollashadi

### 6. Build Optimization

`netlify.toml` faylida quyidagi optimizatsiyalar mavjud:
- SPA redirects
- Security headers
- Cache headers
- Asset optimization

### 7. Deployment Scripts

| Script | Tavsif |
|--------|--------|
| `npm run netlify:build` | Production build yaratish |
| `npm run netlify:deploy` | Production deploy |
| `npm run netlify:preview` | Preview deploy (test uchun) |
| `npm run dev:netlify` | Local development with Netlify |

## 🔧 Netlify CLI Sozlash

```bash
# Netlify CLI o'rnatish
npm install -g netlify-cli

# Login qilish
netlify login

# Loyihani bog'lash
netlify link

# Local development
netlify dev

# Preview deploy
netlify deploy

# Production deploy
netlify deploy --prod
```

## 📊 Monitoring va Analytics

### Netlify Analytics
1. Site Settings > Analytics ga o'ting
2. Netlify Analytics ni yoqing
3. Traffic, performance va error metrics ko'ring

### Google Analytics
- Index.html da Google Analytics kodi mavjud
- Environment variables da GA_MEASUREMENT_ID ni sozlang

## 🛠️ Troubleshooting

### Build Xatolari
```bash
# Dependencies ni tekshirish
npm install

# Local build test
npm run build

# Netlify logs ko'rish
netlify logs
```

### Environment Variables Xatolari
- Netlify Dashboard da barcha VITE_ prefiksi bilan boshlanadigan o'zgaruvchilar mavjudligini tekshiring
- Build logs da environment variables yuklanganligi ko'ring

### Redirect Xatolari
- `netlify.toml` da SPA redirects sozlanganligi tasdiqlang
- 404 sahifa uchun `/index.html` ga redirect mavjud

### Performance Issues
- Netlify Edge Locations avtomatik CDN beradi
- Asset compression avtomatik yoqilgan
- Cache headers optimallashtirilgan

## 🌐 Production URL

Deploy qilingandan keyin loyiha quyidagi URL da mavjud bo'ladi:
- **Netlify subdomain:** `https://your-site-name.netlify.app`
- **Custom domain:** `https://zamonbooks.uz` (agar sozlangan bo'lsa)

## 📞 Yordam

### Netlify Support
- [Netlify Docs](https://docs.netlify.com)
- [Community Forum](https://community.netlify.com)
- [Status Page](https://netlifystatus.com)

### Loyiha Support
- GitHub Issues
- Telegram: @zamonbooks
- Email: support@zamonbooks.uz

## 🚀 Deployment Checklist

- [ ] Repository GitHub ga push qilingan
- [ ] Netlify account yaratilgan
- [ ] Site Netlify ga bog'langan
- [ ] Environment variables sozlangan
- [ ] Build muvaffaqiyatli o'tgan
- [ ] Site ishlamoqda
- [ ] Custom domain sozlangan (agar kerak bo'lsa)
- [ ] SSL certificate faol
- [ ] Google Analytics ishlayapti
- [ ] Performance optimallashtirilgan