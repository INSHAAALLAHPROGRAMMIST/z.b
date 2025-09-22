import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOHead = ({
  title = 'Zamon Books - Zamonaviy Kitoblar Do\'koni',
  description = 'O\'zbekistondagi eng yaxshi kitoblar do\'koni. Zamonaviy va klassik asarlar, professional xizmat, tez yetkazib berish.',
  keywords = 'kitob, o\'zbek kitoblari, zamonaviy kitoblar, kitob do\'koni, online kitob, uzbek books',
  image = 'https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/zamon-books-og-image.jpg',
  url = 'https://zamonbooks.uz',
  type = 'website',
  author = 'Zamon Books',
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  price,
  currency = 'UZS',
  availability = 'in stock'
}) => {
  const fullTitle = title.includes('Zamon Books') ? title : `${title} | Zamon Books`;
  const canonicalUrl = url.endsWith('/') ? url.slice(0, -1) : url;

  // Structured data for books
  const bookStructuredData = type === 'book' ? {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": title,
    "description": description,
    "image": image,
    "author": {
      "@type": "Person",
      "name": author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Zamon Books"
    },
    "offers": price ? {
      "@type": "Offer",
      "price": price,
      "priceCurrency": currency,
      "availability": `https://schema.org/${availability.replace(' ', '')}`
    } : undefined
  } : null;

  // Structured data for website
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Zamon Books",
    "description": "O'zbekistondagi zamonaviy kitoblar do'koni",
    "url": "https://zamonbooks.uz",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://zamonbooks.uz/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  // Organization structured data
  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Zamon Books",
    "description": "Zamonaviy kitoblar do'koni",
    "url": "https://zamonbooks.uz",
    "logo": "https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+998-90-123-45-67",
      "contactType": "customer service",
      "availableLanguage": ["uz", "ru"]
    },
    "sameAs": [
      "https://t.me/ZAMON_BOOKS",
      "https://www.instagram.com/zamon_books/"
    ]
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Zamon Books" />
      <meta property="og:locale" content="uz_UZ" />
      <meta property="og:locale:alternate" content="ru_RU" />
      
      {/* Article specific */}
      {type === 'article' && (
        <>
          {publishedTime && <meta property="article:published_time" content={publishedTime} />}
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {section && <meta property="article:section" content={section} />}
          {tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@zamon_books" />
      <meta name="twitter:creator" content="@zamon_books" />

      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Language and Region */}
      <meta httpEquiv="content-language" content="uz" />
      <meta name="geo.region" content="UZ" />
      <meta name="geo.country" content="Uzbekistan" />
      
      {/* Mobile Optimization */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* Theme Color */}
      <meta name="theme-color" content="#6366f1" />
      <meta name="msapplication-TileColor" content="#6366f1" />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="preconnect" href="https://cloud.appwrite.io" />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(websiteStructuredData)}
      </script>
      
      <script type="application/ld+json">
        {JSON.stringify(organizationStructuredData)}
      </script>
      
      {bookStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(bookStructuredData)}
        </script>
      )}

      {/* Alternate Languages */}
      <link rel="alternate" hrefLang="uz" href={canonicalUrl} />
      <link rel="alternate" hrefLang="ru" href={`${canonicalUrl}?lang=ru`} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* RSS Feed */}
      <link rel="alternate" type="application/rss+xml" title="Zamon Books - Yangiliklar" href="/rss.xml" />

      {/* Favicon */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
    </Helmet>
  );
};

export default SEOHead;