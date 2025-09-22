import React, { useState, useEffect } from 'react';
import { useInventory } from '../../../../hooks/useInventory';
import { STOCK_STATUS, getStockStatusColor, getStockStatusText } from '../../../../utils/inventoryUtils';

const InventoryReports = () => {
  const { stockData, loading, error, generateReport } = useInventory();
  const [reportType, setReportType] = useState('summary'); // summary, detailed, movement, forecast
  const [reportOptions, setReportOptions] = useState({
    includeOutOfStock: true,
    includeDiscontinued: false,
    sortBy: 'stock',
    sortOrder: 'asc',
    dateRange: 'all' // all, week, month, quarter, year
  });
  const [generatedReport, setGeneratedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Generate report when options change
  useEffect(() => {
    if (!loading && !error) {
      handleGenerateReport();
    }
  }, [reportType, reportOptions, loading, error]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReport(reportOptions);
      if (result.success) {
        setGeneratedReport(result.data);
      } else {
        console.error('Report generation error:', result.error);
        alert(`Hisobot yaratishda xato: ${result.error}`);
      }
    } catch (error) {
      console.error('Report generation error:', error);
      alert(`Hisobot yaratishda xato: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = async (format) => {
    if (!generatedReport) return;

    try {
      let content, filename, mimeType;

      if (format === 'csv') {
        content = generateCSVContent();
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'json') {
        content = JSON.stringify(generatedReport, null, 2);
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export xato: ${error.message}`);
    }
  };

  const generateCSVContent = () => {
    if (!generatedReport) return '';

    const headers = [
      'Book ID',
      'Title',
      'Author',
      'Current Stock',
      'Min Stock Level',
      'Stock Status',
      'Price',
      'Stock Value',
      'Last Updated'
    ];

    const rows = generatedReport.books.map(book => [
      book.id,
      `"${book.title}"`,
      `"${book.author}"`,
      book.stock || 0,
      book.minStockLevel || 5,
      book.stockStatus,
      book.price || 0,
      (book.stock || 0) * (book.price || 0),
      book.updatedAt ? new Date(book.updatedAt).toISOString() : ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getReorderSuggestions = () => {
    if (!generatedReport) return [];

    return generatedReport.books
      .filter(book => {
        const stock = book.stock || 0;
        const minLevel = book.minStockLevel || 5;
        const avgSales = book.averageSalesPerDay || 0;
        
        // Suggest reorder if stock is low or will run out soon
        return stock <= minLevel || (avgSales > 0 && stock / avgSales <= 7); // 7 days supply
      })
      .map(book => {
        const stock = book.stock || 0;
        const minLevel = book.minStockLevel || 5;
        const maxLevel = book.maxStockLevel || minLevel * 4;
        const avgSales = book.averageSalesPerDay || 1;
        
        // Calculate suggested reorder quantity
        const suggestedQuantity = Math.max(
          maxLevel - stock, // Fill to max level
          avgSales * 30 // 30 days supply
        );

        const daysUntilStockout = avgSales > 0 ? Math.floor(stock / avgSales) : Infinity;

        return {
          ...book,
          suggestedQuantity: Math.round(suggestedQuantity),
          daysUntilStockout,
          priority: stock === 0 ? 'critical' : 
                   daysUntilStockout <= 3 ? 'high' : 
                   daysUntilStockout <= 7 ? 'medium' : 'low'
        };
      })
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  };

  const getStockMovementAnalysis = () => {
    if (!generatedReport) return null;

    const books = generatedReport.books;
    const totalBooks = books.length;
    
    // Categorize books by movement
    const fastMoving = books.filter(book => (book.averageSalesPerDay || 0) > 1);
    const slowMoving = books.filter(book => {
      const avgSales = book.averageSalesPerDay || 0;
      return avgSales > 0 && avgSales <= 0.2; // Less than 1 sale per 5 days
    });
    const deadStock = books.filter(book => (book.averageSalesPerDay || 0) === 0);

    return {
      fastMoving: {
        count: fastMoving.length,
        percentage: totalBooks > 0 ? (fastMoving.length / totalBooks) * 100 : 0,
        totalValue: fastMoving.reduce((sum, book) => sum + ((book.stock || 0) * (book.price || 0)), 0)
      },
      slowMoving: {
        count: slowMoving.length,
        percentage: totalBooks > 0 ? (slowMoving.length / totalBooks) * 100 : 0,
        totalValue: slowMoving.reduce((sum, book) => sum + ((book.stock || 0) * (book.price || 0)), 0)
      },
      deadStock: {
        count: deadStock.length,
        percentage: totalBooks > 0 ? (deadStock.length / totalBooks) * 100 : 0,
        totalValue: deadStock.reduce((sum, book) => sum + ((book.stock || 0) * (book.price || 0)), 0)
      }
    };
  };

  if (loading) {
    return (
      <div className="inventory-reports-loading">
        <div className="loading-spinner"></div>
        <p>Inventory ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-reports-error">
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

  const reorderSuggestions = getReorderSuggestions();
  const movementAnalysis = getStockMovementAnalysis();

  return (
    <div className="inventory-reports">
      {/* Header */}
      <div className="reports-header">
        <div className="header-info">
          <h2>
            <i className="fas fa-chart-line"></i>
            Inventory Hisobotlari
          </h2>
          <p>Batafsil inventory analytics va hisobotlar</p>
        </div>
        
        <div className="header-actions">
          <button
            className="export-btn"
            onClick={() => setShowExportModal(true)}
            disabled={!generatedReport}
          >
            <i className="fas fa-download"></i>
            Export
          </button>
          <button
            className="refresh-btn"
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Yangilanmoqda...
              </>
            ) : (
              <>
                <i className="fas fa-sync"></i>
                Yangilash
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Options */}
      <div className="report-options">
        <div className="option-group">
          <label>Hisobot turi:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="summary">Umumiy ko'rinish</option>
            <option value="detailed">Batafsil hisobot</option>
            <option value="movement">Stock harakati</option>
            <option value="forecast">Prognoz va tavsiyalar</option>
          </select>
        </div>

        <div className="option-group">
          <label>Saralash:</label>
          <select
            value={reportOptions.sortBy}
            onChange={(e) => setReportOptions(prev => ({ ...prev, sortBy: e.target.value }))}
          >
            <option value="stock">Stock bo'yicha</option>
            <option value="value">Qiymat bo'yicha</option>
            <option value="title">Nom bo'yicha</option>
            <option value="updated">Yangilanish bo'yicha</option>
          </select>
        </div>

        <div className="option-group">
          <label>Tartib:</label>
          <select
            value={reportOptions.sortOrder}
            onChange={(e) => setReportOptions(prev => ({ ...prev, sortOrder: e.target.value }))}
          >
            <option value="asc">O'sish tartibida</option>
            <option value="desc">Kamayish tartibida</option>
          </select>
        </div>

        <div className="option-group">
          <label>
            <input
              type="checkbox"
              checked={reportOptions.includeOutOfStock}
              onChange={(e) => setReportOptions(prev => ({ ...prev, includeOutOfStock: e.target.checked }))}
            />
            Tugagan kitoblarni qo'shish
          </label>
        </div>

        <div className="option-group">
          <label>
            <input
              type="checkbox"
              checked={reportOptions.includeDiscontinued}
              onChange={(e) => setReportOptions(prev => ({ ...prev, includeDiscontinued: e.target.checked }))}
            />
            To'xtatilgan kitoblarni qo'shish
          </label>
        </div>
      </div>

      {/* Report Content */}
      {generatedReport && (
        <div className="report-content">
          {/* Summary Report */}
          {reportType === 'summary' && (
            <div className="summary-report">
              <div className="summary-cards">
                <div className="summary-card">
                  <div className="card-icon">
                    <i className="fas fa-book"></i>
                  </div>
                  <div className="card-content">
                    <h3>{generatedReport.summary.totalBooks}</h3>
                    <p>Jami kitoblar</p>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="card-icon">
                    <i className="fas fa-cubes"></i>
                  </div>
                  <div className="card-content">
                    <h3>{generatedReport.summary.totalStock}</h3>
                    <p>Jami stock</p>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="card-icon">
                    <i className="fas fa-dollar-sign"></i>
                  </div>
                  <div className="card-content">
                    <h3>{formatCurrency(generatedReport.summary.totalValue)}</h3>
                    <p>Jami qiymat</p>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="card-icon">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div className="card-content">
                    <h3>{generatedReport.summary.categories.lowStock + generatedReport.summary.categories.outOfStock}</h3>
                    <p>Ogohlantirishlar</p>
                  </div>
                </div>
              </div>

              <div className="category-breakdown">
                <h3>Stock kategoriyalari</h3>
                <div className="category-chart">
                  {Object.entries(generatedReport.summary.categories).map(([category, count]) => {
                    const percentage = generatedReport.summary.totalBooks > 0 ? 
                      (count / generatedReport.summary.totalBooks) * 100 : 0;
                    
                    const categoryLabels = {
                      inStock: 'Mavjud',
                      lowStock: 'Kam qolgan',
                      outOfStock: 'Tugagan',
                      preOrder: 'Pre-order',
                      discontinued: 'To\'xtatilgan'
                    };

                    const categoryColors = {
                      inStock: '#10b981',
                      lowStock: '#f59e0b',
                      outOfStock: '#ef4444',
                      preOrder: '#3b82f6',
                      discontinued: '#6b7280'
                    };

                    return (
                      <div key={category} className="category-item">
                        <div className="category-info">
                          <div 
                            className="category-color"
                            style={{ backgroundColor: categoryColors[category] }}
                          ></div>
                          <span className="category-label">{categoryLabels[category]}</span>
                          <span className="category-count">{count}</span>
                          <span className="category-percentage">({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="category-bar">
                          <div 
                            className="category-fill"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: categoryColors[category]
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Movement Analysis Report */}
          {reportType === 'movement' && movementAnalysis && (
            <div className="movement-report">
              <h3>Stock Harakati Tahlili</h3>
              
              <div className="movement-cards">
                <div className="movement-card fast">
                  <div className="card-header">
                    <i className="fas fa-rocket"></i>
                    <h4>Tez sotiluvchi</h4>
                  </div>
                  <div className="card-stats">
                    <div className="stat">
                      <span className="label">Kitoblar:</span>
                      <span className="value">{movementAnalysis.fastMoving.count}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Foiz:</span>
                      <span className="value">{movementAnalysis.fastMoving.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="stat">
                      <span className="label">Qiymat:</span>
                      <span className="value">{formatCurrency(movementAnalysis.fastMoving.totalValue)}</span>
                    </div>
                  </div>
                </div>

                <div className="movement-card slow">
                  <div className="card-header">
                    <i className="fas fa-turtle"></i>
                    <h4>Sekin sotiluvchi</h4>
                  </div>
                  <div className="card-stats">
                    <div className="stat">
                      <span className="label">Kitoblar:</span>
                      <span className="value">{movementAnalysis.slowMoving.count}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Foiz:</span>
                      <span className="value">{movementAnalysis.slowMoving.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="stat">
                      <span className="label">Qiymat:</span>
                      <span className="value">{formatCurrency(movementAnalysis.slowMoving.totalValue)}</span>
                    </div>
                  </div>
                </div>

                <div className="movement-card dead">
                  <div className="card-header">
                    <i className="fas fa-skull"></i>
                    <h4>O'lik stock</h4>
                  </div>
                  <div className="card-stats">
                    <div className="stat">
                      <span className="label">Kitoblar:</span>
                      <span className="value">{movementAnalysis.deadStock.count}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Foiz:</span>
                      <span className="value">{movementAnalysis.deadStock.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="stat">
                      <span className="label">Qiymat:</span>
                      <span className="value">{formatCurrency(movementAnalysis.deadStock.totalValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Forecast and Recommendations */}
          {reportType === 'forecast' && (
            <div className="forecast-report">
              <h3>Prognoz va Tavsiyalar</h3>
              
              {reorderSuggestions.length > 0 ? (
                <div className="reorder-suggestions">
                  <h4>Qayta buyurtma tavsiyalari ({reorderSuggestions.length})</h4>
                  
                  <div className="suggestions-list">
                    {reorderSuggestions.slice(0, 20).map(book => (
                      <div key={book.id} className={`suggestion-item ${book.priority}`}>
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
                            <h5>{book.title}</h5>
                            <p>{book.author}</p>
                          </div>
                        </div>

                        <div className="suggestion-stats">
                          <div className="stat">
                            <span className="label">Hozirgi stock:</span>
                            <span className="value">{book.stock || 0}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Tavsiya miqdor:</span>
                            <span className="value suggested">{book.suggestedQuantity}</span>
                          </div>
                          <div className="stat">
                            <span className="label">Tugash muddati:</span>
                            <span className="value">
                              {book.daysUntilStockout === Infinity ? 
                                'Noma\'lum' : 
                                `${book.daysUntilStockout} kun`
                              }
                            </span>
                          </div>
                        </div>

                        <div className="priority-badge">
                          <span className={`badge ${book.priority}`}>
                            {book.priority === 'critical' && 'Kritik'}
                            {book.priority === 'high' && 'Yuqori'}
                            {book.priority === 'medium' && 'O\'rta'}
                            {book.priority === 'low' && 'Past'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-suggestions">
                  <i className="fas fa-check-circle"></i>
                  <h4>Qayta buyurtma tavsiyalari yo'q</h4>
                  <p>Barcha kitoblar stock holati yaxshi!</p>
                </div>
              )}
            </div>
          )}

          {/* Detailed Report */}
          {reportType === 'detailed' && (
            <div className="detailed-report">
              <h3>Batafsil Hisobot ({generatedReport.books.length} kitob)</h3>
              
              <div className="books-table">
                <table>
                  <thead>
                    <tr>
                      <th>Kitob</th>
                      <th>Muallif</th>
                      <th>Stock</th>
                      <th>Holat</th>
                      <th>Narx</th>
                      <th>Qiymat</th>
                      <th>Min Level</th>
                      <th>Oxirgi yangilanish</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedReport.books.slice(0, 100).map(book => {
                      const stockValue = (book.stock || 0) * (book.price || 0);
                      
                      return (
                        <tr key={book.id}>
                          <td>
                            <div className="book-cell">
                              <div className="book-image">
                                {book.imageUrl ? (
                                  <img src={book.imageUrl} alt={book.title} />
                                ) : (
                                  <div className="no-image">
                                    <i className="fas fa-book"></i>
                                  </div>
                                )}
                              </div>
                              <div className="book-info">
                                <h5>{book.title}</h5>
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
                          <td>{book.minStockLevel || 5}</td>
                          <td>
                            {book.updatedAt ? 
                              new Date(book.updatedAt).toLocaleDateString('uz-UZ') : 
                              'Noma\'lum'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {generatedReport.books.length > 100 && (
                  <div className="table-footer">
                    <p>Faqat birinchi 100 ta kitob ko'rsatilgan. To'liq hisobotni export qiling.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="export-modal">
            <div className="modal-header">
              <h3>Hisobotni Export qilish</h3>
              <button
                className="close-btn"
                onClick={() => setShowExportModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-content">
              <p>Hisobotni qaysi formatda export qilmoqchisiz?</p>
              
              <div className="export-options">
                <button
                  className="export-option"
                  onClick={() => handleExportReport('csv')}
                >
                  <i className="fas fa-file-csv"></i>
                  <span>CSV Format</span>
                  <small>Excel va boshqa dasturlarda ochish uchun</small>
                </button>
                
                <button
                  className="export-option"
                  onClick={() => handleExportReport('json')}
                >
                  <i className="fas fa-file-code"></i>
                  <span>JSON Format</span>
                  <small>Dasturlash va API integratsiya uchun</small>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryReports;