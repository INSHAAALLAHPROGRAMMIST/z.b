import React from 'react';
import '../styles/responsive-images.css';

const BookCardSkeleton = () => {
    return (
        <div className="book-card glassmorphism-card" style={{
            animation: 'pulse 1.5s ease-in-out infinite alternate'
        }}>
            {/* Image skeleton */}
            <div style={{
                width: '100%',
                height: '250px',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                marginBottom: '15px',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s infinite'
            }} />
            
            {/* Title skeleton */}
            <div style={{
                height: '20px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                marginBottom: '8px',
                width: '80%',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s infinite'
            }} />
            
            {/* Author skeleton */}
            <div style={{
                height: '16px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                marginBottom: '8px',
                width: '60%',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s infinite'
            }} />
            
            {/* Genre skeleton */}
            <div style={{
                height: '14px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                marginBottom: '12px',
                width: '50%',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s infinite'
            }} />
            
            {/* Price skeleton */}
            <div style={{
                height: '18px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                marginBottom: '15px',
                width: '40%',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s infinite'
            }} />
            
            {/* Button skeleton */}
            <div style={{
                height: '40px',
                backgroundColor: '#f0f0f0',
                borderRadius: '8px',
                width: '100%',
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'loading 1.5s infinite'
            }} />
            

        </div>
    );
};

export default BookCardSkeleton;