import React, { memo, useMemo, useEffect } from 'react';

const BookSEO = memo(({ book }) => {
    const seoData = useMemo(() => {
        if (!book) return null;
        
        const title = `"${book.title}" - ${book.author?.name || 'Noma\'lum muallif'} | Zamon Books'dan Sotib Oling`;
        const description = `${book.author?.name || 'Noma\'lum muallif'} "${book.title}" ${book.genres?.[0]?.name || 'kitob'}i onlayn sotib oling. Narx: ${book.price?.toLocaleString()} so'm. Tez yetkazib berish, arzon narxlar. Zamon Books'da.`;
        const keywords = `${book.title}, ${book.author?.name}, ${book.genres?.map(g => g.name).join(', ')}, o'zbek kitoblari, onlayn kitob do'koni, kitob sotib olish`;
        const canonicalUrl = `https://zamonbooks.uz/kitob/${book.slug}`;
        
        return { title, description, keywords, canonicalUrl };
    }, [book?.title, book?.author?.name, book?.price, book?.slug, book?.genres]);

    const structuredData = useMemo(() => {
        if (!book) return null;
        
        return {
            "@context": "https://schema.org",
            "@type": "Book",
            "name": book.title,
            "author": {
                "@type": "Person",
                "name": book.author?.name || 'Noma\'lum muallif'
            },
            "genre": book.genres?.map(g => g.name) || [],
            "inLanguage": "uz",
            "publisher": "Zamon Books",
            "image": book.imageUrl,
            "description": book.description || book.title,
            "offers": {
                "@type": "Offer",
                "price": book.price,
                "priceCurrency": "UZS",
                "availability": "https://schema.org/InStock",
                "url": `https://zamonbooks.uz/kitob/${book.slug}`,
                "seller": {
                    "@type": "Organization",
                    "name": "Zamon Books"
                }
            }
        };
    }, [book]);

    useEffect(() => {
        if (!seoData || !structuredData) return;

        // SEO data applied silently

        // Update document title
        document.title = seoData.title;
        
        // Update meta tags
        const updateMetaTag = (name, content, property = false) => {
            const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
            let meta = document.querySelector(selector);
            
            if (!meta) {
                meta = document.createElement('meta');
                if (property) {
                    meta.setAttribute('property', name);
                } else {
                    meta.setAttribute('name', name);
                }
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };
        
        // Update link tags
        const updateLinkTag = (rel, href) => {
            let link = document.querySelector(`link[rel="${rel}"]`);
            if (!link) {
                link = document.createElement('link');
                link.setAttribute('rel', rel);
                document.head.appendChild(link);
            }
            link.setAttribute('href', href);
        };

        // Basic meta tags
        updateMetaTag('description', seoData.description);
        updateMetaTag('keywords', seoData.keywords);
        updateLinkTag('canonical', seoData.canonicalUrl);
        
        // Open Graph
        updateMetaTag('og:title', seoData.title, true);
        updateMetaTag('og:description', seoData.description, true);
        updateMetaTag('og:image', book.imageUrl, true);
        updateMetaTag('og:url', seoData.canonicalUrl, true);
        updateMetaTag('og:type', 'product', true);
        
        // Twitter Card
        updateMetaTag('twitter:card', 'product');
        updateMetaTag('twitter:title', seoData.title);
        updateMetaTag('twitter:description', seoData.description);
        updateMetaTag('twitter:image', book.imageUrl);
        
        // JSON-LD Structured Data
        let script = document.querySelector('script[type="application/ld+json"]');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(structuredData);
        
    }, [seoData, structuredData, book.imageUrl]);

    if (!seoData || !structuredData) return null;

    return null; // This component only updates document head
});

export default BookSEO;