// Dynamic Robots.txt Generator
// SEO uchun robots.txt yaratadi

const SITE_URL = process.env.VITE_SITE_URL || 'https://your-domain.netlify.app';

exports.handler = async (event, context) => {
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400' // 1 kun cache
  };

  const robotsTxt = `# Robots.txt for Zamon Books
# Generated automatically

User-agent: *
Allow: /

# Allow important pages
Allow: /book/
Allow: /kitob/
Allow: /search
Allow: /authors
Allow: /genres

# Disallow admin and private areas
Disallow: /admin/
Disallow: /admin-*
Disallow: /api/
Disallow: /.netlify/
Disallow: /cart
Disallow: /profile
Disallow: /orders
Disallow: /auth

# Disallow search parameters
Disallow: /*?*
Disallow: /*#*

# Allow specific search patterns
Allow: /search?q=*

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Sitemap location
Sitemap: ${SITE_URL}/sitemap.xml

# Special rules for different bots
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 2

User-agent: Yandex
Allow: /
Crawl-delay: 2

User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

# Block bad bots
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: SemrushBot
Disallow: /

# Last updated: ${new Date().toISOString()}
`;

  return {
    statusCode: 200,
    headers,
    body: robotsTxt
  };
};