import React, { useState, useRef } from 'react';
import { useInventory } from '../../../../hooks/useInventory';
import { STOCK_STATUS, getStockStatusColor, getStockStatusText } from '../../../../utils/inventoryUtils';

const BulkStockUpdate = () => {
  const { stockData, loading, error, bulkUpdateStock, generateReport } = useInventory();
  const [selectedBooks, setSelectedBooks] = useState(new Set());
  const [bulkOperation, setBulkOperation] = useState('add'); // add, subtract, set
  const [bulkValue, setBulkValue] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const fileInputRef = useRef(null);

  // Get all books for bulk operations
  const getAllBooks = () => {
    return [
      ...stockData.categories.inStock,
      ...stockData.categories.lowStock,
      ...stockData.categories.outOfStock,
      ...stockData.categories.preOrder,
      ...stockData.categories.discontinued
    ];
  };

  // Filter books based on search and status
  const getFilteredBooks = () => {
    let books = getAllBooks();

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      books = books.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.id.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      books = books.filter(book => book.stockStatus === filterStatus);
    }

    return books;
  };

  // Handle book selection
  const handleBookSelect = (bookId, isSelected) => {
    const newSelected = new Set(selectedBooks);
    if (isSelected) {
      newSelected.add(bookId);
    } else {
      newSelected.delete(bookId);
    }
    setSelectedBooks(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    const filteredBooks = getFilteredBooks();
    if (selectedBooks.size === filteredBooks.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(filteredBooks.map(book => book.id)));
    }
  };

  // Handle bulk stock update
  const handleBulkUpdate = async () => {
    if (selectedBooks.size === 0) {
      alert('Iltimos, kamida bitta kitob tanlang');
      return;
    }

    if (!bulkValue || isNaN(bulkValue) || parseInt(bulkValue) < 0) {
      alert('Iltimos, to\'g\'ri qiymat kiriting');
      return;
    }

    const value = parseInt(bulkValue);
    const reason = bulkReason || `Bulk ${bulkOperation} operation`;

    setIsProcessing(true);

    try {
      const updates = Array.from(selectedBooks).map(bookId => {
        const book = getAllBooks().find(b => b.id === bookId);
        let newStock;

        switch (bulkOperation) {
          case 'add':
            newStock = (book.stock || 0) + value;
            break;
          case 'subtract':
            newStock = Math.max(0, (book.stock || 0) - value);
            break;
          case 'set':
            newStock = value;
            break;
          default:
            newStock = book.stock || 0;
        }

        return {
          bookId,
          stock: newStock,
          reason
        };
      });

      const result = await bulkUpdateStock(updates);

      if (result.success) {
        alert(`${result.totalUpdated} ta kitob muvaffaqiyatli yangilandi`);
        setSelectedBooks(new Set());
        setBulkValue('');
        setBulkReason('');
      } else {
        alert(`Xato yuz berdi: ${result.error}`);
      }
    } catch (error) {
      console.error('Bulk update error:', error);
      alert(`Bulk update xato: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle CSV import
  const handleCSVImport = () => {
    if (!importData.trim()) {
      alert('Iltimos, CSV ma\'lumotlarini kiriting');
      return;
    }

    try {
      const lines = importData.trim().split('\n');
      const updates = [];

      for (let i = 1; i < lines.length; i++) { // Skip header
        const [bookId, stock, reason] = lines[i].split(',').map(s => s.trim());
        
        if (bookId && stock && !isNaN(stock)) {
          updates.push({
            bookId,
            stock: parseInt(stock),
            reason: reason || 'CSV import'
          });
        }
      }

      if (updates.length === 0) {
        alert('CSV faylida to\'g\'ri ma\'lumotlar topilmadi');
        return;
      }

      // Process the updates
      setIsProcessing(true);
      bulkUpdateStock(updates).then(result => {
        if (result.success) {
          alert(`${result.totalUpdated} ta kitob CSV orqali yangilandi`);
          setImportData('');
          setShowImportModal(false);
        } else {
          alert(`CSV import xato: ${result.error}`);
        }
      }).finally(() => {
        setIsProcessing(false);
      });

    } catch (error) {
      console.error('CSV import error:', error);
      alert(`CSV import xato: ${error.message}`);
    }
  };

  // Handle CSV export
  const handleCSVExport = async () => {
    try {
      const result = await generateReport({
        includeOutOfStock: true,
        includeDiscontinued: false,
        sortBy: 'title',
        sortOrder: 'asc'
      });

      if (result.success) {
        const csvContent = [
          'Book ID,Title,Author,Current Stock,Price,Status',
          ...result.data.books.map(book => 
            `${book.id},"${book.title}","${book.author}",${book.stock || 0},${book.price || 0},${book.stockStatus}`
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert(`Export xato: ${result.error}`);
      }
    } catch (error) {
      console.error('CSV export error:', error);
      alert(`CSV export xato: ${error.message}`);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bulk-stock-loading">
        <div className="loading-spinner"></div>
        <p>Kitoblar ro'yxati yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bulk-stock-error">
        <i className="fas fa-exclamation-triangle"></i>
        <h3>Xato yuz berdi</h3>
        <p>{error}</p>
        <button 
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  const filteredBooks = getFilteredBooks();
  const selectedCount = selectedBooks.size;

  return (
    <div className="bulk-stock-update">
      {/* Header */}
      <div className="bulk-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-edit"></i>
            Bulk Stock Yangilash
          </h2>
          <p>Bir nechta kitobni bir vaqtda yangilash va import/export</p>
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
          >
            <i className="fas fa-download"></i>
            CSV Export
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bulk-filters">
        <div className="search-section">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Kitob nomi, muallif yoki ID bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-section">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">Barcha holatlar</option>
            <option value={STOCK_STATUS.IN_STOCK}>Mavjud</option>
            <option value={STOCK_STATUS.LOW_STOCK}>Kam qolgan</option>
            <option value={STOCK_STATUS.OUT_OF_STOCK}>Tugagan</option>
            <option value={STOCK_STATUS.PRE_ORDER}>Pre-order</option>
            <option value={STOCK_STATUS.DISCONTINUED}>To'xtatilgan</option>
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

        <div className="operation-controls">
          <div className="operation-type">
            <label>Operatsiya turi:</label>
            <select
              value={bulkOperation}
              onChange={(e) => setBulkOperation(e.target.value)}
            >
              <option value="add">Qo'shish (+)</option>
              <option value="subtract">Ayirish (-)</option>
              <option value="set">O'rnatish (=)</option>
            </select>
          </div>

          <div className="operation-value">
            <label>Qiymat:</label>
            <input
              type="number"
              min="0"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="Miqdor kiriting"
            />
          </div>

          <div className="operation-reason">
            <label>Sabab (ixtiyoriy):</label>
            <input
              type="text"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="Yangilash sababi"
            />
          </div>

          <div className="operation-actions">
            <button
              className="bulk-update-btn"
              onClick={handleBulkUpdate}
              disabled={selectedCount === 0 || !bulkValue || isProcessing}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Yangilanmoqda...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Yangilash ({selectedCount})
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
                <th>Hozirgi Stock</th>
                <th>Holat</th>
                <th>Narx</th>
                <th>Qiymat</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map(book => {
                const isSelected = selectedBooks.has(book.id);
                const stockValue = (book.stock || 0) * (book.price || 0);

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
                    <td>{book.author}</td>
                    <td>
                      <span className="stock-amount">{book.stock || 0}</span>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStockStatusColor(book.stockStatus) }}
                      >
                        {getStockStatusText(book.stockStatus, book.stock)}
                      </span>
                    </td>
                    <td>{formatCurrency(book.price || 0)}</td>
                    <td>{formatCurrency(stockValue)}</td>
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
                  Book ID,Stock,Reason<br/>
                  book1,25,Restock<br/>
                  book2,10,Inventory update<br/>
                  book3,0,Sold out
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

export default BulkStockUpdate;