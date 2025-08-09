// Google Indexing API for faster indexing
// Yangi kitoblar qo'shilganda avtomatik Google'ga yuborish

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url, type = 'URL_UPDATED' } = JSON.parse(event.body);
    
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL required' })
      };
    }

    // Google Indexing API'ga so'rov yuborish
    // Bu yerda Google Service Account kerak
    const indexingRequest = {
      url: url,
      type: type // URL_UPDATED yoki URL_DELETED
    };

    // Hozircha log qilamiz, keyinchalik Google API'ga ulaymiz
    console.log('Indexing request:', indexingRequest);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Indexing request submitted',
        url: url
      })
    };

  } catch (error) {
    console.error('Indexing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};