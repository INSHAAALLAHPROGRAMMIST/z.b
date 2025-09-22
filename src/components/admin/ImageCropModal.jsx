import React, { useState, useRef, useCallback, useEffect } from 'react';
import cloudinaryService from '../../services/CloudinaryService';
import { toastMessages } from '../../utils/toastUtils';

const ImageCropModal = ({ image, onSave, onCancel }) => {
  const [cropData, setCropData] = useState({
    x: 0,
    y: 0,
    width: 200,
    height: 300,
    scale: 1
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Load and display image
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      
      // Set canvas size
      const containerWidth = containerRef.current?.clientWidth || 600;
      const containerHeight = 400;
      
      // Calculate scale to fit image in container
      const scaleX = containerWidth / img.width;
      const scaleY = containerHeight / img.height;
      const scale = Math.min(scaleX, scaleY, 1);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // Update crop data
      setCropData(prev => ({
        ...prev,
        scale,
        width: Math.min(200 * scale, canvas.width * 0.8),
        height: Math.min(300 * scale, canvas.height * 0.8)
      }));
      
      drawCanvas();
    };
    
    img.src = cloudinaryService.getOptimizedUrl(image.publicId, {
      width: 800,
      quality: 'auto'
    });
  }, [image.publicId]);

  // Draw canvas with image and crop overlay
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Draw crop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear crop area
    ctx.clearRect(cropData.x, cropData.y, cropData.width, cropData.height);
    
    // Redraw image in crop area
    ctx.drawImage(
      img,
      cropData.x / cropData.scale,
      cropData.y / cropData.scale,
      cropData.width / cropData.scale,
      cropData.height / cropData.scale,
      cropData.x,
      cropData.y,
      cropData.width,
      cropData.height
    );
    
    // Draw crop border
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropData.x, cropData.y, cropData.width, cropData.height);
    
    // Draw corner handles
    const handleSize = 8;
    const handles = [
      { x: cropData.x - handleSize/2, y: cropData.y - handleSize/2 },
      { x: cropData.x + cropData.width - handleSize/2, y: cropData.y - handleSize/2 },
      { x: cropData.x - handleSize/2, y: cropData.y + cropData.height - handleSize/2 },
      { x: cropData.x + cropData.width - handleSize/2, y: cropData.y + cropData.height - handleSize/2 }
    ];
    
    ctx.fillStyle = '#007bff';
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    });
  }, [cropData]);

  // Redraw when crop data changes
  useEffect(() => {
    drawCanvas();
  }, [cropData, drawCanvas]);

  // Handle mouse events for dragging
  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if click is inside crop area
    if (
      x >= cropData.x && 
      x <= cropData.x + cropData.width &&
      y >= cropData.y && 
      y <= cropData.y + cropData.height
    ) {
      setIsDragging(true);
      setDragStart({ x: x - cropData.x, y: y - cropData.y });
    }
  }, [cropData]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newX = Math.max(0, Math.min(x - dragStart.x, canvas.width - cropData.width));
    const newY = Math.max(0, Math.min(y - dragStart.y, canvas.height - cropData.height));
    
    setCropData(prev => ({
      ...prev,
      x: newX,
      y: newY
    }));
  }, [isDragging, dragStart, cropData.width, cropData.height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle crop size changes
  const handleSizeChange = useCallback((dimension, value) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setCropData(prev => {
      const newData = { ...prev };
      
      if (dimension === 'width') {
        newData.width = Math.max(50, Math.min(value, canvas.width - prev.x));
      } else if (dimension === 'height') {
        newData.height = Math.max(50, Math.min(value, canvas.height - prev.y));
      }
      
      return newData;
    });
  }, []);

  // Process and save cropped image
  const handleSave = useCallback(async () => {
    if (!imageRef.current || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Create a new canvas for the cropped image
      const cropCanvas = document.createElement('canvas');
      const cropCtx = cropCanvas.getContext('2d');
      
      // Set crop canvas size (actual image dimensions)
      const actualWidth = cropData.width / cropData.scale;
      const actualHeight = cropData.height / cropData.scale;
      
      cropCanvas.width = actualWidth;
      cropCanvas.height = actualHeight;
      
      // Draw cropped portion
      cropCtx.drawImage(
        imageRef.current,
        cropData.x / cropData.scale,
        cropData.y / cropData.scale,
        actualWidth,
        actualHeight,
        0,
        0,
        actualWidth,
        actualHeight
      );
      
      // Convert to blob
      const blob = await new Promise(resolve => {
        cropCanvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      
      // Create file from blob
      const file = new File([blob], `cropped_${image.fileName}`, {
        type: 'image/jpeg'
      });
      
      // Upload cropped image
      const result = await cloudinaryService.uploadImage(file, {
        folder: 'zamon-books',
        tags: ['book-image', 'cropped', 'admin-upload']
      });
      
      if (result.success) {
        // Delete old image if it exists
        if (image.publicId) {
          try {
            await cloudinaryService.deleteImage(image.publicId);
          } catch (error) {
            console.warn('Could not delete old image:', error);
          }
        }
        
        // Return new image data
        const newImageData = {
          publicId: result.data.publicId,
          url: result.data.url,
          width: result.data.width,
          height: result.data.height,
          format: result.data.format,
          bytes: result.data.bytes,
          fileName: file.name,
          uploadedAt: new Date().toISOString()
        };
        
        onSave(newImageData);
      } else {
        throw new Error('Crop upload failed');
      }
      
    } catch (error) {
      console.error('Error processing crop:', error);
      toastMessages.error('Rasmni tahrirlashda xato yuz berdi');
    } finally {
      setIsProcessing(false);
    }
  }, [cropData, image, isProcessing, onSave]);

  return (
    <div className="crop-modal-overlay" onClick={onCancel}>
      <div className="crop-modal" onClick={e => e.stopPropagation()}>
        <div className="crop-modal-header">
          <h3>Rasmni tahrirlash</h3>
          <button 
            className="close-btn" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="crop-modal-body">
          <div className="crop-container" ref={containerRef}>
            <canvas
              ref={canvasRef}
              className="crop-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          
          <div className="crop-controls">
            <div className="control-group">
              <label>Kenglik:</label>
              <input
                type="number"
                value={Math.round(cropData.width)}
                onChange={(e) => handleSizeChange('width', parseInt(e.target.value))}
                min="50"
                max="800"
                disabled={isProcessing}
              />
            </div>
            
            <div className="control-group">
              <label>Balandlik:</label>
              <input
                type="number"
                value={Math.round(cropData.height)}
                onChange={(e) => handleSizeChange('height', parseInt(e.target.value))}
                min="50"
                max="800"
                disabled={isProcessing}
              />
            </div>
            
            <div className="control-group">
              <label>Nisbat:</label>
              <select 
                onChange={(e) => {
                  const [w, h] = e.target.value.split(':').map(Number);
                  if (w && h) {
                    const newHeight = (cropData.width * h) / w;
                    handleSizeChange('height', newHeight);
                  }
                }}
                disabled={isProcessing}
              >
                <option value="">Erkin</option>
                <option value="1:1">1:1 (Kvadrat)</option>
                <option value="3:4">3:4 (Kitob muqovasi)</option>
                <option value="4:3">4:3 (Landshaft)</option>
                <option value="16:9">16:9 (Keng)</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="crop-modal-footer">
          <button 
            className="cancel-btn" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            Bekor qilish
          </button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saqlanmoqda...
              </>
            ) : (
              'Saqlash'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;