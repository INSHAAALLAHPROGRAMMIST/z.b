import React, { useState, useCallback } from 'react';
import ImageUploadManager from './ImageUploadManager';
import { toastMessages } from '../../utils/toastUtils';

const EnhancedBookForm = ({ 
  initialData = {}, 
  onSubmit, 
  onCancel,
  authors = [],
  genres = [],
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    author: '',
    genres: [],
    publishedYear: '',
    isbn: '',
    pages: '',
    language: 'uz',
    isFeatured: false,
    isNewArrival: false,
    images: [],
    ...initialData
  });

  const [errors, setErrors] = useState({});

  // Handle form field changes
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  // Handle genre selection
  const handleGenreChange = useCallback((genreId) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId]
    }));
  }, []);

  // Handle image changes from ImageUploadManager
  const handleImagesChange = useCallback((images) => {
    setFormData(prev => ({
      ...prev,
      images: images || []
    }));

    // Clear image error if images are provided
    if (images && images.length > 0 && errors.images) {
      setErrors(prev => ({ ...prev, images: null }));
    }
  }, [errors.images]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Kitob nomi majburiy';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Tavsif majburiy';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'To\'g\'ri narx kiriting';
    }

    if (!formData.author) {
      newErrors.author = 'Muallif tanlang';
    }

    if (formData.genres.length === 0) {
      newErrors.genres = 'Kamida bitta janr tanlang';
    }

    if (formData.images.length === 0) {
      newErrors.images = 'Kamida bitta rasm yuklang';
    }

    if (formData.publishedYear && (
      isNaN(formData.publishedYear) || 
      formData.publishedYear < 1000 || 
      formData.publishedYear > new Date().getFullYear()
    )) {
      newErrors.publishedYear = 'To\'g\'ri yil kiriting';
    }

    if (formData.pages && (isNaN(formData.pages) || formData.pages <= 0)) {
      newErrors.pages = 'To\'g\'ri sahifa soni kiriting';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toastMessages.error('Formada xatolar mavjud');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      toastMessages.error('Kitob saqlashda xato yuz berdi');
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <div className="enhanced-book-form">
      <form onSubmit={handleSubmit} className="admin-form">
        {/* Basic Information */}
        <div className="form-section">
          <h3>Asosiy ma'lumotlar</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Kitob nomi *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={errors.title ? 'error' : ''}
                disabled={loading}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="price">Narxi (so'm) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className={errors.price ? 'error' : ''}
                disabled={loading}
                min="0"
                step="1000"
              />
              {errors.price && <span className="form-error">{errors.price}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Tavsif *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={errors.description ? 'error' : ''}
              disabled={loading}
              rows="4"
              placeholder="Kitob haqida qisqacha ma'lumot..."
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
          </div>
        </div>

        {/* Author and Genres */}
        <div className="form-section">
          <h3>Muallif va janrlar</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="author">Muallif *</label>
              <select
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                className={errors.author ? 'error' : ''}
                disabled={loading}
              >
                <option value="">Muallif tanlang</option>
                {authors.map(author => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
              {errors.author && <span className="form-error">{errors.author}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="language">Til</label>
              <select
                id="language"
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="uz">O'zbek</option>
                <option value="ru">Rus</option>
                <option value="en">Ingliz</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Janrlar *</label>
            <div className="checkbox-group">
              {genres.map(genre => (
                <div key={genre.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`genre-${genre.id}`}
                    checked={formData.genres.includes(genre.id)}
                    onChange={() => handleGenreChange(genre.id)}
                    disabled={loading}
                  />
                  <label htmlFor={`genre-${genre.id}`}>{genre.name}</label>
                </div>
              ))}
            </div>
            {errors.genres && <span className="form-error">{errors.genres}</span>}
          </div>
        </div>

        {/* Additional Information */}
        <div className="form-section">
          <h3>Qo'shimcha ma'lumotlar</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="publishedYear">Nashr yili</label>
              <input
                type="number"
                id="publishedYear"
                name="publishedYear"
                value={formData.publishedYear}
                onChange={handleInputChange}
                className={errors.publishedYear ? 'error' : ''}
                disabled={loading}
                min="1000"
                max={new Date().getFullYear()}
              />
              {errors.publishedYear && <span className="form-error">{errors.publishedYear}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="pages">Sahifalar soni</label>
              <input
                type="number"
                id="pages"
                name="pages"
                value={formData.pages}
                onChange={handleInputChange}
                className={errors.pages ? 'error' : ''}
                disabled={loading}
                min="1"
              />
              {errors.pages && <span className="form-error">{errors.pages}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="isbn">ISBN</label>
            <input
              type="text"
              id="isbn"
              name="isbn"
              value={formData.isbn}
              onChange={handleInputChange}
              disabled={loading}
              placeholder="978-0-123456-78-9"
            />
          </div>

          <div className="form-row">
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="isFeatured"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleInputChange}
                disabled={loading}
              />
              <label htmlFor="isFeatured">Tavsiya etilgan kitob</label>
            </div>

            <div className="checkbox-item">
              <input
                type="checkbox"
                id="isNewArrival"
                name="isNewArrival"
                checked={formData.isNewArrival}
                onChange={handleInputChange}
                disabled={loading}
              />
              <label htmlFor="isNewArrival">Yangi kelgan kitob</label>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="form-section">
          <h3>Kitob rasmlari *</h3>
          <ImageUploadManager
            onImagesChange={handleImagesChange}
            initialImages={formData.images}
            maxImages={5}
            allowCrop={true}
            allowMultiple={true}
            folder="books"
            disabled={loading}
          />
          {errors.images && <span className="form-error">{errors.images}</span>}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={onCancel}
            disabled={loading}
          >
            Bekor qilish
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saqlanmoqda...
              </>
            ) : (
              'Saqlash'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnhancedBookForm;