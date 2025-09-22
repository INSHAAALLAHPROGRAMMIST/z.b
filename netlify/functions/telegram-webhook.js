/**
 * Telegram Webhook Handler for Production
 * Handles incoming Telegram bot updates
 */

import { getTelegramConfig, validateTelegramConfig } from '../../config/telegram.production.js';

const config = getTelegramConfig('production');

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Validate configuration
    validateTelegramConfig(config);

    // Verify webhook secret
    const secretToken = event.headers['x-telegram-bot-api-secret-token'];
    if (secretToken !== config.webhook.secretToken) {
      console.error('Invalid webhook secret token');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Parse webhook payload
    const update = JSON.parse(event.body);
    console.log('Received Telegram update:', update);

    // Process different types of updates
    let response = { ok: true };

    if (update.message) {
      response = await handleMessage(update.message);
    } else if (update.callback_query) {
      response = await handleCallbackQuery(update.callback_query);
    } else if (update.inline_query) {
      response = await handleInlineQuery(update.inline_query);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Telegram webhook error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

// Handle incoming messages
async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from.id;

  console.log(`Message from ${userId}: ${text}`);

  // Handle commands
  if (text?.startsWith('/')) {
    return await handleCommand(chatId, text, userId);
  }

  // Handle regular messages
  return await handleTextMessage(chatId, text, userId);
}

// Handle bot commands
async function handleCommand(chatId, command, userId) {
  const cmd = command.split(' ')[0].toLowerCase();

  switch (cmd) {
    case '/start':
      return await sendMessage(chatId, `
🎉 *Zamon Books botiga xush kelibsiz!*

Bu bot orqali siz:
📚 Buyurtmalaringizni kuzatishingiz
📋 Kitoblar haqida ma'lumot olishingiz
💬 Qo'llab-quvvatlash xizmatiga murojaat qilishingiz mumkin

Yordam uchun /help buyrug'ini yuboring.
      `);

    case '/help':
      return await sendMessage(chatId, `
🆘 *Yordam*

Mavjud buyruqlar:
/start - Botni ishga tushirish
/help - Yordam olish
/orders - Buyurtmalarni ko'rish
/status - Buyurtma holatini tekshirish
/support - Qo'llab-quvvatlash

📞 Qo'shimcha yordam: ${config.chats.admin.chatId}
      `);

    case '/orders':
      return await handleOrdersCommand(chatId, userId);

    case '/status':
      return await handleStatusCommand(chatId, userId);

    case '/support':
      return await sendMessage(chatId, `
🆘 *Qo'llab-quvvatlash*

Yordam uchun quyidagi usullardan foydalaning:

📞 Telefon: +998 90 123 45 67
📧 Email: support@zamon-books.com
💬 Telegram: ${config.chats.admin.chatId}

Ish vaqti: 9:00 - 18:00 (Dushanba-Shanba)
      `);

    default:
      return await sendMessage(chatId, `
❓ Noma'lum buyruq: ${cmd}

Yordam uchun /help buyrug'ini yuboring.
      `);
  }
}

// Handle text messages
async function handleTextMessage(chatId, text, userId) {
  // Check if it's an order number
  if (text?.match(/^#?\d{6,}$/)) {
    return await handleOrderTracking(chatId, text.replace('#', ''), userId);
  }

  // Default response
  return await sendMessage(chatId, `
Sizning xabaringiz qabul qilindi: "${text}"

Buyurtma holatini tekshirish uchun buyurtma raqamini yuboring.
Yordam uchun /help buyrug'ini yuboring.
  `);
}

// Handle callback queries (inline keyboard buttons)
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const userId = callbackQuery.from.id;

  console.log(`Callback query from ${userId}: ${data}`);

  // Answer callback query
  await answerCallbackQuery(callbackQuery.id);

  // Process callback data
  if (data.startsWith('order_')) {
    const orderId = data.replace('order_', '');
    return await handleOrderDetails(chatId, orderId, userId);
  }

  return { ok: true };
}

// Handle inline queries
async function handleInlineQuery(inlineQuery) {
  const query = inlineQuery.query;
  const userId = inlineQuery.from.id;

  console.log(`Inline query from ${userId}: ${query}`);

  // For now, return empty results
  return await answerInlineQuery(inlineQuery.id, []);
}

// Send message to Telegram
async function sendMessage(chatId, text, options = {}) {
  const url = `${config.bot.apiUrl}${config.bot.token}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error('Telegram API error:', result);
    }

    return result;
  } catch (error) {
    console.error('Error sending message:', error);
    return { ok: false, error: error.message };
  }
}

// Answer callback query
async function answerCallbackQuery(callbackQueryId, text = '') {
  const url = `${config.bot.apiUrl}${config.bot.token}/answerCallbackQuery`;
  
  const payload = {
    callback_query_id: callbackQueryId,
    text: text
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error('Error answering callback query:', error);
    return { ok: false };
  }
}

// Answer inline query
async function answerInlineQuery(inlineQueryId, results) {
  const url = `${config.bot.apiUrl}${config.bot.token}/answerInlineQuery`;
  
  const payload = {
    inline_query_id: inlineQueryId,
    results: results
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();
  } catch (error) {
    console.error('Error answering inline query:', error);
    return { ok: false };
  }
}

// Handle orders command
async function handleOrdersCommand(chatId, userId) {
  // This would typically fetch orders from database
  // For now, return a placeholder message
  return await sendMessage(chatId, `
📦 *Sizning buyurtmalaringiz*

Buyurtmalarni ko'rish uchun tizimga kirish kerak.
Buyurtma holatini tekshirish uchun buyurtma raqamini yuboring.

Misol: #123456
  `);
}

// Handle status command
async function handleStatusCommand(chatId, userId) {
  return await sendMessage(chatId, `
📊 *Buyurtma holatini tekshirish*

Buyurtma holatini bilish uchun buyurtma raqamingizni yuboring.

Misol: #123456 yoki 123456
  `);
}

// Handle order tracking
async function handleOrderTracking(chatId, orderNumber, userId) {
  // This would typically fetch order from database
  // For now, return a placeholder message
  return await sendMessage(chatId, `
🔍 *Buyurtma #${orderNumber} qidirilmoqda...*

Afsuski, bu buyurtma topilmadi yoki sizga tegishli emas.

Buyurtma raqamini to'g'ri kiritganingizga ishonch hosil qiling.
Yordam uchun /support buyrug'ini yuboring.
  `);
}

// Handle order details
async function handleOrderDetails(chatId, orderId, userId) {
  // This would typically fetch order details from database
  return await sendMessage(chatId, `
📋 *Buyurtma tafsilotlari*

Buyurtma: #${orderId}
Holat: Tayyorlanmoqda
Yetkazib berish: 2-3 kun

Batafsil ma'lumot uchun saytga kiring.
  `);
}