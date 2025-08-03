import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/variables.css'; // CSS o'zgaruvchilar
import './index.css'; // Global stillarimiz
import './styles/components/not-found.css'; // 404 sahifa stillari

import { BrowserRouter } from 'react-router-dom';
import { initImageProtection } from './utils/imageProtection.js';
import './styles/image-protection.css';

// Clear console in development for cleaner debugging
if (import.meta.env.DEV) {
    console.clear();
}

// Image Protection (Production only)
if (import.meta.env.PROD) {
    initImageProtection();
}

// Service Worker Registration for Performance
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            // Service Worker registered silently
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New Service Worker available - silent update
                    }
                });
            });
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
);