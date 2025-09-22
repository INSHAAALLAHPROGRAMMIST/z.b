import React, { useState } from 'react';
import ImageUploadManager from './ImageUploadManager';
import { toastMessages } from '../../utils/toastUtils';

const ImageUploadDemo = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImagesChange = (newImages) => {
    console.log('Images changed:', newImages);
    setImages(newImages);
  };

  const handleSave = async () => {
    if (images.length === 0) {
      toastMessages.error('Kamida bitta rasm yuklang');
      return;
    }

    setLoading(true);
    try {
      // Simulate saving to database
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const bookData = {
        title: 'Demo Book',
        images: images.map(img => ({
          publicId: img.publicId,
          url: img.url,
          isMain: img.isMain
        }))
      };
      
      console.log('Book saved with images:', bookData);
      toastMessages.success('Kitob muvaffaqiyatli saqlandi!');
    } catch (error) {
      console.error('Save error:', error);
      toastMessages.error('Saqlashda xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    toastMessages.info('Rasmlar tozalandi');
  };

  return (
    <div className="image-upload-demo" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Image Upload Manager Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Current Images: {images.length}</h3>
        {images.length > 0 && (
          <div>
            <h4>Image Details:</h4>
            <ul>
              {images.map((img, index) => (
                <li key={img.id}>
                  <strong>{img.fileName}</strong> 
                  {img.isMain && <span style={{ color: 'blue' }}> (Main)</span>}
                  <br />
                  <small>
                    Size: {Math.round(img.bytes / 1024)} KB | 
                    Dimensions: {img.width}×{img.height} |
                    Public ID: {img.publicId}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <ImageUploadManager
          onImagesChange={handleImagesChange}
          initialImages={images}
          maxImages={5}
          allowCrop={true}
          allowMultiple={true}
          folder="demo-books"
          disabled={loading}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleSave}
          disabled={loading || images.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading || images.length === 0 ? 'not-allowed' : 'pointer',
            opacity: loading || images.length === 0 ? 0.6 : 1
          }}
        >
          {loading ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
        
        <button 
          onClick={handleReset}
          disabled={loading || images.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading || images.length === 0 ? 'not-allowed' : 'pointer',
            opacity: loading || images.length === 0 ? 0.6 : 1
          }}
        >
          Tozalash
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h4>Features Demonstrated:</h4>
        <ul>
          <li>✅ Drag and drop file upload</li>
          <li>✅ Multiple image support (up to 5)</li>
          <li>✅ Image preview with thumbnails</li>
          <li>✅ Set main image functionality</li>
          <li>✅ Image cropping capability</li>
          <li>✅ Upload progress indicators</li>
          <li>✅ File validation (type, size)</li>
          <li>✅ Cloudinary integration</li>
          <li>✅ Error handling and user feedback</li>
          <li>✅ Responsive design</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUploadDemo;