// Book-specific SEO Component
// Har bir kitob sahifasi uchun SEO meta tags

import React, { useEffect } from 'react';

const BookSEO = ({ book, isLoading = false }) => {
  useEffect(() => {
    if (isLoading || !book) {
      document.title = 'Yuklanmoqda... | Zamon Books';
      return;
    }

    const {
      title,
      authorName,
      description,
      imageUrl,
      $id: bookId,
      slug
    } = book;

    // SEO optimized title
    const seoTitle = `${title}${authorName ? ` - ${authorName}` : ''} | Zamon Books`;
    document.title = seoTitle;

    // SEO optimized description
    const seoDescription = description 
      ? `${description.substring(0, 155)}...`
      : `${title} kitobi${authorName ? ` ${authorName} tomonidan` : ''}. Zamon Books'dan buyurtma bering.`;

    // Update meta description
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.name = 'description';
      document.head.appendChild(descMeta);
    }
    descMeta.content = seoDescription;

    // Update Open Graph meta tags
    const ogTags = [
      { property: 'og:title', content: seoTitle },
      { property: 'og:description', content: seoDescription },
      { property: 'og:type', content: 'book' },
      { property: 'og:url', content: `https://www.zamonbooks.uz/book/${bookId}` },
      { property: 'og:image', content: imageUrl || '/default-book-image.jpg' }
    ];

    ogTags.forEach(({ property, content }) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    });

    // Add structured data
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
      "publisher": {
        "@type": "Organization",
        "name": "Zamon Books"
      }
    };

    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"][data-book-seo]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-book-seo', 'true');
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

  }, [book, isLoading]);

  return null; // This component doesn't render anything
};

export default BookSEO;