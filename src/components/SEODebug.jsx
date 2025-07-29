import React, { useEffect, useState } from 'react';

const SEODebug = () => {
    const [seoInfo, setSeoInfo] = useState({});

    useEffect(() => {
        const updateSEOInfo = () => {
            const title = document.title;
            const description = document.querySelector('meta[name="description"]')?.content || 'Yo\'q';
            const ogTitle = document.querySelector('meta[property="og:title"]')?.content || 'Yo\'q';
            const ogDescription = document.querySelector('meta[property="og:description"]')?.content || 'Yo\'q';
            const canonical = document.querySelector('link[rel="canonical"]')?.href || 'Yo\'q';
            const structuredData = document.querySelector('script[type="application/ld+json"]')?.textContent || 'Yo\'q';

            setSeoInfo({
                title,
                description,
                ogTitle,
                ogDescription,
                canonical,
                structuredData: structuredData !== 'Yo\'q' ? JSON.parse(structuredData) : 'Yo\'q'
            });
        };

        // Initial check
        updateSEOInfo();

        // Check again after a delay to catch dynamic updates
        const timer = setTimeout(updateSEOInfo, 1000);

        return () => clearTimeout(timer);
    }, []);

    // Only show in development
    if (!import.meta.env.DEV) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            width: '300px',
            maxHeight: '400px',
            overflow: 'auto',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 9999,
            border: '1px solid #333'
        }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>🔍 SEO Debug</h3>
            
            <div style={{ marginBottom: '10px' }}>
                <strong>Title:</strong>
                <div style={{ background: '#222', padding: '5px', borderRadius: '3px', marginTop: '3px' }}>
                    {seoInfo.title || 'Yuklanmoqda...'}
                </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>Description:</strong>
                <div style={{ background: '#222', padding: '5px', borderRadius: '3px', marginTop: '3px' }}>
                    {seoInfo.description}
                </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>OG Title:</strong>
                <div style={{ background: '#222', padding: '5px', borderRadius: '3px', marginTop: '3px' }}>
                    {seoInfo.ogTitle}
                </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>Canonical:</strong>
                <div style={{ background: '#222', padding: '5px', borderRadius: '3px', marginTop: '3px', wordBreak: 'break-all' }}>
                    {seoInfo.canonical}
                </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>Structured Data:</strong>
                <div style={{ background: '#222', padding: '5px', borderRadius: '3px', marginTop: '3px', maxHeight: '100px', overflow: 'auto' }}>
                    {typeof seoInfo.structuredData === 'object' ? 
                        JSON.stringify(seoInfo.structuredData, null, 2) : 
                        seoInfo.structuredData
                    }
                </div>
            </div>
        </div>
    );
};

export default SEODebug;