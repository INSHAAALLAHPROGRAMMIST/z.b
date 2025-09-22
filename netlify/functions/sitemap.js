// Dynamic Sitemap Generator
// SEO uchun avtomatik sitemap yaratadi

const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.VITE_FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

const SITE_URL = process.env.VITE_SITE_URL || 'https://your-domain.netlify.app';

export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' // 1 soat cache
  };

  try {
    const sitemap = await generateSitemap();
    
    return {
      statusCode: 200,
      headers,
      body: sitemap
    };
  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Sitemap generation failed'
    };
  }
};

async function generateSitemap() {
  try {
    // Parallel data fetching
    const [booksResponse, genresResponse] = await Promise.all([
      databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [
        Query.limit(1000), // Maksimal 1000 ta kitob
        Query.equal('visibility', 'visible'),
        Query.orderDesc('$updatedAt')
      ]),
      databases.listDocuments(DATABASE_ID, GENRES_COLLECTION_ID, [
        Query.limit(100),
        Query.orderAsc('name')
      ])
    ]);

    const books = booksResponse.documents;
    const genres = genresResponse.documents;

    // XML sitemap yaratish
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Static pages
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/search', priority: '0.8', changefreq: 'weekly' },
      { url: '/authors', priority: '0.7', changefreq: 'weekly' },
      { url: '/genres', priority: '0.7', changefreq: 'weekly' }
    ];

    staticPages.forEach(page => {
      sitemap += `
  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // Books pages
    books.forEach(book => {
      const lastmod = book.$updatedAt || book.$createdAt;
      const slug = book.slug || book.$id;
      
      sitemap += `
  <url>
    <loc>${SITE_URL}/book/${book.$id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>`;
      
      // Image sitemap
      if (book.imageUrl) {
        sitemap += `
    <image:image>
      <image:loc>${book.imageUrl}</image:loc>
      <image:title>${escapeXml(book.title)}</image:title>
      <image:caption>${escapeXml(book.description || book.title)}</image:caption>
    </image:image>`;
      }
      
      sitemap += `
  </url>`;

      // SEO-friendly slug URL
      if (book.slug && book.slug !== book.$id) {
        sitemap += `
  <url>
    <loc>${SITE_URL}/kitob/${book.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
      }
    });

    // Genre pages
    genres.forEach(genre => {
      sitemap += `
  <url>
    <loc>${SITE_URL}/genres/${genre.$id}</loc>
    <lastmod>${genre.$updatedAt || genre.$createdAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    return sitemap;
  } catch (error) {
    console.error('Sitemap data fetching error:', error);
    throw error;
  }
}

// XML escape function
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}