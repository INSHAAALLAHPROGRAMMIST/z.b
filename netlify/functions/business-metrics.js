/**
 * Netlify Function: Business Metrics Dashboard
 * Provides business intelligence and metrics API
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';

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
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { queryStringParameters } = event;
    const period = queryStringParameters?.period || '7d'; // 7d, 30d, 90d
    const metric = queryStringParameters?.metric || 'overview';
    
    // Basic authentication check (in production, use proper auth)
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    let metricsData;
    
    switch (metric) {
      case 'overview':
        metricsData = await getOverviewMetrics(period);
        break;
      case 'sales':
        metricsData = await getSalesMetrics(period);
        break;
      case 'users':
        metricsData = await getUserMetrics(period);
        break;
      case 'books':
        metricsData = await getBookMetrics(period);
        break;
      case 'geography':
        metricsData = await getGeographyMetrics(period);
        break;
      case 'performance':
        metricsData = await getPerformanceMetrics(period);
        break;
      default:
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Invalid metric type' })
        };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // 5 minutes cache
      },
      body: JSON.stringify({
        success: true,
        data: metricsData,
        period,
        generatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Business metrics error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch business metrics',
        message: error.message 
      })
    };
  }
};

/**
 * Get overview metrics
 */
async function getOverviewMetrics(period) {
  const days = getPeriodDays(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Get aggregated metrics for the period
  const metricsPromises = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    metricsPromises.push(
      getDoc(doc(db, 'metrics', dateStr)).then(doc => ({
        date: dateStr,
        data: doc.exists() ? doc.data() : {}
      }))
    );
  }
  
  const dailyMetrics = await Promise.all(metricsPromises);
  
  // Calculate totals
  const totals = {
    pageViews: 0,
    bookViews: 0,
    cartAdditions: 0,
    purchases: 0,
    revenue: 0,
    registrations: 0,
    searches: 0
  };
  
  dailyMetrics.forEach(day => {
    const data = day.data;
    totals.pageViews += data.pageViews || 0;
    totals.bookViews += data.bookViews || 0;
    totals.cartAdditions += data.cartAdditions || 0;
    totals.purchases += data.purchases || 0;
    totals.revenue += data.revenue || 0;
    totals.registrations += data.registrations || 0;
    totals.searches += data.searches || 0;
  });
  
  // Calculate conversion rates
  const conversionRate = totals.pageViews > 0 ? (totals.purchases / totals.pageViews * 100).toFixed(2) : 0;
  const cartConversionRate = totals.cartAdditions > 0 ? (totals.purchases / totals.cartAdditions * 100).toFixed(2) : 0;
  const averageOrderValue = totals.purchases > 0 ? (totals.revenue / totals.purchases).toFixed(0) : 0;
  
  return {
    period: `${days} days`,
    totals,
    metrics: {
      conversionRate: `${conversionRate}%`,
      cartConversionRate: `${cartConversionRate}%`,
      averageOrderValue: `${averageOrderValue} UZS`
    },
    dailyData: dailyMetrics.reverse() // Most recent first
  };
}

/**
 * Get sales metrics
 */
async function getSalesMetrics(period) {
  const days = getPeriodDays(period);
  
  // Get recent orders
  const ordersQuery = query(
    collection(db, 'orders'),
    where('createdAt', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  
  const ordersSnapshot = await getDocs(ordersQuery);
  const orders = ordersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Calculate sales metrics
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Group by status
  const ordersByStatus = orders.reduce((acc, order) => {
    const status = order.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  // Group by day
  const salesByDay = {};
  orders.forEach(order => {
    const date = new Date(order.createdAt.seconds * 1000).toISOString().split('T')[0];
    if (!salesByDay[date]) {
      salesByDay[date] = { orders: 0, revenue: 0 };
    }
    salesByDay[date].orders += 1;
    salesByDay[date].revenue += order.total || 0;
  });
  
  return {
    summary: {
      totalRevenue: totalRevenue.toLocaleString(),
      totalOrders,
      averageOrderValue: averageOrderValue.toFixed(0),
      period: `${days} days`
    },
    ordersByStatus,
    salesByDay,
    recentOrders: orders.slice(0, 10) // Last 10 orders
  };
}

/**
 * Get user metrics
 */
async function getUserMetrics(period) {
  const days = getPeriodDays(period);
  
  // Get recent users
  const usersQuery = query(
    collection(db, 'users'),
    where('createdAt', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  
  const usersSnapshot = await getDocs(usersQuery);
  const users = usersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Get analytics data for user behavior
  const analyticsQuery = query(
    collection(db, 'analytics'),
    where('timestamp', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
    where('eventType', '==', 'user_registration'),
    limit(100)
  );
  
  const analyticsSnapshot = await getDocs(analyticsQuery);
  const registrations = analyticsSnapshot.docs.map(doc => doc.data());
  
  // Group registrations by country
  const registrationsByCountry = registrations.reduce((acc, reg) => {
    const country = reg.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});
  
  return {
    summary: {
      totalUsers: users.length,
      newRegistrations: registrations.length,
      period: `${days} days`
    },
    registrationsByCountry,
    recentUsers: users.slice(0, 10)
  };
}

/**
 * Get book metrics
 */
async function getBookMetrics(period) {
  const days = getPeriodDays(period);
  
  // Get book view analytics
  const analyticsQuery = query(
    collection(db, 'analytics'),
    where('timestamp', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
    where('eventType', '==', 'book_view'),
    limit(1000)
  );
  
  const analyticsSnapshot = await getDocs(analyticsQuery);
  const bookViews = analyticsSnapshot.docs.map(doc => doc.data());
  
  // Group by book ID
  const viewsByBook = bookViews.reduce((acc, view) => {
    const bookId = view.eventData?.bookId;
    if (bookId) {
      acc[bookId] = (acc[bookId] || 0) + 1;
    }
    return acc;
  }, {});
  
  // Get top books
  const topBooks = Object.entries(viewsByBook)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([bookId, views]) => ({ bookId, views }));
  
  return {
    summary: {
      totalBookViews: bookViews.length,
      uniqueBooks: Object.keys(viewsByBook).length,
      period: `${days} days`
    },
    topBooks,
    viewsByBook
  };
}

/**
 * Get geography metrics
 */
async function getGeographyMetrics(period) {
  const days = getPeriodDays(period);
  
  // Get analytics data with location
  const analyticsQuery = query(
    collection(db, 'analytics'),
    where('timestamp', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
    limit(1000)
  );
  
  const analyticsSnapshot = await getDocs(analyticsQuery);
  const analytics = analyticsSnapshot.docs.map(doc => doc.data());
  
  // Group by country
  const byCountry = analytics.reduce((acc, event) => {
    const country = event.country || 'Unknown';
    const countryCode = event.countryCode || 'XX';
    
    if (!acc[countryCode]) {
      acc[countryCode] = {
        country,
        countryCode,
        events: 0,
        users: new Set()
      };
    }
    
    acc[countryCode].events += 1;
    if (event.userId) {
      acc[countryCode].users.add(event.userId);
    }
    
    return acc;
  }, {});
  
  // Convert to array and add user counts
  const countryData = Object.values(byCountry).map(country => ({
    ...country,
    users: country.users.size
  })).sort((a, b) => b.events - a.events);
  
  return {
    summary: {
      totalCountries: countryData.length,
      totalEvents: analytics.length,
      period: `${days} days`
    },
    countries: countryData
  };
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(period) {
  // This would typically come from performance monitoring tools
  // For now, return mock data structure
  return {
    summary: {
      averageLoadTime: '1.2s',
      bounceRate: '25%',
      pageViews: '10,234',
      period: `${getPeriodDays(period)} days`
    },
    coreWebVitals: {
      lcp: '1.8s', // Largest Contentful Paint
      fid: '45ms', // First Input Delay
      cls: '0.08'  // Cumulative Layout Shift
    },
    topPages: [
      { page: '/', views: 5234, avgLoadTime: '1.1s' },
      { page: '/books', views: 2341, avgLoadTime: '1.3s' },
      { page: '/cart', views: 1234, avgLoadTime: '0.9s' }
    ]
  };
}

/**
 * Convert period string to number of days
 */
function getPeriodDays(period) {
  switch (period) {
    case '1d': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 7;
  }
}