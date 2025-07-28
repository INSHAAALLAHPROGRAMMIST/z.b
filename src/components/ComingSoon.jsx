import React from 'react';
import { Link } from 'react-router-dom';

const ComingSoon = ({
    title = "Tez Orada",
    subtitle = "Bu sahifa hozirda ishlab chiqilmoqda",
    description = "Biz sizga eng yaxshi tajribani taqdim etish uchun qattiq ishlayapmiz. Bu qism yaqin orada tayyor bo'ladi!",
    showHomeButton = true
}) => {
    return (
        <div className="coming-soon-page">
            <div className="coming-soon-hero">
                <div className="coming-soon-content">
                    <div className="coming-soon-icon">
                        <i className="fas fa-tools"></i>
                    </div>

                    <h1 className="coming-soon-title">{title}</h1>
                    <p className="coming-soon-subtitle">{subtitle}</p>
                    <p className="coming-soon-description">{description}</p>

                    <div className="coming-soon-features">
                        <div className="feature-item">
                            <i className="fas fa-rocket"></i>
                            <span>Zamonaviy dizayn</span>
                        </div>
                        <div className="feature-item">
                            <i className="fas fa-mobile-alt"></i>
                            <span>Mobil uchun optimallashtirilgan</span>
                        </div>
                        <div className="feature-item">
                            <i className="fas fa-bolt"></i>
                            <span>Tez va oson</span>
                        </div>
                    </div>

                    {showHomeButton && (
                        <div className="coming-soon-actions">
                            <Link to="/" className="glassmorphism-button coming-soon-home-btn">
                                <i className="fas fa-home"></i>
                                Bosh sahifaga qaytish
                            </Link>
                        </div>
                    )}
                </div>

                <div className="coming-soon-animation">
                    <div className="floating-element element-1">
                        <i className="fas fa-book"></i>
                    </div>
                    <div className="floating-element element-2">
                        <i className="fas fa-star"></i>
                    </div>
                    <div className="floating-element element-3">
                        <i className="fas fa-heart"></i>
                    </div>
                    <div className="floating-element element-4">
                        <i className="fas fa-lightbulb"></i>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComingSoon;