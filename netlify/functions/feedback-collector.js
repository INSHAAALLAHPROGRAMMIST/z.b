/**
 * Netlify Function: Feedback Collector
 * Collects user feedback and support requests
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export const handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { 
      type, 
      subject, 
      message, 
      email, 
      name, 
      rating, 
      category,
      userId,
      userAgent,
      url 
    } = JSON.parse(event.body);

    // Validate required fields
    if (!type || !message) {
      return {
        statusCode: 400,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          error: 'Type and message are required' 
        })
      };
    }

    // Get user location and context
    const { geo, ip } = context;
    
    const feedbackData = {
      // Core feedback data
      type, // 'feedback', 'bug', 'feature_request', 'support'
      subject: subject || '',
      message,
      category: category || 'general',
      rating: rating || null,
      
      // User information
      email: email || null,
      name: name || null,
      userId: userId || null,
      
      // Technical context
      userAgent: userAgent || event.headers['user-agent'] || '',
      url: url || event.headers.referer || '',
      ip: ip || 'unknown',
      
      // Location data
      country: geo?.country?.name || 'Unknown',
      countryCode: geo?.country?.code || 'XX',
      city: geo?.city || 'Unknown',
      
      // Metadata
      timestamp: new Date(),
      status: 'new',
      priority: determinePriority(type, message),
      source: 'website'
    };

    // Store feedback in Firestore
    const docRef = await addDoc(collection(db, 'feedback'), feedbackData);
    
    // Send notification for high priority feedback
    if (feedbackData.priority === 'high' || type === 'bug') {
      await sendFeedbackNotification(feedbackData, docRef.id);
    }
    
    // Send auto-response to user if email provided
    if (email) {
      await sendAutoResponse(email, name, type, docRef.id);
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Feedback received successfully',
        ticketId: docRef.id
      })
    };

  } catch (error) {
    console.error('Feedback collection error:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to process feedback',
        message: error.message
      })
    };
  }
};

/**
 * Determine feedback priority based on type and content
 */
function determinePriority(type, message) {
  const highPriorityKeywords = [
    'urgent', 'critical', 'broken', 'error', 'crash', 'bug',
    'payment', 'security', 'hack', 'fraud', 'urgent'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  
  if (type === 'bug' || highPriorityKeywords.some(keyword => 
    lowercaseMessage.includes(keyword))) {
    return 'high';
  }
  
  if (type === 'feature_request') {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Send feedback notification to admin
 */
async function sendFeedbackNotification(feedbackData, ticketId) {
  const telegramBotToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.VITE_TELEGRAM_CHAT_ID;
  
  if (!telegramBotToken || !telegramChatId) {
    console.warn('Telegram credentials not configured for feedback notifications');
    return;
  }
  
  const priorityEmoji = {
    high: '🚨',
    medium: '⚠️',
    low: 'ℹ️'
  };
  
  const typeEmoji = {
    feedback: '💬',
    bug: '🐛',
    feature_request: '💡',
    support: '🆘'
  };
  
  const message = 
    `${priorityEmoji[feedbackData.priority]} ${typeEmoji[feedbackData.type]} New ${feedbackData.type.replace('_', ' ')}\n\n` +
    `**Ticket ID**: ${ticketId}\n` +
    `**Priority**: ${feedbackData.priority.toUpperCase()}\n` +
    `**Category**: ${feedbackData.category}\n` +
    `**From**: ${feedbackData.name || 'Anonymous'} (${feedbackData.email || 'No email'})\n` +
    `**Country**: ${feedbackData.country}\n` +
    `**Subject**: ${feedbackData.subject || 'No subject'}\n\n` +
    `**Message**:\n${feedbackData.message}\n\n` +
    `**URL**: ${feedbackData.url}\n` +
    `**Time**: ${new Date().toLocaleString()}`;
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'Markdown'
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Failed to send feedback notification:', error);
  }
}

/**
 * Send auto-response email to user
 */
async function sendAutoResponse(email, name, type, ticketId) {
  // This would typically integrate with an email service
  // For now, we'll just log the auto-response
  
  const responses = {
    feedback: {
      subject: 'Fikr-mulohazangiz uchun rahmat - Zamon Books',
      message: `Hurmatli ${name || 'foydalanuvchi'},\n\nFikr-mulohazangiz uchun rahmat! Sizning fikringiz biz uchun juda muhim.\n\nTicket ID: ${ticketId}\n\nTez orada javob beramiz.\n\nHurmat bilan,\nZamon Books jamoasi`
    },
    bug: {
      subject: 'Xato haqida xabaringiz qabul qilindi - Zamon Books',
      message: `Hurmatli ${name || 'foydalanuvchi'},\n\nXato haqidagi xabaringiz qabul qilindi. Tezda hal qilamiz.\n\nTicket ID: ${ticketId}\n\nHurmat bilan,\nZamon Books jamoasi`
    },
    feature_request: {
      subject: 'Yangi funksiya taklifi qabul qilindi - Zamon Books',
      message: `Hurmatli ${name || 'foydalanuvchi'},\n\nYangi funksiya taklifingiz uchun rahmat! Ko'rib chiqamiz.\n\nTicket ID: ${ticketId}\n\nHurmat bilan,\nZamon Books jamoasi`
    },
    support: {
      subject: 'Yordam so\'rovingiz qabul qilindi - Zamon Books',
      message: `Hurmatli ${name || 'foydalanuvchi'},\n\nYordam so'rovingiz qabul qilindi. Tez orada javob beramiz.\n\nTicket ID: ${ticketId}\n\nHurmat bilan,\nZamon Books jamoasi`
    }
  };
  
  const response = responses[type] || responses.support;
  
  console.log('Auto-response email would be sent:', {
    to: email,
    subject: response.subject,
    message: response.message
  });
  
  // In production, integrate with email service like SendGrid, Mailgun, etc.
}