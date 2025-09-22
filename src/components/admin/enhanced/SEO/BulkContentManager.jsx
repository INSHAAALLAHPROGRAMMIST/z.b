import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../../../firebaseConfig';

const BulkContentManager = () => {
  const [books, setBooks] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkOperation, setBulkOperation] = useState('updateSEO'); // updateSEO, updateImages, updateCategories
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const fileInputRef = useRef(null);

  // Bulk operation forms
  const [bulkSEOData, setBulkSEOData] = useState({
    metaTitleTemplate: '{title} | Online Kitob Do\'koni',
    metaDescriptionTemplate: '{title} - {author} kitobi. {description}',
    keywordsTemplate: '{title}, {author}, kitob, onlayn'
  });

  const [bulkImageData, setBulkImageData] = useState({
    altTextTemplate: '{title} - {author} kitobi rasmi',
    optimizeImages: true,
    generateThumbnails: true
  });

  const [bulkCategoryData, setBulkCategoryData] = useState({
    newCategory: '',
    newTags: '',
    updatePrices: false,
    priceMultiplier: 1.0
  });

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const booksSnapshot = await getDocs(collection(db, COLLECTIONS.BOOKS));
      const booksData = booksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBooks(booksData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading books:', error);
      setLoading(false);
    }
  };

  const getFilteredBooks = () => {
    let filtered = [...books];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.category?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(book => book.category === filterCategory);
    }

    return filtered;
  };

  const handleBookSelect = (bookId, isSelected) => {
    const newSelected = new Set(selectedBooks);
    if (isSelected) {
      newSelected.add(bookId);
    } else {
      newSelected.delete(bookId);
    }
    setSelectedBooks(newSelected);
  };

  const handleSelectAll = () => {
    const filteredBooks = getFilteredBooks();
    if (selectedBooks.size === filteredBooks.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(filteredBooks.map(book => book.id)));
    }
  };

  const processBulkOperation = async () => {
    if (selectedBooks.size === 0) {
      alert('Iltimos, kamida bitta kitob tanlang');
      return;
    }

    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      let successCount = 0;

      for (const bookId of selectedBooks) {
        const book = books.find(b => b.id === bookId);
        if (!book) continue;

        const bookRef = doc(db, COLLECTIONS.BOOKS, bookId);
        let updateData = {};

        switch (bulkOperation) {
          case 'updateSEO':
            updateData = generateSEOUpdates(book);
            break;
          case 'updateImages':
            updateData = generateImageUpdates(book);
            break;
          case 'updateCategories':
            updateData = generateCategoryUpdates(book);
            break;
          default:
            continue;
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          batch.update(bookRef, updateData);
          successCount++;
        }
      }

      await batch.commit();
      
      alert(`${successCount} ta kitob muvaffaqiyatli yangilandi!`);
      setSelectedBooks(new Set());
      await loadBooks(); // Refresh the list

    } catch (error) {
      console.error('Bulk operation error:', error);
      alert(`Bulk operation xato: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSEOUpdates = (book) => {
    const updates = {};

    // Generate meta title
    if (bulkSEOData.metaTitleTemplate) {
      updates.metaTitle = bulkSEOData.metaTitleTemplate
        .replace('{title}', book.title || '')
        .replace('{author}', book.author || '')
        .replace('{category}', book.category || '');
    }

    // Generate meta description
    if (bulkSEOData.metaDescriptionTemplate) {
      updates.metaDescription = bulkSEOData.metaDescriptionTemplate
        .replace('{title}', book.title || '')
        .replace('{author}', book.author || '')
        .replace('{description}', (book.description || '').substring(0, 100))
        .replace('{category}', book.category || '')
        .substring(0, 160);
    }

    // Generate keywords
    if (bulkSEOData.keywordsTemplate) {
      const keywordsString = bulkSEOData.keywordsTemplate
        .replace('{title}', book.title || '')
        .replace('{author}', book.author || '')
        .replace('{category}', book.category || '');
      
      updates.keywords = keywordsString.split(',').map(k => k.trim()).filter(k => k);
    }

    // Generate URL slug
    if (book.title && !book.slug) {
      updates.slug = book.title
        .toLowerCase()
        .replace(/[^a-z0-9а-я\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .substring(0, 50);
    }

    return updates;
  };

  const generateImageUpdates = (book) => {
    const updates = {};

    // Generate alt text
    if (bulkImageData.altTextTemplate && !book.altText) {
      updates.altText = bulkImageData.altTextTemplate
        .replace('{title}', book.title || '')
        .replace('{author}', book.author || '')
        .replace('{category}', book.category || '');
    }

    // Mark for image optimization (would be processed by a background job)
    if (bulkImageData.optimizeImages) {
      updates.needsImageOptimization = true;
    }

    // Mark for thumbnail generation
    if (bulkImageData.generateThumbnails) {
      updates.needsThumbnailGeneration = true;
    }

    return updates;
  };

  const generateCategoryUpdates = (book) => {
    const updates = {};

    // Update category
    if (bulkCategoryData.newCategory) {
      updates.category = bulkCategoryData.newCategory;
    }

    // Add tags
    if (bulkCategoryData.newTags) {
      const newTags = bulkCategoryData.newTags.split(',').map(t => t.trim());
      const existingTags = book.tags || [];
      updates.tags = [...new Set([...existingTags, ...newTags])];
    }

    // Update prices
    if (bulkCategoryData.updatePrices && bulkCategoryData.priceMultiplier !== 1.0) {
      const currentPrice = parseFloat(book.price) || 0;
      updates.price = Math.round(currentPrice * bulkCategoryData.priceMultiplier);
    }

    return updates;
  };

  const handleCSVImport = () => {
    if (!importData.trim()) {
      alert('Iltimos, CSV ma\'lumotlarini kiriting');
      return;
    }

    try {
      const lines = importData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const updates = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const bookData = {};
        
        headers.forEach((header, index) => {
          if (values[index]) {
            bookData[header] = values[index];
          }
        });

        if (bookData.id || bookData.title) {
          updates.push(bookData);
        }
      }

      if (updates.length === 0) {
        alert('CSV faylida to\'g\'ri ma\'lumotlar topilmadi');
        return;
      }

      processBulkCSVImport(updates);

    } catch (error) {
      console.error('CSV import error:', error);
      alert(`CSV import xato: ${error.message}`);
    }
  };

  const processBulkCSVImport = async (updates) => {
    setIsProcessing(true);

    try {
      const batch = writeBatch(db);
      let successCount = 0;

      for (const updateData of updates) {
        let book;
        
        if (updateData.id) {
          book = books.find(b => b.id === updateData.id);
        } else if (updateData.title) {
          book = books.find(b => b.title === updateData.title);
        }

        if (book) {
          const bookRef = doc(db, COLLECTIONS.BOOKS, book.id);
          const { id, ...dataToUpdate } = updateData;
          
          batch.update(bookRef, {
            ...dataToUpdate,
            updatedAt: new Date()
          });
          successCount++;
        }
      }

      await batch.commit();
      
      alert(`${successCount} ta kitob CSV orqali yangilandi!`);
      setImportData('');
      setShowImportModal(false);
      await loadBooks();

    } catch (error) {
      console.error('CSV bulk import error:', error);
      alert(`CSV import xato: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCSVExport = () => {
    const selectedBooksData = books.filter(book => selectedBooks.has(book.id));
    
    if (selectedBooksData.length === 0) {
      alert('Export uchun kitoblar tanlang');
      return;
    }

    const csvHeaders = [
      'id', 'title', 'author', 'category', 'price', 'description',
      'metaTitle', 'metaDescription', 'keywords', 'slug', 'altText'
    ];

    const csvContent = [
      csvHeaders.join(','),
      ...selectedBooksData.map(book => 
        csvHeaders.map(header => {
          const value = book[header] || '';
          return typeof value === 'object' ? JSON.stringify(value) : `"${value}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `books-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getUniqueCategories = () => {
    const categories = books.map(book => book.category).filter(Boolean);
    return [...new Set(categories)];
  };

  if (loading) {
    return (
      <div className="bulk-content-loading">
        <div className="loading-spinner"></div>
        <p>Kitoblar yuklanmoqda...</p>
      </div>
    );
  }

  const filteredBooks = getFilteredBooks();
  const selectedCount = selectedBooks.size;

  return (
    <div className="bulk-content-manager">
      {/* Header */}
      <div className="bulk-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-edit"></i>
            Bulk Content Management
          </h2>
          <p>Ko'p miqdordagi kitoblarni bir vaqtda tahrirlash</p>
        </div>
        
        <div className="header-actions">
          <button
            className="import-btn"
            onClick={() => setShowImportModal(true)}
          >
            <i className="fas fa-upload"></i>
            CSV Import
          </button>
          <button
            className="export-btn"
            onClick={handleCSVExport}
            disabled={selectedCount === 0}
          >
            <i className="fas fa-download"></i>
            CSV Export ({selectedCount})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bulk-filters">
        <div className="search-section">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Kitob nomi, muallif yoki kategoriya bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-section">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="category-filter"
          >
            <option value="all">Barcha kategoriyalar</option>
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      <div className="bulk-operations">
        <div className="operation-header">
          <h3>
            Bulk Operatsiya
            {selectedCount > 0 && (
              <span className="selected-count">({selectedCount} ta tanlangan)</span>
            )}
          </h3>
        </div>

        <div className="operation-tabs">
          <button
            className={`tab-btn ${bulkOperation === 'updateSEO' ? 'active' : ''}`}
            onClick={() => setBulkOperation('updateSEO')}
          >
            <i className="fas fa-search"></i>
            SEO Yangilash
          </button>
          <button
            className={`tab-btn ${bulkOperation === 'updateImages' ? 'active' : ''}`}
            onClick={() => setBulkOperation('updateImages')}
          >
            <i className="fas fa-image"></i>
            Rasm Yangilash
          </button>
          <button
            className={`tab-btn ${bulkOperation === 'updateCategories' ? 'active' : ''}`}
            onClick={() => setBulkOperation('updateCategories')}
          >
            <i className="fas fa-tags"></i>
            Kategoriya Yangilash
          </button>
        </div>

        {/* Operation Forms */}
        <div className="operation-form">
          {bulkOperation === 'updateSEO' && (
            <div className="seo-form">
              <div className="form-group">
                <label>Meta Title Template:</label>
                <input
                  type="text"
                  value={bulkSEOData.metaTitleTemplate}
                  onChange={(e) => setBulkSEOData(prev => ({ ...prev, metaTitleTemplate: e.target.value }))}
                  placeholder="{title} | {author} - Online Kitob Do'koni"
                />
                <small>Mavjud o'zgaruvchilar: {'{title}'}, {'{author}'}, {'{category}'}</small>
              </div>
              
              <div className="form-group">
                <label>Meta Description Template:</label>
                <textarea
                  value={bulkSEOData.metaDescriptionTemplate}
                  onChange={(e) => setBulkSEOData(prev => ({ ...prev, metaDescriptionTemplate: e.target.value }))}
                  placeholder="{title} - {author} kitobi. {description}"
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Keywords Template:</label>
                <input
                  type="text"
                  value={bulkSEOData.keywordsTemplate}
                  onChange={(e) => setBulkSEOData(prev => ({ ...prev, keywordsTemplate: e.target.value }))}
                  placeholder="{title}, {author}, {category}, kitob, onlayn"
                />
              </div>
            </div>
          )}

          {bulkOperation === 'updateImages' && (
            <div className="image-form">
              <div className="form-group">
                <label>Alt Text Template:</label>
                <input
                  type="text"
                  value={bulkImageData.altTextTemplate}
                  onChange={(e) => setBulkImageData(prev => ({ ...prev, altTextTemplate: e.target.value }))}
                  placeholder="{title} - {author} kitobi rasmi"
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={bulkImageData.optimizeImages}
                    onChange={(e) => setBulkImageData(prev => ({ ...prev, optimizeImages: e.target.checked }))}
                  />
                  Rasmlarni optimize qilish uchun belgilash
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={bulkImageData.generateThumbnails}
                    onChange={(e) => setBulkImageData(prev => ({ ...prev, generateThumbnails: e.target.checked }))}
                  />
                  Thumbnail yaratish uchun belgilash
                </label>
              </div>
            </div>
          )}

          {bulkOperation === 'updateCategories' && (
            <div className="category-form">
              <div className="form-group">
                <label>Yangi Kategoriya:</label>
                <input
                  type="text"
                  value={bulkCategoryData.newCategory}
                  onChange={(e) => setBulkCategoryData(prev => ({ ...prev, newCategory: e.target.value }))}
                  placeholder="Yangi kategoriya nomi"
                />
              </div>
              
              <div className="form-group">
                <label>Qo'shimcha Teglar (vergul bilan ajrating):</label>
                <input
                  type="text"
                  value={bulkCategoryData.newTags}
                  onChange={(e) => setBulkCategoryData(prev => ({ ...prev, newTags: e.target.value }))}
                  placeholder="teg1, teg2, teg3"
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={bulkCategoryData.updatePrices}
                    onChange={(e) => setBulkCategoryData(prev => ({ ...prev, updatePrices: e.target.checked }))}
                  />
                  Narxlarni yangilash
                </label>
                {bulkCategoryData.updatePrices && (
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={bulkCategoryData.priceMultiplier}
                    onChange={(e) => setBulkCategoryData(prev => ({ ...prev, priceMultiplier: parseFloat(e.target.value) }))}
                    placeholder="Narx koeffitsienti"
                  />
                )}
              </div>
            </div>
          )}

          <div className="operation-actions">
            <button
              className="bulk-process-btn"
              onClick={processBulkOperation}
              disabled={selectedCount === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Jarayon davom etmoqda...
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i>
                  Jarayonni Boshlash ({selectedCount})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="books-table-container">
        <div className="table-header">
          <div className="table-controls">
            <button
              className="select-all-btn"
              onClick={handleSelectAll}
            >
              {selectedBooks.size === filteredBooks.length ? 
                'Barcha tanlovni bekor qilish' : 
                'Barchasini tanlash'
              }
            </button>
            <span className="books-count">
              {filteredBooks.length} ta kitob topildi
            </span>
          </div>
        </div>

        <div className="books-table">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedBooks.size === filteredBooks.length && filteredBooks.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Kitob</th>
                <th>Muallif</th>
                <th>Kategoriya</th>
                <th>Narx</th>
                <th>SEO Holati</th>
                <th>Oxirgi Yangilanish</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map(book => {
                const isSelected = selectedBooks.has(book.id);
                const hasSEO = book.metaTitle && book.metaDescription;

                return (
                  <tr key={book.id} className={isSelected ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleBookSelect(book.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <div className="book-info">
                        <div className="book-image">
                          {book.imageUrl ? (
                            <img src={book.imageUrl} alt={book.title} />
                          ) : (
                            <div className="no-image">
                              <i className="fas fa-book"></i>
                            </div>
                          )}
                        </div>
                        <div className="book-details">
                          <h4>{book.title}</h4>
                          <small>ID: {book.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>{book.author || 'Noma\'lum'}</td>
                    <td>{book.category || 'Belgilanmagan'}</td>
                    <td>{book.price ? `${book.price} so'm` : 'Narx yo\'q'}</td>
                    <td>
                      <span className={`seo-status ${hasSEO ? 'good' : 'poor'}`}>
                        {hasSEO ? 'Yaxshi' : 'Yomon'}
                      </span>
                    </td>
                    <td>
                      {book.updatedAt ? 
                        new Date(book.updatedAt.toDate()).toLocaleDateString('uz-UZ') : 
                        'Noma\'lum'
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredBooks.length === 0 && (
            <div className="no-books">
              <i className="fas fa-search"></i>
              <p>Hech qanday kitob topilmadi</p>
            </div>
          )}
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="import-modal">
            <div className="modal-header">
              <h3>CSV Import</h3>
              <button
                className="close-btn"
                onClick={() => setShowImportModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-content">
              <div className="import-instructions">
                <h4>CSV Format:</h4>
                <p>CSV fayl quyidagi formatda bo'lishi kerak:</p>
                <code>
                  id,title,author,category,price,metaTitle,metaDescription<br/>
                  book1,"Kitob nomi","Muallif","Kategoriya",50000,"Meta title","Meta description"<br/>
                  book2,"Boshqa kitob","Boshqa muallif","Boshqa kategoriya",75000,"Meta title 2","Meta description 2"
                </code>
              </div>

              <div className="import-input">
                <label>CSV ma'lumotlari:</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="CSV ma'lumotlarini bu yerga joylashtiring..."
                  rows="10"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowImportModal(false)}
                >
                  Bekor qilish
                </button>
                <button
                  className="import-confirm-btn"
                  onClick={handleCSVImport}
                  disabled={!importData.trim() || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Import qilinmoqda...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload"></i>
                      Import qilish
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkContentManager;