/**
 * Telegram Bot Production Configuration
 * Optimized settings for production notifications
 */

export const telegramProductionConfig = {
  // Bot configuration
  bot: {
    token: process.env.VITE_TELEGRAM_BOT_TOKEN,
    username: process.env.VITE_TELEGRAM_BOT_USERNAME || 'ZamonBooksBot',
    apiUrl: 'https://api.telegram.org/bot'
  },
  
  // Chat configurations
  chats: {
    // Admin notifications
    admin: {
      chatId: process.env.VITE_TELEGRAM_ADMIN_CHAT_ID,
      type: 'private', // or 'group', 'supergroup', 'channel'
      notifications: ['orders', 'errors', 'alerts', 'reports']
    },
    
    // Customer notifications
    customers: {
      // Individual customer chats will be stored in database
      defaultNotifications: ['order_confirmation', 'order_status', 'delivery_updates']
    },
    
    // System alerts channel
    alerts: {
      chatId: process.env.VITE_TELEGRAM_ALERTS_CHAT_ID,
      type: 'channel',
      notifications: ['system_errors', 'performance_alerts', 'security_alerts']
    },
    
    // Sales reports channel
    reports: {
      chatId: process.env.VITE_TELEGRAM_REPORTS_CHAT_ID,
      type: 'channel',
      notifications: ['daily_reports', 'weekly_reports', 'monthly_reports']
    }
  },
  
  // Message templates
  templates: {
    // Order notifications
    newOrder: {
      admin: `🆕 *Yangi buyurtma!*
      
📋 Buyurtma raqami: #{orderNumber}
👤 Mijoz: {customerName}
📞 Telefon: {customerPhone}
💰 Summa: {totalAmount} so'm
📚 Kitoblar: {itemCount} ta
📅 Vaqt: {orderDate}

🔗 [Buyurtmani ko'rish]({orderUrl})`,
      
      customer: `✅ *Buyurtmangiz qabul qilindi!*
      
📋 Buyurtma raqami: #{orderNumber}
💰 Summa: {totalAmount} so'm
📚 Kitoblar: {itemCount} ta
📅 Buyurtma vaqti: {orderDate}

📞 Aloqa: {supportContact}
🔗 [Buyurtmani kuzatish]({trackingUrl})`
    },
    
    orderStatus: {
      confirmed: `✅ *Buyurtmangiz tasdiqlandi*
      
📋 #{orderNumber}
📦 Buyurtmangiz tayyorlanmoqda
⏰ Taxminiy yetkazib berish: {estimatedDelivery}`,
      
      shipped: `🚚 *Buyurtmangiz jo'natildi*
      
📋 #{orderNumber}
📦 Kuzatuv raqami: {trackingNumber}
⏰ Yetkazib berish: {estimatedDelivery}`,
      
      delivered: `🎉 *Buyurtmangiz yetkazildi*
      
📋 #{orderNumber}
✅ Buyurtma muvaffaqiyatli yetkazildi
⭐ [Fikr bildiring]({reviewUrl})`
    },
    
    // System alerts
    lowStock: `⚠️ *Stok tugamoqda!*
    
📚 Kitob: {bookTitle}
📊 Qolgan: {stockCount} ta
🔄 Qayta to'ldirish kerak`,
    
    systemError: `🚨 *Tizim xatosi*
    
❌ Xato: {errorMessage}
📍 Joyi: {errorLocation}
⏰ Vaqt: {timestamp}
🔧 Holat: {status}`,
    
    dailyReport: `📊 *Kunlik hisobot*
    
📅 Sana: {date}
💰 Sotuv: {totalSales} so'm
📦 Buyurtmalar: {orderCount} ta
👥 Yangi mijozlar: {newCustomers} ta
📈 O'sish: {growthRate}%`
  },
  
  // Notification settings
  notifications: {
    // Rate limiting
    rateLimit: {
      maxPerMinute: 30,
      maxPerHour: 1000,
      maxPerDay: 10000
    },
    
    // Retry settings
    retry: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000 // ms
    },
    
    // Message formatting
    formatting: {
      parseMode: 'Markdown',
      disableWebPagePreview: false,
      disableNotification: false
    },
    
    // Priority levels
    priority: {
      high: ['system_errors', 'security_alerts', 'payment_failures'],
      medium: ['new_orders', 'low_stock', 'customer_issues'],
      low: ['daily_reports', 'marketing_updates']
    }
  },
  
  // Webhook configuration
  webhook: {
    url: process.env.VITE_TELEGRAM_WEBHOOK_URL,
    secretToken: process.env.VITE_TELEGRAM_WEBHOOK_SECRET,
    maxConnections: 40,
    allowedUpdates: ['message', 'callback_query', 'inline_query']
  },
  
  // Bot commands
  commands: [
    {
      command: 'start',
      description: 'Botni ishga tushirish'
    },
    {
      command: 'help',
      description: 'Yordam olish'
    },
    {
      command: 'orders',
      description: 'Buyurtmalarni ko\'rish'
    },
    {
      command: 'status',
      description: 'Buyurtma holatini tekshirish'
    },
    {
      command: 'support',
      description: 'Qo\'llab-quvvatlash'
    }
  ],
  
  // Security settings
  security: {
    // Allowed chat types
    allowedChatTypes: ['private', 'group', 'supergroup', 'channel'],
    
    // Admin verification
    adminVerification: true,
    adminUserIds: process.env.VITE_TELEGRAM_ADMIN_USER_IDS?.split(',') || [],
    
    // Message encryption (if needed)
    encryption: false,
    
    // Spam protection
    spamProtection: {
      enabled: true,
      maxMessagesPerMinute: 10,
      blockDuration: 300000 // 5 minutes
    }
  }
};

// Environment-specific overrides
export const getTelegramConfig = (environment = 'production') => {
  const baseConfig = { ...telegramProductionConfig };
  
  switch (environment) {
    case 'development':
      return {
        ...baseConfig,
        bot: {
          ...baseConfig.bot,
          username: 'ZamonBooksDevBot'
        },
        notifications: {
          ...baseConfig.notifications,
          rateLimit: {
            maxPerMinute: 10,
            maxPerHour: 100,
            maxPerDay: 1000
          }
        }
      };
      
    case 'staging':
      return {
        ...baseConfig,
        bot: {
          ...baseConfig.bot,
          username: 'ZamonBooksStagingBot'
        }
      };
      
    default:
      return baseConfig;
  }
};

// Validation function
export const validateTelegramConfig = (config) => {
  const required = ['bot.token'];
  const missing = [];
  
  if (!config.bot?.token) {
    missing.push('bot.token');
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required Telegram configuration: ${missing.join(', ')}`);
  }
  
  return true;
};

// Message formatting utilities
export const formatMessage = (template, data) => {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] || match;
  });
};

export const escapeMarkdown = (text) => {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};