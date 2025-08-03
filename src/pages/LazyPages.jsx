import React from 'react';
import { createLazyComponent } from '../hooks/useLazyComponent.jsx';

// Optimized Page Loading Fallback
const PageLoader = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh', // Reduced height
        flexDirection: 'column',
        gap: '15px' // Reduced gap
    }}>
        <div style={{
            width: '40px', // Smaller spinner
            height: '40px',
            border: '3px solid rgba(106, 138, 255, 0.2)',
            borderTop: '3px solid var(--primary-color)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite' // Faster spin
        }}></div>
        <p style={{ 
            color: 'var(--light-text-color)',
            fontSize: '1rem', // Smaller text
            fontWeight: '400',
            opacity: '0.8'
        }}>
            Yuklanmoqda...
        </p>
    </div>
);

// Lazy load pages
export const LazyHomePage = createLazyComponent(
    () => import('./HomePage'),
    <PageLoader />
);

export const LazySearchPage = createLazyComponent(
    () => import('../components/SearchPage'),
    <PageLoader />
);

export const LazyCartPage = createLazyComponent(
    () => import('../components/CartPage'),
    <PageLoader />
);

export const LazyBookDetailPage = createLazyComponent(
    () => import('../components/BookDetailPage'),
    <PageLoader />
);

export const LazyUserOrdersPage = createLazyComponent(
    () => import('../components/UserOrdersPage'),
    <PageLoader />
);

export const LazyProfilePage = createLazyComponent(
    () => import('../components/ProfilePage'),
    <PageLoader />
);

export const LazyAuthForm = createLazyComponent(
    () => import('../components/AuthForm'),
    <PageLoader />
);

export const LazyAdminLogin = createLazyComponent(
    () => import('../components/AdminLogin'),
    <PageLoader />
);

export const LazyComingSoon = createLazyComponent(
    () => import('../components/ComingSoon'),
    <PageLoader />
);

export const LazyNotFoundPage = createLazyComponent(
    () => import('../components/NotFoundPage'),
    <PageLoader />
);