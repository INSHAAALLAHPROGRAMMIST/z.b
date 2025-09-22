/**
 * Netlify Edge Function: Geolocation
 * Provides location-based features and optimizations
 */

export default async (request, context) => {
  const { geo, ip } = context;
  
  try {
    // Get user's location information
    const locationData = {
      country: geo.country?.name || 'Unknown',
      countryCode: geo.country?.code || 'XX',
      city: geo.city || 'Unknown',
      region: geo.subdivision?.name || 'Unknown',
      timezone: geo.timezone || 'UTC',
      ip: ip,
      timestamp: new Date().toISOString()
    };

    // Location-based optimizations
    const optimizations = {
      currency: getCurrencyByCountry(locationData.countryCode),
      language: getLanguageByCountry(locationData.countryCode),
      cdnRegion: getCDNRegion(locationData.countryCode),
      shippingOptions: getShippingOptions(locationData.countryCode)
    };

    // Security checks
    const securityChecks = {
      isBlocked: isCountryBlocked(locationData.countryCode),
      riskLevel: calculateRiskLevel(locationData, request),
      requiresVerification: requiresAdditionalVerification(locationData)
    };

    const response = {
      location: locationData,
      optimizations,
      security: securityChecks,
      recommendations: generateRecommendations(locationData, optimizations)
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Geolocation edge function error:', error);
    
    return new Response(JSON.stringify({
      error: 'Geolocation service unavailable',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

function getCurrencyByCountry(countryCode) {
  const currencyMap = {
    'UZ': 'UZS', // Uzbekistan Som
    'US': 'USD',
    'GB': 'GBP',
    'EU': 'EUR',
    'RU': 'RUB',
    'KZ': 'KZT',
    'KG': 'KGS',
    'TJ': 'TJS'
  };
  
  return currencyMap[countryCode] || 'USD';
}

function getLanguageByCountry(countryCode) {
  const languageMap = {
    'UZ': 'uz', // Uzbek
    'RU': 'ru', // Russian
    'US': 'en',
    'GB': 'en'
  };
  
  return languageMap[countryCode] || 'uz'; // Default to Uzbek
}

function getCDNRegion(countryCode) {
  // Optimize CDN region based on location
  const regionMap = {
    'UZ': 'asia',
    'RU': 'europe',
    'KZ': 'asia',
    'KG': 'asia',
    'TJ': 'asia',
    'US': 'america',
    'GB': 'europe'
  };
  
  return regionMap[countryCode] || 'asia';
}

function getShippingOptions(countryCode) {
  // Define shipping options based on country
  const shippingMap = {
    'UZ': {
      available: true,
      methods: ['standard', 'express', 'pickup'],
      estimatedDays: '1-3',
      freeShippingThreshold: 100000 // 100,000 UZS
    },
    'RU': {
      available: true,
      methods: ['standard', 'express'],
      estimatedDays: '5-10',
      freeShippingThreshold: 3000 // 3,000 RUB
    },
    'KZ': {
      available: true,
      methods: ['standard'],
      estimatedDays: '7-14',
      freeShippingThreshold: 15000 // 15,000 KZT
    }
  };
  
  return shippingMap[countryCode] || {
    available: false,
    methods: [],
    estimatedDays: 'Contact for shipping',
    freeShippingThreshold: null
  };
}

function isCountryBlocked(countryCode) {
  // Define blocked countries (if any)
  const blockedCountries = []; // Add country codes if needed
  return blockedCountries.includes(countryCode);
}

function calculateRiskLevel(locationData, request) {
  let riskScore = 0;
  
  // Check for suspicious patterns
  const userAgent = request.headers.get('user-agent') || '';
  
  // Bot detection
  if (userAgent.toLowerCase().includes('bot') || 
      userAgent.toLowerCase().includes('crawler')) {
    riskScore += 2;
  }
  
  // Missing user agent
  if (!userAgent) {
    riskScore += 3;
  }
  
  // VPN/Proxy detection (basic)
  if (locationData.city === 'Unknown' && locationData.region === 'Unknown') {
    riskScore += 1;
  }
  
  // Determine risk level
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
}

function requiresAdditionalVerification(locationData) {
  // Countries that might require additional verification
  const highRiskCountries = []; // Add if needed
  return highRiskCountries.includes(locationData.countryCode);
}

function generateRecommendations(locationData, optimizations) {
  const recommendations = [];
  
  // Language recommendation
  if (optimizations.language !== 'uz') {
    recommendations.push({
      type: 'language',
      message: `Consider switching to ${optimizations.language} for better experience`,
      action: 'switch_language',
      value: optimizations.language
    });
  }
  
  // Currency recommendation
  if (optimizations.currency !== 'UZS') {
    recommendations.push({
      type: 'currency',
      message: `Prices can be displayed in ${optimizations.currency}`,
      action: 'switch_currency',
      value: optimizations.currency
    });
  }
  
  // Shipping recommendation
  if (optimizations.shippingOptions.available) {
    recommendations.push({
      type: 'shipping',
      message: `Shipping available to ${locationData.country}`,
      action: 'show_shipping_info',
      value: optimizations.shippingOptions
    });
  }
  
  return recommendations;
}

export const config = {
  path: "/api/location"
};