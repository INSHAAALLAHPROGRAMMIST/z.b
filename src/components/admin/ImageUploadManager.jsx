import React, { useState, useRef, useCallback, useEffect } from 'react';
import cloudinaryService from '../../services/CloudinaryService';
import { toastMessages } from '../../utils/toastUtils';
import ImageCropModal from './ImageCropModal';
import '../../styles/admin/image-upload.css';

const ImageUploadManager = ({
  onImagesChange,
  initialImages = [],
  maxImages = 5,
  allowCrop = true,
  allowMultiple = true,
  folder = 'zamon-books',
  className = '',
  disabled = false
}) => {
  const [images, setImages] = useState(initialImages);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentCropImage, setCurrentCropImage] = useState(null);
  const [errors, setErrors] = useState({});
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Update parent when images change
  useEffect(() => {
    if (onImagesChange) {
      onImagesChange(images);
    }
  }, [images, onImagesChange]);

  // Validate file before processing
  const validateFile = useCallback((file) => {
    const errors = [];
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Faqat JPEG, PNG va WebP formatdagi rasmlar qabul qilinadi');
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('Fayl hajmi 10MB dan oshmasligi kerak');
    }
    
    // Check image count
    if (!allowMultiple && images.length >= 1) {
      errors.push('Faqat bitta rasm yuklash mumkin');
    } else if (images.length >= maxImages) {
      errors.push(`Maksimal ${maxImages} ta rasm yuklash mumkin`);
    }
    
    return errors;
  }, [images.length, allowMultiple, maxImages]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files) => {
    if (disabled || uploading) return;
    
    const fileArray = Array.from(files);
    const validFiles = [];
    const fileErrors = {};
    
    // Validate each file
    fileArray.forEach((file, index) => {
      const errors = validateFile(file);
      if (errors.length > 0) {
        fileErrors[`file_${index}`] = errors;
        toastMessages.error(errors[0]);
      } else {
        validFiles.push(file);
      }
    });
    
    setErrors(fileErrors);
    
    if (validFiles.length === 0) return;
    
    // Upload files
    await uploadFiles(validFiles);
  }, [disabled, uploading, validateFile]);

  // Upload files to Cloudinary
  const uploadFiles = useCallback(async (files) => {
    setUploading(true);
    setUploadProgress({});
    
    try {
      const uploadPromises = files.map(async (file, index) => {
        const fileId = `upload_${Date.now()}_${index}`;
        
        try {
          const result = await cloudinaryService.uploadImage(file, {
            folder,
            tags: ['book-image', 'admin-upload'],
            onProgress: (progress) => {
              setUploadProgress(prev => ({
                ...prev,
                [fileId]: progress
              }));
            }
          });
          
          if (result.success) {
            const imageData = {
              id: fileId,
              publicId: result.data.publicId,
              url: result.data.url,
              width: result.data.width,
              height: result.data.height,
              format: result.data.format,
              bytes: result.data.bytes,
              fileName: file.name,
              uploadedAt: new Date().toISOString(),
              isMain: images.length === 0 // First image is main by default
            };
            
            return { success: true, data: imageData };
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          return { 
            success: false, 
            error: error.message,
            fileName: file.name 
          };
        }
      });
      
      const results = await Promise.all(uploadPromises);
      
      // Process results
      const successfulUploads = results.filter(r => r.success).map(r => r.data);
      const failedUploads = results.filter(r => !r.success);
      
      if (successfulUploads.length > 0) {
        setImages(prev => [...prev, ...successfulUploads]);
        toastMessages.success(`${successfulUploads.length} ta rasm muvaffaqiyatli yuklandi`);
      }
      
      if (failedUploads.length > 0) {
        failedUploads.forEach(failed => {
          toastMessages.error(`${failed.fileName} yuklashda xato: ${failed.error}`);
        });
      }
      
    } catch (error) {
      console.error('Error in batch upload:', error);
      toastMessages.error('Rasmlarni yuklashda xato yuz berdi');
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [folder, images.length]);

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || uploading) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, uploading, handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  // Remove image
  const removeImage = useCallback(async (imageId) => {
    if (disabled) return;
    
    const imageToRemove = images.find(img => img.id === imageId);
    if (!imageToRemove) return;
    
    try {
      // Delete from Cloudinary
      if (imageToRemove.publicId) {
        await cloudinaryService.deleteImage(imageToRemove.publicId);
      }
      
      // Remove from state
      setImages(prev => {
        const filtered = prev.filter(img => img.id !== imageId);
        // If removed image was main, make first remaining image main
        if (imageToRemove.isMain && filtered.length > 0) {
          filtered[0].isMain = true;
        }
        return filtered;
      });
      
      toastMessages.success('Rasm muvaffaqiyatli o\'chirildi');
    } catch (error) {
      console.error('Error removing image:', error);
      toastMessages.error('Rasmni o\'chirishda xato yuz berdi');
    }
  }, [disabled, images]);

  // Set main image
  const setMainImage = useCallback((imageId) => {
    if (disabled) return;
    
    setImages(prev => prev.map(img => ({
      ...img,
      isMain: img.id === imageId
    })));
  }, [disabled]);

  // Open crop modal
  const openCropModal = useCallback((image) => {
    if (!allowCrop || disabled) return;
    setCurrentCropImage(image);
    setCropModalOpen(true);
  }, [allowCrop, disabled]);

  // Handle crop save
  const handleCropSave = useCallback((croppedImageData) => {
    // This would typically involve uploading the cropped image
    // For now, we'll just update the existing image data
    setImages(prev => prev.map(img => 
      img.id === currentCropImage.id 
        ? { ...img, ...croppedImageData }
        : img
    ));
    setCropModalOpen(false);
    setCurrentCropImage(null);
    toastMessages.success('Rasm muvaffaqiyatli tahrirlandi');
  }, [currentCropImage]);

  return (
    <div className={`image-upload-manager ${className}`}>
      {/* Upload Zone */}
      <div
        ref={dropZoneRef}
        className={`upload-zone ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept="image/*"
          onChange={handleInputChange}
          disabled={disabled || uploading}
          style={{ display: 'none' }}
        />
        
        <div className="upload-zone-content">
          {uploading ? (
            <div className="upload-status">
              <div className="upload-spinner"></div>
              <p>Rasmlar yuklanmoqda...</p>
            </div>
          ) : (
            <>
              <div className="upload-icon">
                <i className="fas fa-cloud-upload-alt"></i>
              </div>
              <p className="upload-text">
                Rasmlarni bu yerga sudrab olib keling yoki{' '}
                <span className="upload-link">tanlash uchun bosing</span>
              </p>
              <p className="upload-hint">
                JPEG, PNG, WebP formatida, maksimal 10MB
                {allowMultiple && ` (maksimal ${maxImages} ta)`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="upload-progress-container">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="upload-progress-item">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="image-gallery">
          <h4 className="gallery-title">
            Yuklangan rasmlar ({images.length}/{maxImages})
          </h4>
          <div className="image-grid">
            {images.map((image) => (
              <div key={image.id} className={`image-item ${image.isMain ? 'main-image' : ''}`}>
                <div className="image-preview">
                  <img 
                    src={cloudinaryService.getOptimizedUrl(image.publicId, {
                      width: 200,
                      height: 200,
                      crop: 'fill',
                      quality: 'auto'
                    })}
                    alt={image.fileName}
                    loading="lazy"
                  />
                  
                  {/* Image overlay */}
                  <div className="image-overlay">
                    <div className="image-actions">
                      {allowCrop && (
                        <button
                          type="button"
                          className="action-btn crop-btn"
                          onClick={() => openCropModal(image)}
                          disabled={disabled}
                          title="Rasmni tahrirlash"
                        >
                          <i className="fas fa-crop"></i>
                        </button>
                      )}
                      
                      {allowMultiple && !image.isMain && (
                        <button
                          type="button"
                          className="action-btn main-btn"
                          onClick={() => setMainImage(image.id)}
                          disabled={disabled}
                          title="Asosiy rasm qilish"
                        >
                          <i className="fas fa-star"></i>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        className="action-btn remove-btn"
                        onClick={() => removeImage(image.id)}
                        disabled={disabled}
                        title="Rasmni o'chirish"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  
                  {/* Main image badge */}
                  {image.isMain && (
                    <div className="main-badge">
                      <i className="fas fa-star"></i>
                      Asosiy
                    </div>
                  )}
                </div>
                
                {/* Image info */}
                <div className="image-info">
                  <p className="image-name" title={image.fileName}>
                    {image.fileName.length > 20 
                      ? `${image.fileName.substring(0, 20)}...` 
                      : image.fileName
                    }
                  </p>
                  <p className="image-size">
                    {Math.round(image.bytes / 1024)} KB • {image.width}×{image.height}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropModalOpen && currentCropImage && (
        <ImageCropModal
          image={currentCropImage}
          onSave={handleCropSave}
          onCancel={() => {
            setCropModalOpen(false);
            setCurrentCropImage(null);
          }}
        />
      )}
    </div>
  );
};

export default ImageUploadManager;