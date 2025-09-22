import React, { useState, useEffect, useCallback } from 'react';
import { BooksAdmin, FirebaseQuery } from '../utils/firebaseAdmin';
import { toastMessages, toast } from '../utils/toastUtils';
import { 
    STOCK_STATUS, 
    getStockStatus, 
    getStockStatusColor, 
    getStockStatusText,
    updateStock,
    bulkUpdateStock,
    getLowStockAlerts,
    getInventoryStats
} from '../utils/inventoryUtils';
import BookStatusManager from './BookStatusManager';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

function AdminInventoryManagement() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [stats, setStats] = useState({});
    const [selectedBooks, setSelectedBooks] = useState([]);
    const [bulkStock, setBulkStock] = useState('');
    const [showBulkUpdate, setShowBulkUpdate] = useState(false);
    const [selectedBookForStatus, setSelectedBookForStatus] = useState(null);

    // Kitoblarni yuklash
    const fetchBooks = useCallback(async () => {
        setLoading(true);
        try {
            const queries = [];
            
            if (searchTerm) {
                queries.push(Query.search('title', searchTerm));
            }
            
            if (filterStatus !== 'all') {
                queries.push(Query.equal('stockStatus', filterStatus));
            }
            
            queries.push(Query.limit(100));
            queries.push(Query.orderDesc('$updatedAt'));
            
            const response = await databases.listDocuments(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                queries
            );
            
            setBooks(response.documents);
            setStats(getInventoryStats(response.documents));
            
        } catch (error) {
            console.error('Kitoblarni yuklashda xato:', error);
            toast.error('Kitoblarni yuklashda xato yuz berdi');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterStatus]);

    useEffect(() => {
        fetchBooks();
    }, [fetchBooks]);

    // Stock yangilash
    const handleStockUpdate = async (bookId, newStock, reason = 'Manual update') => {
        try {
            await updateStock(databases, bookId, parseInt(newStock), reason);
            toast.success('Stock muvaffaqiyatli yangilandi');
            fetchBooks();
        } catch (error) {
            toast.error('Stock yangilashda xato yuz berdi');
        }
    };

    // Bulk stock update
    const handleBulkUpdate = async () => {
        if (selectedBooks.length === 0 || !bulkStock) {
            toast.warning('Kitoblar va stock miqdorini tanlang');
            return;
        }

        try {
            const updates = selectedBooks.map(bookId => ({
                bookId,
                stock: parseInt(bulkStock),
                reason: 'Bulk update'
            }));

            const results = await bulkUpdateStock(databases, updates);
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            toast.success(`${successful} ta kitob yangilandi${failed > 0 ? `, ${failed} ta xato` : ''}`);
            
            setSelectedBooks([]);
            setBulkStock('');
            setShowBulkUpdate(false);
            fetchBooks();
            
        } catch (error) {
            toast.error('Bulk update`da xato yuz berdi');
        }
    };

    // Low stock alerts
    const lowStockAlerts = getLowStockAlerts(books);

    return (
        <div className="admin-inventory-management">
            {/* Header */}
            <div className="inventory-header">
                <div>
                    <h1 className="inventory-title">
                        <i className="fas fa-boxes"></i>
                        Inventory Boshqaruvi
                    </h1>
                    <div className="inventory-stats">
                        <div className="stat-card">
                            <span className="stat-label">Jami kitoblar:</span>
                            <span className="stat-value">{stats.total || 0}</span>
                        </div>
                        <div className="stat-card success">
                            <span className="stat-label">Mavjud:</span>
                            <span className="stat-value">{stats.inStock || 0}</span>
                        </div>
                        <div className="stat-card warning">
                            <span className="stat-label">Kam qolgan:</span>
                            <span className="stat-value">{stats.lowStock || 0}</span>
                        </div>
                        <div className="stat-card danger">
                            <span className="stat-label">Tugagan:</span>
                            <span className="stat-value">{stats.outOfStock || 0}</span>
                        </div>
                    </div>
                </div>
                
                <div className="inventory-actions">
                    <button 
                        className="admin-btn primary-btn"
                        onClick={() => setShowBulkUpdate(!showBulkUpdate)}
                        disabled={selectedBooks.length === 0}
                    >
                        <i className="fas fa-edit"></i>
                        Bulk Update ({selectedBooks.length})
                    </button>
                </div>
            </div>

            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
                <div className="low-stock-alerts">
                    <h3>
                        <i className="fas fa-exclamation-triangle"></i>
                        Kam qolgan kitoblar ({lowStockAlerts.length})
                    </h3>
                    <div className="alert-list">
                        {lowStockAlerts.slice(0, 5).map(book => (
                            <div key={book.$id} className="alert-item">
                                <span className="book-title">{book.title}</span>
                                <span className="stock-info" style={{ color: getStockStatusColor(book.stockStatus) }}>
                                    {getStockStatusText(book.stockStatus, book.stock)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="inventory-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Kitob nomini qidirish..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <i className="fas fa-search"></i>
                </div>

                <select
                    className="admin-select status-filter"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">Barcha statuslar</option>
                    <option value={STOCK_STATUS.IN_STOCK}>Mavjud</option>
                    <option value={STOCK_STATUS.LOW_STOCK}>Kam qolgan</option>
                    <option value={STOCK_STATUS.OUT_OF_STOCK}>Tugagan</option>
                    <option value={STOCK_STATUS.PRE_ORDER}>Oldindan buyurtma</option>
                    <option value={STOCK_STATUS.COMING_SOON}>Tez orada keladi</option>
                    <option value={STOCK_STATUS.DISCONTINUED}>Ishlab chiqarilmaydi</option>
                </select>
            </div>

            {/* Bulk Update Panel */}
            {showBulkUpdate && (
                <div className="bulk-update-panel">
                    <h3>Bulk Stock Update</h3>
                    <div className="bulk-controls">
                        <input
                            type="number"
                            placeholder="Yangi stock miqdori"
                            value={bulkStock}
                            onChange={(e) => setBulkStock(e.target.value)}
                            min="0"
                        />
                        <button 
                            className="admin-btn success-btn"
                            onClick={handleBulkUpdate}
                        >
                            {selectedBooks.length} ta kitobni yangilash
                        </button>
                        <button 
                            className="admin-btn secondary-btn"
                            onClick={() => {
                                setShowBulkUpdate(false);
                                setSelectedBooks([]);
                                setBulkStock('');
                            }}
                        >
                            Bekor qilish
                        </button>
                    </div>
                </div>
            )}

            {/* Books Table */}
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Inventory yuklanmoqda...</p>
                </div>
            ) : (
                <div className="inventory-table-container">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedBooks(books.map(book => book.$id));
                                            } else {
                                                setSelectedBooks([]);
                                            }
                                        }}
                                        checked={selectedBooks.length === books.length && books.length > 0}
                                    />
                                </th>
                                <th>Kitob</th>
                                <th>Hozirgi Stock</th>
                                <th>Status</th>
                                <th>Min/Max</th>
                                <th>Oxirgi to'ldirilgan</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.map(book => (
                                <tr key={book.$id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedBooks.includes(book.$id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedBooks([...selectedBooks, book.$id]);
                                                } else {
                                                    setSelectedBooks(selectedBooks.filter(id => id !== book.$id));
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="book-info">
                                        <div className="book-title">{book.title}</div>
                                        <div className="book-author">{book.author?.name || book.authorName}</div>
                                    </td>
                                    <td>
                                        <StockInput
                                            bookId={book.$id}
                                            currentStock={book.stock || 0}
                                            onUpdate={handleStockUpdate}
                                        />
                                    </td>
                                    <td>
                                        <span 
                                            className="status-badge"
                                            style={{ 
                                                backgroundColor: getStockStatusColor(book.stockStatus),
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            {getStockStatusText(book.stockStatus, book.stock)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="min-max-info">
                                            <span>Min: {book.minStockLevel || 2}</span>
                                            <span>Max: {book.maxStockLevel || 50}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {book.lastRestocked ? 
                                            new Date(book.lastRestocked).toLocaleDateString('uz-UZ') : 
                                            'Noma\'lum'
                                        }
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn restock-btn"
                                                onClick={() => handleStockUpdate(book.$id, (book.stock || 0) + 10, 'Restock +10')}
                                                title="10 ta qo'shish"
                                            >
                                                <i className="fas fa-plus"></i>
                                            </button>
                                            <button
                                                className="action-btn sold-btn"
                                                onClick={() => handleStockUpdate(book.$id, Math.max(0, (book.stock || 0) - 1), 'Sold -1')}
                                                title="1 ta sotildi"
                                            >
                                                <i className="fas fa-minus"></i>
                                            </button>
                                            <button
                                                className="action-btn status-btn"
                                                onClick={() => setSelectedBookForStatus(book)}
                                                title="Status boshqaruvi"
                                            >
                                                <i className="fas fa-cog"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Book Status Manager Modal */}
            {selectedBookForStatus && (
                <div className="modal-overlay" onClick={() => setSelectedBookForStatus(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <BookStatusManager 
                            book={selectedBookForStatus}
                            onUpdate={(updatedBook) => {
                                // Update book in the list
                                setBooks(books.map(b => 
                                    b.$id === updatedBook.$id ? updatedBook : b
                                ));
                                setSelectedBookForStatus(null);
                            }}
                        />
                        <button 
                            className="modal-close"
                            onClick={() => setSelectedBookForStatus(null)}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Stock Input Component
const StockInput = ({ bookId, currentStock, onUpdate }) => {
    const [stock, setStock] = useState(currentStock);
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        if (stock !== currentStock) {
            onUpdate(bookId, stock, 'Manual adjustment');
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setStock(currentStock);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="stock-input-group">
                <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    min="0"
                    className="stock-input"
                    autoFocus
                />
                <button onClick={handleSave} className="save-btn">
                    <i className="fas fa-check"></i>
                </button>
                <button onClick={handleCancel} className="cancel-btn">
                    <i className="fas fa-times"></i>
                </button>
            </div>
        );
    }

    return (
        <div className="stock-display" onClick={() => setIsEditing(true)}>
            <span className="stock-number">{currentStock}</span>
            <i className="fas fa-edit edit-icon"></i>
        </div>
    );
};

export default AdminInventoryManagement;