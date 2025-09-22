/**
 * Netlify Function: Analytics Tracker
 * Tracks business metrics and user analytics
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';

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
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  try {
    const { eventType, eventData, userId, sessionId } = JSON.parse(event.body);
    
    if (!eventType) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Event type is required' })
      };
    }

    // Get user location and device info
    const { geo, ip } = context;
    const userAgent = event.headers['user-agent'] || '';
    
    const analyticsData = {
      eventType,
      eventData: eventData || {},
      userId: userId || null,
      sessionId: sessionId || null,
      timestamp: new Date(),
      
      // Location data
      country: geo?.country?.name || 'Unknown',
      countryCode: geo?.country?.code || 'XX',
      city: geo?.city || 'Unknown',
      region: geo?.subdivision?.name || 'Unknown',
      timezone: geo?.timezone || 'UTC',
      
      // Device/Browser data
      userAgent,
      ip: ip || 'Unknown',
      
      // Referrer data
      referrer: event.headers.referer || event.headers.referrer || null,
      
      // Additional metadata
      metadata: {
        netlifyContext: context.clientContext || null,
        deployId: process.env.DEPLOY_ID || null,
        buildId: process.env.BUILD_ID || null
      }
    };

    // Store analytics data
    await addDoc(collection(db, 'analytics'), analyticsData);
    
    // Update aggregated metrics
    await updateAggregatedMetrics(eventType, eventData, analyticsData);
    
    // Send business alerts if needed
    await checkBusinessAlerts(eventType, eventData, analyticsData);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Analytics event tracked successfully'
      })
    };

  } catch (error) {
    console.error('Analytics tracking error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to track analytics event',
        message: error.message 
      })
    };
  }
};

/**
 * Update aggregated metrics for business intelligence
 */
async function updateAggregatedMetrics(eventType, eventData, analyticsData) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const metricsRef = doc(db, 'metrics', today);
    
    const updates = {
      [`events.${eventType}`]: increment(1),
      'totalEvents': increment(1),
      'lastUpdated': new Date()
    };
    
    // Specific metric updates based on event type
    switch (eventType) {
      case 'page_view':
        updates['pageViews'] = increment(1);
        if (eventData.page === '/') {
          updates['homepageViews'] = increment(1);
        }
        break;
        
      case 'book_view':
        updates['bookViews'] = increment(1);
        if (eventData.bookId) {
          updates[`bookViews.${eventData.bookId}`] = increment(1);
        }
        break;
        
      case 'add_to_cart':
        updates['cartAdditions'] = increment(1);
        if (eventData.value) {
          updates['cartValue'] = increment(eventData.value);
        }
        break;
        
      case 'purchase':
        updates['purchases'] = increment(1);
        updates['revenue'] = increment(eventData.value || 0);
        break;
        
      case 'search':
        updates['searches'] = increment(1);
        break;
        
      case 'user_registration':
        updates['registrations'] = increment(1);
        break;
    }
    
    // Country-specific metrics
    if (analyticsData.countryCode !== 'XX') {
      updates[`countries.${analyticsData.countryCode}`] = increment(1);
    }
    
    await updateDoc(metricsRef, updates);
    
  } catch (error) {
    console.error('Error updating aggregated metrics:', error);
  }
}

/**
 * Check for business alerts and send notifications
 */
async function checkBusinessAlerts(eventType, eventData, analyticsData) {
  try {
    // High-value purchase alert
    if (eventType === 'purchase' && eventData.value > 100000) { // 100,000 UZS
      await sendTelegramAlert(
        `💰 High-Value Purchase Alert\n\n` +
        `Amount: ${eventData.value.toLocaleString()} UZS\n` +
        `Country: ${analyticsData.country}\n` +
        `Time: ${new Date().toLocaleString()}`
      );
    }
    
    // New user from new country
    if (eventType === 'user_registration' && analyticsData.countryCode !== 'UZ') {
      await sendTelegramAlert(
        `🌍 New International User\n\n` +
        `Country: ${analyticsData.country}\n` +
        `City: ${analyticsData.city}\n` +
        `Time: ${new Date().toLocaleString()}`
      );
    }
    
    // Error tracking
    if (eventType === 'error' && eventData.severity === 'high') {
      await sendTelegramAlert(
        `🚨 High Severity Error\n\n` +
        `Error: ${eventData.message}\n` +
        `Page: ${eventData.page}\n` +
        `User: ${analyticsData.userId || 'Anonymous'}\n` +
        `Time: ${new Date().toLocaleString()}`
      );
    }
    
  } catch (error) {
    console.error('Error checking business alerts:', error);
  }
}

/**
 * Send Telegram alert
 */
async function sendTelegramAlert(message) {
  const telegramBotToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.VITE_TELEGRAM_CHAT_ID;
  
  if (!telegramBotToken || !telegramChatId) {
    console.warn('Telegram credentials not configured for alerts');
    return;
  }
  
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
          parse_mode: 'HTML'
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Failed to send Telegram alert:', error);
  }
}