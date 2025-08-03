import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
    // Set proper document title and meta for SEO
    useEffect(() => {
        document.title = '404 - Sahifa topilmadi | Zamon Books';
        
        // Add meta description for 404 page
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', 'Kechirasiz, siz qidirayotgan sahifa topilmadi. Zamon Books bosh sahifasiga qaytishingiz mumkin.');
        }
        
        // Add canonical URL for 404
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = window.location.href;
        
        return () => {
            // Reset title when component unmounts
            document.title = 'Zamon Books – Oʻzbek Kitoblari Onlayn Doʻkoni';
        };
    }, []);

    return (
        <div className="not-found-page">
            <div className="not-found-hero">
                <div className="not-found-content">
                    <div className="not-found-icon">
                        <span className="error-code">404</span>
                    </div>

                    <h1 className="not-found-title">Sahifa topilmadi</h1>
                    <p className="not-found-subtitle">Kechirasiz, siz qidirayotgan sahifa mavjud emas</p>
                    <p className="not-found-description">
                        Bu sahifa o'chirilgan, ko'chirilgan yoki URL manzili noto'g'ri kiritilgan bo'lishi mumkin. 
                        Iltimos, URL ni tekshiring yoki quyidagi havolalardan foydalaning.
                    </p>

                    <div className="not-found-suggestions">
                        <h3>Sizni qiziqtirishi mumkin:</h3>
                        <div className="suggestion-links">
                            <Link to="/" className="suggestion-link">
                                <i className="fas fa-home"></i>
                                <span>Bosh sahifa</span>
                            </Link>
                            <Link to="/books" className="suggestion-link">
                                <i className="fas fa-book"></i>
                                <span>Barcha kitoblar</span>
                            </Link>
                            <Link to="/search" className="suggestion-link">
                                <i className="fas fa-search"></i>
                                <span>Qidiruv</span>
                            </Link>
                            <Link to="/cart" className="suggestion-link">
                                <i className="fas fa-shopping-cart"></i>
                                <span>Savat</span>
                            </Link>
                        </div>
                    </div>

                    <div className="not-found-actions">
                        <Link to="/" className="glassmorphism-button not-found-home-btn">
                            <i className="fas fa-arrow-left"></i>
                            Bosh sahifaga qaytish
                        </Link>
                        <button 
                            onClick={() => window.history.back()} 
                            className="glassmorphism-button not-found-back-btn"
                        >
                            <i className="fas fa-undo"></i>
                            Orqaga qaytish
                        </button>
                    </div>
                </div>

                <div className="not-found-animation">
                    <div className="floating-element element-1">
                        <i className="fas fa-question"></i>
                    </div>
                    <div className="floating-element element-2">
                        <i className="fas fa-exclamation"></i>
                    </div>
                    <div className="floating-element element-3">
                        <i className="fas fa-search"></i>
                    </div>
                    <div className="floating-element element-4">
                        <i className="fas fa-compass"></i>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;