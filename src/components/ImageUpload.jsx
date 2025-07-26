import React from 'react';
import '../styles/admin.css';

const ImageUpload = ({ 
    imagePreview, 
    onImageChange, 
    label = "Rasm tanlash",
    accept = "image/*",
    maxSize = 5 * 1024 * 1024, // 5MB
    required = false,
    className = "",
    showPreview = true
}) => {
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file type
            if (!file.type.startsWith('image/')) {
                alert('Faqat rasm fayllarini yuklash mumkin!');
                return;
            }
            
            // Check file size
            if (file.size > maxSize) {
                const maxSizeMB = Math.round(maxSize / (1024 * 1024));
                alert(`Fayl hajmi ${maxSizeMB}MB dan oshmasligi kerak!`);
                return;
            }
            
            // Call parent handler
            if (onImageChange) {
                onImageChange(file);
            }
        }
    };

    const uniqueId = `imageUpload_${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={`image-upload-container ${className}`}>
            {showPreview && imagePreview && (
                <div className="image-preview">
                    <img 
                        src={imagePreview} 
                        alt="Preview"
                    />
                </div>
            )}
            <input
                type="file"
                id={uniqueId}
                accept={accept}
                onChange={handleFileChange}
                required={required}
                style={{ display: 'none' }}
            />
            <label htmlFor={uniqueId} className="file-upload-btn">
                <i className="fas fa-upload"></i> {label}
            </label>
        </div>
    );
};

export default ImageUpload;