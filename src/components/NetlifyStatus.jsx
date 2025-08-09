// Netlify Functions Status Component
// Bu component foydalanuvchilarga ko'rinmaydi, faqat development uchun

import React, { useState, useEffect } from 'react';
import { healthApi } from '../utils/netlifyApi';

const NetlifyStatus = () => {
  const [status, setStatus] = useState({
    loading: true,
    available: false,
    error: null,
    info: null
  });

  useEffect(() => {
    checkNetlifyStatus();
  }, []);

  const checkNetlifyStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));
      
      const response = await healthApi.check();
      
      setStatus({
        loading: false,
        available: true,
        error: null,
        info: response
      });
      
    } catch (error) {
      setStatus({
        loading: false,
        available: false,
        error: error.message,
        info: null
      });
    }
  };

  // Faqat development mode'da ko'rsatish
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: status.available ? '#10b981' : '#ef4444',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      {status.loading ? (
        '⏳ Checking Netlify Functions...'
      ) : status.available ? (
        '✅ Netlify Functions Active'
      ) : (
        '❌ Netlify Functions Offline'
      )}
      
      {status.error && (
        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
          {status.error}
        </div>
      )}
      
      <button
        onClick={checkNetlifyStatus}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '10px',
          marginLeft: '8px',
          textDecoration: 'underline'
        }}
      >
        Refresh
      </button>
    </div>
  );
};

export default NetlifyStatus;