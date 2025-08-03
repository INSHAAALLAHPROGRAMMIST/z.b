import React, { useState } from 'react';
import { databases } from '../appwriteConfig';
import { toast } from '../utils/toastUtils';
import { 
    STOCK_STATUS, 
    BOOK_VISIBILITY,
    getStockStatusColor, 
    getStockStatusText,
    formatRestockDate 
} from '../utils/inventoryUtils';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

function BookStatusManager({ book, onUpdate }) {
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const updateBookStatus = async (updates) => {
        setLoading(true);
        try {
            const updatedBook = await databases.updateDocument(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                book.$id,
                updates
            );
            
            toast.success('Kitob holati yangilandi');
            onUpdate && onUpdate(updatedBook);
            
        } catch (error) {
            console.error('Status yangilashda xato:', error);
            toast.error('Status yangilashda xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (newStatus) => {
        const updates = { stockStatus: newStatus };
        
        // Status'ga qarab automatic updates
        switch (newStatus) {
            case STOCK_STATUS.DISCONTINUED:
                updates.isAvailable = false;
                updates.visibility = book.showWhenDiscontinued ? BOOK_VISIBILITY.VISIBLE : BOOK_VISIBILITY.HIDDEN;
                break;
            case STOCK_STATUS.PRE_ORDER:
                updates.isPreOrder = true;
                updates.allowPreOrder = true;
                break;
            case STOCK_STATUS.COMING_SOON:
                updates.isAvailable = false;
                updates.allowPreOrder = true;
                break;
            case STOCK_STATUS.IN_STOCK:
                updates.isAvailable = true;
                updates.visibility = BOOK_VISIBILITY.VISIBLE;
                updates.isPreOrder = false;
                break;
        }
        
        updateBookStatus(updates);
    };

    const handleVisibilityChange = (visibility) => {
        const updates = { visibility };
        updateBookStatus(updates);
    };

    const handlePriorityChange = (priority) => {
        updateBookStatus({ adminPriority: parseInt(priority) || 0 });
    };

    const handleRestockDateChange = (date) => {
        updateBookStatus({ expectedRestockDate: date || null });
    };

    return (
        <div className="book-status-manager">
            <div className="status-header">
                <h3>
                    <i className="fas fa-cog"></i>
                    {book.title} - Status Boshqaruvi
                </h3>
                <button 
                    className="toggle-advanced"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                >
                    {showAdvanced ? 'Oddiy' : 'Kengaytirilgan'}
                </button>
            </div>

            {/* Current Status Display */}
            <div className="current-status">
                <div className="status-badge-large" style={{ 
                    backgroundColor: getStockStatusColor(book.stockStatus),
                    color: 'white'
                }}>
                    {getStockStatusText(book.stockStatus, book.stock)}
                </div>
                <div className="status-details">
                    <span>Stock: {book.stock || 0}</span>
                    <span>Visibility: {book.visibility || 'visible'}</span>
                    <span>Priority: {book.adminPriority || 0}</span>
                </div>
            </div>

            {/* Quick Status Change */}
            <div className="quick-status-change">
                <h4>Tez o'zgartirish:</h4>
                <div className="status-buttons">
                    {Object.values(STOCK_STATUS).map(status => (
                        <button
                            key={status}
                            className={`status-btn ${book.stockStatus === status ? 'active' : ''}`}
                            style={{ 
                                backgroundColor: book.stockStatus === status ? 
                                    getStockStatusColor(status) : 'transparent',
                                borderColor: getStockStatusColor(status),
                                color: book.stockStatus === status ? 'white' : getStockStatusColor(status)
                            }}
                            onClick={() => handleStatusChange(status)}
                            disabled={loading}
                        >
                            {getStockStatusText(status, 0).split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Advanced Controls */}
            {showAdvanced && (
                <div className="advanced-controls">
                    {/* Visibility Control */}
                    <div className="control-group">
                        <label>Ko'rinish:</label>
                        <select 
                            className="admin-select"
                            value={book.visibility || BOOK_VISIBILITY.VISIBLE}
                            onChange={(e) => handleVisibilityChange(e.target.value)}
                            disabled={loading}
                        >
                            <option value={BOOK_VISIBILITY.VISIBLE}>Ko'rinadigan</option>
                            <option value={BOOK_VISIBILITY.HIDDEN}>Yashirin</option>
                            <option value={BOOK_VISIBILITY.ADMIN_ONLY}>Faqat Admin</option>
                        </select>
                    </div>

                    {/* Admin Priority */}
                    <div className="control-group">
                        <label>Admin Priority (0-100):</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={book.adminPriority || 0}
                            onChange={(e) => handlePriorityChange(e.target.value)}
                            disabled={loading}
                        />
                        <small>Yuqori raqam = yuqori priority</small>
                    </div>

                    {/* Expected Restock Date */}
                    <div className="control-group">
                        <label>Kutilayotgan to'ldirilish sanasi:</label>
                        <input
                            type="date"
                            value={book.expectedRestockDate ? 
                                new Date(book.expectedRestockDate).toISOString().split('T')[0] : ''
                            }
                            onChange={(e) => handleRestockDateChange(e.target.value)}
                            disabled={loading}
                        />
                        {book.expectedRestockDate && (
                            <small>
                                {formatRestockDate(book.expectedRestockDate)}
                            </small>
                        )}
                    </div>

                    {/* Pre-order Settings */}
                    <div className="control-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={book.allowPreOrder || false}
                                onChange={(e) => updateBookStatus({ allowPreOrder: e.target.checked })}
                                disabled={loading}
                            />
                            Oldindan buyurtmaga ruxsat berish
                        </label>
                    </div>

                    {/* Waitlist Settings */}
                    <div className="control-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={book.enableWaitlist !== false}
                                onChange={(e) => updateBookStatus({ enableWaitlist: e.target.checked })}
                                disabled={loading}
                            />
                            Navbat tizimini yoqish
                        </label>
                    </div>

                    {/* Show when discontinued */}
                    <div className="control-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={book.showWhenDiscontinued || false}
                                onChange={(e) => updateBookStatus({ showWhenDiscontinued: e.target.checked })}
                                disabled={loading}
                            />
                            Ishlab chiqarilmagan holatda ham ko'rsatish
                        </label>
                    </div>

                    {/* Analytics Display */}
                    <div className="analytics-display">
                        <h4>Statistika:</h4>
                        <div className="analytics-grid">
                            <div className="analytics-item">
                                <span>Ko'rilgan:</span>
                                <strong>{book.viewCount || 0}</strong>
                            </div>
                            <div className="analytics-item">
                                <span>Sotilgan:</span>
                                <strong>{book.salesCount || 0}</strong>
                            </div>
                            <div className="analytics-item">
                                <span>Pre-order:</span>
                                <strong>{book.preOrderCount || 0}</strong>
                            </div>
                            <div className="analytics-item">
                                <span>Navbat:</span>
                                <strong>{book.waitlistCount || 0}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <span>Yangilanmoqda...</span>
                </div>
            )}
        </div>
    );
}

export default BookStatusManager;