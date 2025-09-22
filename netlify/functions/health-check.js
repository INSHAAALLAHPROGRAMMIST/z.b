/**
 * Netlify Function: Health Check
 * Monitors application health and dependencies
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

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
  const startTime = Date.now();
  
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      checks: {}
    };

    // Check Firebase connection
    try {
      if (db) {
        // Simple read operation to test connection
        const testDoc = await db.collection('health').doc('test').get();
        healthStatus.checks.firebase = {
          status: 'healthy',
          responseTime: Date.now() - startTime
        };
      } else {
        throw new Error('Firebase not initialized');
      }
    } catch (error) {
      healthStatus.checks.firebase = {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
      healthStatus.status = 'degraded';
    }

    // Check Cloudinary connection
    try {
      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.VITE_CLOUDINARY_CLOUD_NAME}/resources/image`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(
              `${process.env.VITE_CLOUDINARY_API_KEY}:${process.env.VITE_CLOUDINARY_API_SECRET}`
            ).toString('base64')}`
          }
        }
      );

      if (cloudinaryResponse.ok) {
        healthStatus.checks.cloudinary = {
          status: 'healthy',
          responseTime: Date.now() - startTime
        };
      } else {
        throw new Error(`HTTP ${cloudinaryResponse.status}`);
      }
    } catch (error) {
      healthStatus.checks.cloudinary = {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
      healthStatus.status = 'degraded';
    }

    // Check Telegram Bot
    try {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${process.env.VITE_TELEGRAM_BOT_TOKEN}/getMe`
      );

      if (telegramResponse.ok) {
        healthStatus.checks.telegram = {
          status: 'healthy',
          responseTime: Date.now() - startTime
        };
      } else {
        throw new Error(`HTTP ${telegramResponse.status}`);
      }
    } catch (error) {
      healthStatus.checks.telegram = {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
      healthStatus.status = 'degraded';
    }

    // Overall response time
    healthStatus.totalResponseTime = Date.now() - startTime;

    // Determine HTTP status code
    let statusCode = 200;
    if (healthStatus.status === 'degraded') {
      statusCode = 207; // Multi-Status
    } else if (healthStatus.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    }

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify(healthStatus, null, 2)
    };

  } catch (error) {
    console.error('Health check error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: error.message,
        totalResponseTime: Date.now() - startTime
      }, null, 2)
    };
  }
};