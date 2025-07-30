import React, { useEffect, useState } from 'react';
import '../styles/ImageModal.css';

const ImageModal = ({ isOpen, onClose, imageSrc, imageAlt = '' }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [highResSrc, setHighResSrc] = useState('');
    const [imageAspectRatio, setImageAspectRatio] = useState(null);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    // Modal uchun ekran o'lchamiga mos rasm yaratish
    const generateHighResSrc = (originalSrc) => {
        if (!originalSrc || !originalSrc.includes('cloudinary')) {
            return originalSrc;
        }
        
        const parts = originalSrc.split('/upload/');
        if (parts.length !== 2) return originalSrc;
        
        // Ekran o'lchamiga mos optimal size
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isMobile = screenWidth <= 768;
        
        // Modal uchun optimal o'lcham (ekran o'lchamining 90%)
        const targetWidth = Math.floor(screenWidth * 0.9);
        const targetHeight = Math.floor(screenHeight * 0.9);
        
        // Kichikroq o'lchamni tanlaymiz (aspect ratio saqlanishi uchun)
        const optimalSize = Math.min(targetWidth, targetHeight, isMobile ? 800 : 1200);
        
        const transformations = `w_${optimalSize},c_fit,f_auto,q_95`;
        return `${parts[0]}/upload/${transformations}/${parts[1]}`;
    };

    useEffect(() => {
        if (isOpen && imageSrc) {
            setIsLoading(true);
            const highResSrc = generateHighResSrc(imageSrc);
            
            // High resolution rasmni preload qilish
            const img = new Image();
            img.onload = () => {
                // Aspect ratio va natural size'ni hisoblash
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                setImageAspectRatio(aspectRatio);
                setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                setHighResSrc(highResSrc);
                setIsLoading(false);
            };
            img.onerror = () => {
                setHighResSrc(imageSrc); // Fallback to original
                setIsLoading(false);
            };
            img.src = highResSrc;
        }
    }, [isOpen, imageSrc]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Mobile uchun viewport meta tag'ni o'zgartirish
            const viewport = document.querySelector('meta[name=viewport]');
            if (viewport && window.innerWidth <= 768) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }
        } else {
            document.body.style.overflow = 'unset';
            // Viewport'ni qaytarish
            const viewport = document.querySelector('meta[name=viewport]');
            if (viewport && window.innerWidth <= 768) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
            }
        }

        // Cleanup
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // ESC tugmasi bilan yopish
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.keyCode === 27) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="image-modal-overlay" onClick={onClose}>
            <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="image-modal-close" onClick={onClose}>
                    ×
                </button>
                
                {isLoading ? (
                    <div className="image-modal-loading">
                        <div className="loading-spinner"></div>
                        <p>Yuqori sifatli rasm yuklanmoqda...</p>
                    </div>
                ) : (
                    <img
                        src={highResSrc}
                        alt={imageAlt}
                        className="image-modal-image"
                        style={{
                            // Original o'lchamda, lekin viewport'ga sig'adigan qilib
                            maxHeight: '90vh',
                            maxWidth: '95vw',
                            width: naturalSize.width > 0 ? `${Math.min(naturalSize.width, window.innerWidth * 0.95)}px` : 'auto',
                            height: naturalSize.height > 0 ? `${Math.min(naturalSize.height, window.innerHeight * 0.9)}px` : 'auto',
                            objectFit: 'contain'
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default ImageModal;