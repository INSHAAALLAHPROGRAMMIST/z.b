// Book-specific SEO Component
// Har bir kitob sahifasi uchun SEO meta tags

import React from 'react';
import { Helmet } from 'react-helmet-async';

const BookSEO = ({ book, isLoading = false }) => {
  if (isLoading || !book) {
    return (
      <Helmet>
        <title>Yuklanmoqda... | Zamon Books</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    );
  }

  const {
    title,
    authorName,
    description,
    imageUrl,
    price,
    isAvailable,
    stock,
    publishedYear,
    genre,
    $id: bookId,
    slug
  } = book;

  // SEO optimized title
  const seoTitle = `${title}${authorName ? ` - ${authorName}` : ''} | Zamon Books`;
  
  // SEO optimized description
  const seoDescription = description 
    ? `${description.substring(0, 155)}...`
    : `${title} kitobi${authorName ? ` ${authorName} tomonidan` : ''}. Zamon Books'dan buyurtma bering.`;

  // Canonical URL
  const canonicalUrl = `${import.meta.env.VITE_SITE_URL || 'https://zamonbooks.netlify.app'}/book/${bookId}`;
  const slugUrl = slug ? `${import.meta.env.VITE_SITE_URL || 'https://zamonbooks.netlify.app'}/kitob/${slug}` : null;

  // Structured data for Google (faqat haqiqiy ma'lumotlar)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": title,
    "author": authorName ? {
      "@type": "Person",
      "name": authorName
    } : undefined,
    "description": description,
    "image": imageUrl,
    "isbn": bookId, // Using book ID as ISBN placeholder
    "genre": genre,
    "datePublished": publishedYear ? `${publishedYear}-01-01` : undefined,
    "publisher": {
      "@type": "Organization",
      "name": "Zamon Books"
    }
    // offers va aggregateRating olib tashlandi - haqiqiy ma'lumot yo'q
  };

  // Breadcrumb structured data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Bosh sahifa",
        "item": import.meta.env.VITE_SITE_URL || 'https://zamonbooks.netlify.app'
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Kitoblar",
        "item": `${import.meta.env.VITE_SITE_URL || 'https://zamonbooks.netlify.app'}/books`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": title,
        "item": canonicalUrl
      }
    ]
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={`${title}, ${authorName || ''}, kitob, o'zbek kitoblari, ${genre || ''}, adabiyot`} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Alternate URL for slug */}
      {slugUrl && <link rel="alternate" href={slugUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="book" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={imageUrl || '/default-book-image.jpg'} />
      <meta property="og:image:width" content="400" />
      <meta property="og:image:height" content="600" />
      <meta property="og:site_name" content="Zamon Books" />
      <meta property="og:locale" content="uz_UZ" />
      
      {/* Book-specific Open Graph */}
      {authorName && <meta property="book:author" content={authorName} />}
      {publishedYear && <meta property="book:release_date" content={`${publishedYear}-01-01`} />}
      {genre && <meta property="book:tag" content={genre} />}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={imageUrl || '/default-book-image.jpg'} />
      
      {/* Additional Meta Tags */}
      <meta name="author" content={authorName || 'Zamon Books'} />
      <meta name="publisher" content="Zamon Books" />
      {/* Narx va mavjudlik meta taglarini olib tashladik */}
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      
      {/* Breadcrumb Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbData)}
      </script>
      
      {/* Preload critical resources */}
      {imageUrl && (
        <link rel="preload" as="image" href={imageUrl} />
      )}
    </Helmet>
  );
};

export default BookSEO;