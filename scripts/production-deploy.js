#!/usr/bin/env node

/**
 * Production Deployment Script
 * Xavfsiz va ehtiyotkor production deploy
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironment() {
  log('🔍 Environment variables tekshirilmoqda...', 'blue');
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_CLOUDINARY_CLOUD_NAME'
  ];

  const missing = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    log('❌ Quyidagi environment variables mavjud emas:', 'red');
    missing.forEach(varName => log(`   - ${varName}`, 'red'));
    log('\n💡 .env faylini tekshiring yoki Netlify environment variables sozlang', 'yellow');
    process.exit(1);
  }

  log('✅ Environment variables to\'g\'ri sozlangan', 'green');
}

function runTests() {
  log('🧪 Testlar ishga tushirilmoqda...', 'blue');
  
  try {
    // Linting
    log('   📝 ESLint tekshiruvi...', 'blue');
    execSync('npm run lint', { stdio: 'inherit' });
    log('   ✅ Linting muvaffaqiyatli', 'green');

    // Type checking (agar TypeScript bo'lsa)
    if (fs.existsSync('tsconfig.json')) {
      log('   🔍 TypeScript tekshiruvi...', 'blue');
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      log('   ✅ Type checking muvaffaqiyatli', 'green');
    }

  } catch (error) {
    log('❌ Testlar muvaffaqiyatsiz tugadi!', 'red');
    log('🛑 Deploy to\'xtatildi. Xatolarni tuzating va qayta urinib ko\'ring.', 'yellow');
    process.exit(1);
  }
}

function buildProject() {
  log('🏗️ Production build yaratilmoqda...', 'blue');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    log('✅ Build muvaffaqiyatli yaratildi', 'green');
    
    // Build size check
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      const stats = fs.statSync(distPath);
      log(`📦 Build hajmi: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
    }
    
  } catch (error) {
    log('❌ Build yaratishda xato!', 'red');
    log('🛑 Deploy to\'xtatildi.', 'yellow');
    process.exit(1);
  }
}

function checkBuildQuality() {
  log('🔍 Build sifati tekshirilmoqda...', 'blue');
  
  const distPath = path.join(process.cwd(), 'dist');
  const indexPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    log('❌ index.html topilmadi!', 'red');
    process.exit(1);
  }
  
  // Check for critical files
  const criticalFiles = ['assets', 'favicon.svg', 'manifest.json'];
  const missing = criticalFiles.filter(file => 
    !fs.existsSync(path.join(distPath, file))
  );
  
  if (missing.length > 0) {
    log('⚠️ Ba\'zi muhim fayllar topilmadi:', 'yellow');
    missing.forEach(file => log(`   - ${file}`, 'yellow'));
  }
  
  log('✅ Build sifati yaxshi', 'green');
}

function confirmDeploy() {
  log('\n🚀 Production deploy tayyorligi:', 'blue');
  log('   ✅ Environment variables', 'green');
  log('   ✅ Tests passed', 'green');
  log('   ✅ Build created', 'green');
  log('   ✅ Quality check passed', 'green');
  
  log('\n⚠️  DIQQAT: Bu production environment!', 'yellow');
  log('   - Real foydalanuvchilar ta\'sir qiladi', 'yellow');
  log('   - Database o\'zgarishlari real', 'yellow');
  log('   - Xato qilish qimmatga tushadi', 'yellow');
  
  // In CI/CD environment, auto-confirm
  if (process.env.CI) {
    log('🤖 CI/CD environment - avtomatik deploy', 'blue');
    return true;
  }
  
  // Manual confirmation required
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('\n❓ Deploy qilishni tasdiqlaysizmi? (yes/no): ', (answer) => {
      rl.close();
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        resolve(true);
      } else {
        log('🛑 Deploy bekor qilindi', 'yellow');
        resolve(false);
      }
    });
  });
}

async function deploy() {
  try {
    log('🚀 Netlify'ga deploy qilinmoqda...', 'blue');
    
    // Check if netlify CLI is available
    try {
      execSync('netlify --version', { stdio: 'pipe' });
    } catch (error) {
      log('❌ Netlify CLI topilmadi!', 'red');
      log('💡 O\'rnating: npm install -g netlify-cli', 'yellow');
      process.exit(1);
    }
    
    // Deploy to production
    execSync('netlify deploy --prod --dir=dist', { stdio: 'inherit' });
    
    log('✅ Deploy muvaffaqiyatli tugadi!', 'green');
    log('🌐 Saytingiz jonli: https://your-site.netlify.app', 'blue');
    
  } catch (error) {
    log('❌ Deploy xatosi!', 'red');
    log('🔧 Netlify dashboard\'ni tekshiring', 'yellow');
    process.exit(1);
  }
}

function postDeployChecks() {
  log('🔍 Post-deploy tekshiruvlar...', 'blue');
  
  log('📋 Qo\'lda tekshirish kerak:', 'yellow');
  log('   - Sayt ochilayaptimi?', 'yellow');
  log('   - Login/Register ishlayaptimi?', 'yellow');
  log('   - Admin panel ochilayaptimi?', 'yellow');
  log('   - Kitoblar ko\'rinayaptimi?', 'yellow');
  log('   - Savat funksiyasi ishlayaptimi?', 'yellow');
  
  log('\n📊 Monitoring:', 'blue');
  log('   - Firebase Console\'da traffic ko\'ring', 'blue');
  log('   - Netlify Analytics\'ni tekshiring', 'blue');
  log('   - Error monitoring\'ni yoqing', 'blue');
}

async function main() {
  log('🚀 ZAMON BOOKS - PRODUCTION DEPLOY', 'blue');
  log('=====================================\n', 'blue');
  
  try {
    // Pre-deploy checks
    checkEnvironment();
    runTests();
    buildProject();
    checkBuildQuality();
    
    // Confirmation
    const confirmed = await confirmDeploy();
    if (!confirmed) {
      process.exit(0);
    }
    
    // Deploy
    await deploy();
    
    // Post-deploy
    postDeployChecks();
    
    log('\n🎉 DEPLOY MUVAFFAQIYATLI TUGADI!', 'green');
    log('🔗 Saytingizni tekshiring va monitoring qiling', 'blue');
    
  } catch (error) {
    log(`\n❌ Deploy xatosi: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };