import React, { memo, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Breadcrumb = memo(({ items }) => {
    if (!items || items.length === 0) return null;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url ? `https://zamonbooks.uz${item.url}` : undefined
        }))
    };

    useEffect(() => {
        // Add breadcrumb structured data
        let script = document.querySelector('script[data-breadcrumb="true"]');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            script.setAttribute('data-breadcrumb', 'true');
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(structuredData);
        
        return () => {
            // Cleanup on unmount
            const existingScript = document.querySelector('script[data-breadcrumb="true"]');
            if (existingScript) {
                existingScript.remove();
            }
        };
    }, [structuredData]);

    return (
        <nav aria-label="breadcrumb" className="breadcrumb" style={{
                padding: '10px 0',
                fontSize: '0.9rem',
                opacity: '0.8'
            }}>
                <ol style={{
                    display: 'flex',
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    gap: '8px',
                    alignItems: 'center'
                }}>
                    {items.map((item, index) => (
                        <li key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {index > 0 && (
                                <span style={{ opacity: '0.5' }}>›</span>
                            )}
                            {item.url ? (
                                <Link 
                                    to={item.url} 
                                    style={{
                                        color: 'var(--text-color)',
                                        textDecoration: 'none',
                                        opacity: '0.7',
                                        transition: 'opacity 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.target.style.opacity = '1'}
                                    onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                                >
                                    {item.name}
                                </Link>
                            ) : (
                                <span 
                                    aria-current="page"
                                    style={{
                                        color: 'var(--text-color)',
                                        fontWeight: '500'
                                    }}
                                >
                                    {item.name}
                                </span>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
    );
});

export default Breadcrumb;