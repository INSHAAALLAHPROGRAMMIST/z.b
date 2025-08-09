// Server-Side Rendering Function for Netlify
// SEO va performance uchun HTML server'da generate qiladi

const React = require('react');
const { renderToString } = require('react-dom/server');
const { StaticRouter } = require('react-router-dom/server');
const { Client, Databases, Query } = require('appwrite');

// Appwrite client setup
const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_SERVER_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = process.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const GENRES_COLLECTION_ID = process.env.VITE_APPWRITE_COLLECTION_GENRES_ID;

exports.handler = async (event, context) => {
  const { path: requestPath } = event;
  
  // CORS headers
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    // Route-specific data fetching
    const initialData = await getInitialData(requestPath);
    const metaTags = generateMetaTags(requestPath, initialData);
    const criticalCSS = getCriticalCSS(requestPath);
    
    // Generate full HTML
    const html = generateHTML({
      path: requestPath,
      initialData,
      metaTags,
      criticalCSS
    });

    return {
      statusCode: 200,
      headers,
      body: html
    };

  } catch (error) {
    console.error('SSR Error:', error);
    
    // Fallback to client-side rendering
    return {
      statusCode: 200,
      headers,
      body: getFallbackHTML(requestPath)
    };
  }
};

// Route-specific data fetching
async function getInitialData(path) {
  try {
    if (path === '/' || path === '/home') {
      // Homepage data
      const [booksResponse, genresResponse] = await Promise.all([
        databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [
          Query.limit(12),
          Query.orderDesc('demandScore')
        ]),
        databases.listDocuments(DATABASE_ID, GENRES_COLLECTION_ID, [
          Query.limit(10),
          Query.orderAsc('name')
        ])
      ]);

      return {
        books: booksResponse.documents,
        genres: genresResponse.documents,
        totalBooks: booksResponse.total
      };
    }
    
    if (path.startsWith('/book/') || path.startsWith('/kitob/')) {
      // Book detail page
      const bookId = path.split('/')[2];
      
      try {
        const book = await databases.getDocument(
          DATABASE_ID,
          BOOKS_COLLECTION_ID,
          bookId
        );
        
        return { book };
      } catch (error) {
        // Try to find by slug if ID fails
        if (path.startsWith('/kitob/')) {
          const slug = path.split('/')[2];
          const response = await databases.listDocuments(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            [Query.equal('slug', slug), Query.limit(1)]
          );
          
          if (response.documents.length > 0) {
            return { book: response.documents[0] };
          }
        }
        throw error;
      }
    }
    
    if (path.startsWith('/search')) {
      // Search page
      const urlParams = new URLSearchParams(path.split('?')[1] || '');
      const query = urlParams.get('q');
      
      if (query && query.trim()) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          BOOKS_COLLECTION_ID,
          [
            Query.search('title', query.trim()),
            Query.limit(20)
          ]
        );
        
        return {
          searchResults: response.documents,
          searchQuery: query,
          totalResults: response.total
        };
      }
    }
    
    return {};
  } catch (error) {
    console.error('Data fetching error:', error);
    return {};
  }
}

// Generate meta tags based on route and data
function generateMetaTags(path, data) {
  const baseTitle = 'Zamon Books - Zamonaviy Kitoblar Do\'koni';
  const baseDescription = 'O\'zbekistondagi eng yaxshi kitoblar do\'koni. Zamonaviy va klassik kitoblar, tez yetkazib berish.';
  const baseImage = 'https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg';
  const baseUrl = 'https://your-domain.netlify.app';

  let title = baseTitle;
  let description = baseDescription;
  let image = baseImage;
  let url = baseUrl + path;
  let type = 'website';

  if (path === '/' || path === '/home') {
    title = `${baseTitle} - ${data.totalBooks || 0}+ Kitob`;
    description = `Zamonaviy va klassik kitoblar. ${data.totalBooks || 0}+ kitob, tez yetkazib berish, qulay narxlar.`;
  }
  
  else if (data.book) {
    const book = data.book;
    title = `${book.title} - ${book.authorName || 'Noma\'lum muallif'} | Zamon Books`;
    description = book.description 
      ? `${book.description.substring(0, 160)}...`
      : `${book.title} kitobi ${book.authorName ? `${book.authorName} tomonidan` : ''}. Zamon Books'dan buyurtma bering.`;
    image = book.imageUrl || baseImage;
    type = 'article';
    
    // Structured data for books
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Book",
      "name": book.title,
      "author": book.authorName ? {
        "@type": "Person",
        "name": book.authorName
      } : undefined,
      "description": book.description,
      "image": book.imageUrl,
      "offers": {
        "@type": "Offer",
        "price": book.price,
        "priceCurrency": "UZS",
        "availability": book.isAvailable ? "InStock" : "OutOfStock"
      }
    };
  }
  
  else if (data.searchResults) {
    title = `"${data.searchQuery}" qidiruv natijalari | Zamon Books`;
    description = `"${data.searchQuery}" bo'yicha ${data.totalResults || 0} ta kitob topildi. Zamon Books'da qidiring va buyurtma bering.`;
  }

  return {
    title,
    description,
    image,
    url,
    type,
    structuredData: data.book ? JSON.stringify(structuredData) : null
  };
}

// Get critical CSS for specific routes
function getCriticalCSS(path) {
  const baseCritical = `
    /* Critical CSS - Above the fold */
    :root {
      --primary-color: #6366f1;
      --accent-color: #34d399;
      --text-color: #f3f4f6;
      --glass-bg-light: rgba(255, 255, 255, 0.1);
    }
    
    body {
      font-family: 'Poppins', sans-serif;
      background: linear-gradient(145deg, #0f172a, #1e293b);
      color: var(--text-color);
      margin: 0;
      padding: 0;
    }
    
    .glassmorphism-header {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 30px;
    }
  `;

  if (path === '/' || path === '/home') {
    return baseCritical + `
      .hero-section {
        padding: 60px 0;
        text-align: center;
      }
      
      .books-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 24px;
      }
      
      .book-card {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 16px;
        backdrop-filter: blur(10px);
      }
    `;
  }
  
  if (path.startsWith('/book/') || path.startsWith('/kitob/')) {
    return baseCritical + `
      .book-detail-container {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 40px;
        padding: 40px 0;
      }
      
      .book-image {
        width: 100%;
        max-width: 400px;
        border-radius: 12px;
      }
      
      .book-info {
        padding: 20px;
      }
    `;
  }

  return baseCritical;
}

// Generate complete HTML
function generateHTML({ path, initialData, metaTags, criticalCSS }) {
  return `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${metaTags.title}</title>
  <meta name="title" content="${metaTags.title}">
  <meta name="description" content="${metaTags.description}">
  <meta name="keywords" content="kitob, o'zbek kitoblari, zamonaviy kitoblar, adabiyot, roman, she'r">
  <meta name="author" content="Zamon Books">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${metaTags.url}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${metaTags.type}">
  <meta property="og:url" content="${metaTags.url}">
  <meta property="og:title" content="${metaTags.title}">
  <meta property="og:description" content="${metaTags.description}">
  <meta property="og:image" content="${metaTags.image}">
  <meta property="og:site_name" content="Zamon Books">
  <meta property="og:locale" content="uz_UZ">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${metaTags.url}">
  <meta property="twitter:title" content="${metaTags.title}">
  <meta property="twitter:description" content="${metaTags.description}">
  <meta property="twitter:image" content="${metaTags.image}">
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  
  <!-- Preload Critical Resources -->
  <link rel="preload" href="/assets/fonts/poppins.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preconnect" href="https://res.cloudinary.com">
  <link rel="preconnect" href="https://cloud.appwrite.io">
  
  <!-- Critical CSS -->
  <style>${criticalCSS}</style>
  
  <!-- Structured Data -->
  ${metaTags.structuredData ? `<script type="application/ld+json">${metaTags.structuredData}</script>` : ''}
  
  <!-- FontAwesome -->
  <link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
</head>
<body>
  <!-- SSR Content -->
  <div id="root">
    ${generateSSRContent(path, initialData)}
  </div>
  
  <!-- Initial Data for Hydration -->
  <script>
    window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
    window.__INITIAL_PATH__ = ${JSON.stringify(path)};
  </script>
  
  <!-- Main App Bundle -->
  <script src="/assets/js/main.js" defer></script>
  
  <!-- Non-critical CSS -->
  <link rel="stylesheet" href="/assets/css/main.css">
  
  <!-- Analytics -->
  ${process.env.VITE_GOOGLE_ANALYTICS_ID ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${process.env.VITE_GOOGLE_ANALYTICS_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.VITE_GOOGLE_ANALYTICS_ID}');
  </script>
  ` : ''}
</body>
</html>
  `.trim();
}

// Generate SSR content based on route
function generateSSRContent(path, data) {
  if (path === '/' || path === '/home') {
    return `
      <header class="glassmorphism-header">
        <div class="container">
          <h1>Zamon Books</h1>
          <nav>
            <a href="/">Bosh sahifa</a>
            <a href="/search">Qidiruv</a>
          </nav>
        </div>
      </header>
      
      <main>
        <section class="hero-section">
          <div class="container">
            <h1>Zamonaviy Kitoblar Dunyosi</h1>
            <p>${data.totalBooks || 0}+ kitob mavjud</p>
          </div>
        </section>
        
        <section class="books-section">
          <div class="container">
            <div class="books-grid">
              ${data.books ? data.books.slice(0, 6).map(book => `
                <div class="book-card">
                  <img src="${book.imageUrl || '/placeholder.jpg'}" alt="${book.title}" loading="eager">
                  <h3>${book.title}</h3>
                  <p>${book.authorName || ''}</p>
                  <span>${book.price ? book.price.toLocaleString() + ' so\'m' : ''}</span>
                </div>
              `).join('') : ''}
            </div>
          </div>
        </section>
      </main>
    `;
  }
  
  if (data.book) {
    const book = data.book;
    return `
      <header class="glassmorphism-header">
        <div class="container">
          <h1>Zamon Books</h1>
        </div>
      </header>
      
      <main>
        <div class="container">
          <div class="book-detail-container">
            <div class="book-image-section">
              <img src="${book.imageUrl || '/placeholder.jpg'}" alt="${book.title}" class="book-image" loading="eager">
            </div>
            <div class="book-info">
              <h1>${book.title}</h1>
              ${book.authorName ? `<p class="author">Muallif: ${book.authorName}</p>` : ''}
              ${book.description ? `<div class="description">${book.description}</div>` : ''}
              ${book.price ? `<div class="price">${book.price.toLocaleString()} so'm</div>` : ''}
              <button class="add-to-cart-btn">Savatga qo'shish</button>
            </div>
          </div>
        </div>
      </main>
    `;
  }
  
  // Default fallback
  return `
    <header class="glassmorphism-header">
      <div class="container">
        <h1>Zamon Books</h1>
      </div>
    </header>
    <main>
      <div class="container">
        <div id="app-loading">Yuklanmoqda...</div>
      </div>
    </main>
  `;
}

// Fallback HTML for errors
function getFallbackHTML(path) {
  return `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zamon Books - Zamonaviy Kitoblar Do'koni</title>
  <meta name="description" content="O'zbekistondagi eng yaxshi kitoblar do'koni">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
  <div id="root">
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
      <div style="text-align: center;">
        <h1>Zamon Books</h1>
        <p>Sahifa yuklanmoqda...</p>
      </div>
    </div>
  </div>
  <script src="/assets/js/main.js"></script>
</body>
</html>
  `;
}