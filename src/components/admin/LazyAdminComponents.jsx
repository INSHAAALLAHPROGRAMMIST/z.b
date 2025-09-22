import React from 'react';
import { createLazyComponent } from '../../hooks/useLazyComponent';

// Admin Loading Fallback
const AdminLoader = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '20px'
    }}>
        <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(var(--primary-color-rgb, 79, 70, 229), 0.2)',
            borderTop: '3px solid var(--primary-color)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ 
            color: 'var(--light-text-color)',
            fontSize: '1.1rem',
            fontWeight: '500'
        }}>
            Admin panel yuklanmoqda...
        </p>
    </div>
);

// Lazy load admin components
export const LazyAdminBookManagement = createLazyComponent(
    () => import('../AdminBookManagement'),
    <AdminLoader />
);

export const LazyAdminDashboard = createLazyComponent(
    () => import('../AdminDashboard'),
    <AdminLoader />
);

export const LazyAdminOrderManagement = createLazyComponent(
    () => import('../AdminOrderManagement'),
    <AdminLoader />
);

export const LazyAdminUserManagement = createLazyComponent(
    () => import('../AdminUserManagement'),
    <AdminLoader />
);

export const LazyAdminAuthorManagement = createLazyComponent(
    () => import('../AdminAuthorManagement'),
    <AdminLoader />
);

export const LazyAdminGenreManagement = createLazyComponent(
    () => import('../AdminGenreManagement'),
    <AdminLoader />
);

export const LazyAdminSettings = createLazyComponent(
    () => import('../AdminSettings'),
    <AdminLoader />
);

export const LazyAdminInventoryManagement = createLazyComponent(
    () => import('../AdminInventoryManagement'),
    <AdminLoader />
);

export const LazyNotificationCenter = createLazyComponent(
    () => import('./NotificationCenter'),
    <AdminLoader />
);

// EnhancedMigrationPage is imported directly in App.jsx to avoid lazy loading issues