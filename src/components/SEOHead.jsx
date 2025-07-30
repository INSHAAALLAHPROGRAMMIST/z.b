import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOHead = ({
    title = "Zamon Books - O'zbek Kitoblar Onlayn Do'koni",
    description = "O'zbekistondagi eng yaxshi kitoblar onlayn do'koni. Zamonaviy va klassik asarlar, ilmiy kitoblar va boshqalar. Tez yetkazib berish va qulay narxlar.",
    keywords = "kitob, o'zbek kitoblari, onlayn kitob do'koni, adabiyot, roman, she'riyat, ilmiy kitoblar",
    image = "https://zamonbooks.uz/og-image.jpg",
    url = "https://zamonbooks.uz",
    type = "website",
    author = "Zamon Books",
    publishedTime,
    modifiedTime,
    section,
    tags = [],
    price,
    currency = "UZS",
    availability = "in stock"
}) => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": type === "book" ? "Book" : "WebSite",
        "name": title,
        "description": description,
        "url": url,
        "image": image,
        "author": {
            "@type": "Organization",
            "name": author
        },
        ...(type === "book" && price && {
            "offers": {
                "@type": "Offer",
                "price": price,
                "priceCurrency": currency,
                "availability": `https://schema.org/${availability.replace(' ', '')}`
            }
        }),
        ...(publishedTime && { "datePublished": publishedTime }),
        ...(modifiedTime && { "dateModified": modifiedTime })
    };

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <meta name="author" content={author} />
            <link rel="canonical" href={url} />

            {/* Open Graph Tags */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:url" content={url} />
            <meta property="og:site_name" content="Zamon Books" />
            <meta property="og:locale" content="uz_UZ" />
            
            {/* Twitter Card Tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
            <meta name="twitter:site" content="@zamonbooks" />

            {/* Article specific tags */}
            {publishedTime && <meta property="article:published_time" content={publishedTime} />}
            {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
            {section && <meta property="article:section" content={section} />}
            {tags.map(tag => (
                <meta key={tag} property="article:tag" content={tag} />
            ))}

            {/* Mobile and App Tags */}
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="Zamon Books" />
            <meta name="theme-color" content="#6a8aff" />

            {/* Favicon and Icons */}
            <link rel="icon" type="image/x-icon" href="/favicon.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />

            {/* Manifest */}
            <link rel="manifest" href="/manifest.json" />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(structuredData)}
            </script>

            {/* Performance hints */}
            <link rel="dns-prefetch" href="//res.cloudinary.com" />
            <link rel="preconnect" href="https://res.cloudinary.com" />
            <link rel="preconnect" href="https://fra.cloud.appwrite.io" />

            {/* Language */}
            <html lang="uz" />
        </Helmet>
    );
};

export default SEOHead;