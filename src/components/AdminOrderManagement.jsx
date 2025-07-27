import React, { useState, useEffect } from 'react';
import { databases, Query } from '../appwriteConfig';
import { toastMessages, toast } from '../utils/toastUtils';
import { highlightText } from '../utils/highlightText.jsx';
import siteConfig from '../config/siteConfig';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/pagination.css';
import '../styles/admin/modal.css';
import '../styles/admin/forms.css';

// Appwrite konsolidan olingan ID'lar
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ORDERS_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

function AdminOrderManagement() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalOrders, setTotalOrders] = useState(0);
    
    // Order details
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState({
        user: null,
        books: [],
        loading: false,
        error: null
    });
    
    // Status update
    const [showStatusUpdate, setShowStatusUpdate] = useState(false);
    const [orderToUpdate, setOrderToUpdate] = useState(null);
    const [newStatus, setNewStatus] = useState('');

    // Fetch orders using orderService
    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Import order service
            const { getAllOrders } = await import('../utils/orderService');
            
            const options = {
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage
            };
            
            if (filterStatus) {
                options.status = filterStatus;
            }
            
            const result = await getAllOrders(options);
            
            // Transform data for compatibility
            const ordersWithUserDetails = result.documents.map(order => ({
                ...order,
                userName: order.user.fullName,
                userEmail: order.user.email
            }));
            
            setOrders(ordersWithUserDetails);
            setTotalOrders(result.total);
            setLoading(false);
        } catch (err) {
            console.error("Buyurtmalarni yuklashda xato:", err);
            setError(err.message || "Buyurtmalarni yuklashda noma'lum xato yuz berdi.");
            setLoading(false);
        }
    };

    // Fetch orders when filters or pagination changes
    useEffect(() => {
        fetchOrders();
    }, [searchTerm, filterStatus, currentPage, itemsPerPage]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on new search
    };

    // Handle filter changes
    const handleStatusFilterChange = (e) => {
        setFilterStatus(e.target.value);
        setCurrentPage(1);
    };

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };
    
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    // Order details handlers
    const openOrderDetails = async (order) => {
        setSelectedOrder(order);
        setShowOrderDetails(true);
        
        setOrderDetails({
            user: order.user || null, // OrderService'dan kelgan user ma'lumotlari
            books: order.book ? [order.book] : [], // OrderService'dan kelgan book ma'lumotlari
            loading: false,
            error: null
        });
    };
    
    const closeOrderDetails = () => {
        setShowOrderDetails(false);
        setSelectedOrder(null);
    };

    // Status update handlers
    const openStatusUpdate = (order) => {
        setOrderToUpdate(order);
        setNewStatus(order.status || 'pending');
        setShowStatusUpdate(true);
    };
    
    const closeStatusUpdate = () => {
        setShowStatusUpdate(false);
        setOrderToUpdate(null);
    };
    
    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        
        try {
            // OrderService'ni ishlatish
            const { updateOrderStatus } = await import('../utils/orderService');
            
            await updateOrderStatus(orderToUpdate.$id, newStatus);
            
            // Close modal and refresh orders
            closeStatusUpdate();
            fetchOrders();
            
        } catch (err) {
            console.error("Buyurtma holatini yangilashda xato:", err);
            toast.error(`Buyurtma holatini yangilashda xato: ${err.message}`);
        }
    };

    // Create sample orders for testing
    const createSampleOrders = async () => {
        if (!confirm('Test buyurtmalarini yaratishni xohlaysizmi?')) {
            return;
        }

        setLoading(true);
        try {
            const { createSampleOrders: createSampleOrdersUtil } = await import('../utils/orderService');
            await createSampleOrdersUtil();
            toastMessages.testOrdersCreated();
            fetchOrders(); // Refresh the list
        } catch (err) {
            console.error('Test buyurtmalarini yaratishda xato:', err);
            toast.error(`Xato: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(totalOrders / itemsPerPage);
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'pending':
                return 'pending';
            case 'processing':
                return 'processing';
            case 'completed':
                return 'completed';
            case 'cancelled':
                return 'cancelled';
            default:
                return 'pending';
        }
    };

    // Get status text
    const getStatusText = (status) => {
        switch (status) {
            case 'pending':
                return 'Kutilmoqda';
            case 'processing':
                return 'Jarayonda';
            case 'completed':
                return 'Yakunlangan';
            case 'cancelled':
                return 'Bekor qilingan';
            default:
                return 'Kutilmoqda';
        }
    };

    return (
        <div className="admin-order-management" style={{ marginTop: `${siteConfig.layout.contentSpacing}px` }}>
            {/* Filters and Search */}
            <div className="admin-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Buyurtma ID bo'yicha qidirish..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        title="Lotin va kiril alifbolarida qidirish mumkin"
                    />
                    <i className="fas fa-search"></i>
                    {searchTerm && (
                        <button 
                            className="clear-search" 
                            onClick={() => {
                                setSearchTerm('');
                                setCurrentPage(1);
                            }}
                            title="Qidiruvni tozalash"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
                
                <div className="filter-group">
                    <select
                        value={filterStatus}
                        onChange={handleStatusFilterChange}
                    >
                        <option value="">Barcha holatlar</option>
                        <option value="pending">Kutilmoqda</option>
                        <option value="processing">Jarayonda</option>
                        <option value="completed">Yakunlangan</option>
                        <option value="cancelled">Bekor qilingan</option>
                    </select>
                </div>
                
                <div className="admin-actions">
                    <button 
                        className="admin-btn primary-btn"
                        onClick={createSampleOrders}
                        disabled={loading}
                    >
                        <i className="fas fa-plus"></i>
                        Test buyurtmalari
                    </button>
                </div>
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="admin-loading">Yuklanmoqda...</div>
            ) : error ? (
                <div className="admin-error">Xato: {error}</div>
            ) : (
                <>
                    <div className="admin-table-container">
                        <table className="admin-table orders-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Sana</th>
                                    <th>Foydalanuvchi</th>
                                    <th>Miqdor</th>
                                    <th>Narx</th>
                                    <th>Holat</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length > 0 ? (
                                    orders.map(order => (
                                        <tr key={order.$id}>
                                            <td>{searchTerm ? highlightText(`#${order.$id.substring(0, 8)}`, searchTerm) : `#${order.$id.substring(0, 8)}`}</td>
                                            <td>{formatDate(order.$createdAt)}</td>
                                            <td className="order-user">
                                                <div className="user-name">
                                                    {searchTerm ? highlightText(order.userName || 'Noma\'lum', searchTerm) : (order.userName || 'Noma\'lum')}
                                                </div>
                                                {order.userEmail && (
                                                    <div className="user-email">
                                                        {order.userEmail}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{order.quantity || 1}</td>
                                            <td className="order-price">
                                                {(order.priceAtTimeOfOrder || 0).toLocaleString()} so'm
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                                                    {getStatusText(order.status)}
                                                </span>
                                            </td>
                                            <td className="order-actions">
                                                <button 
                                                    className="action-btn view-btn" 
                                                    onClick={() => openOrderDetails(order)}
                                                    title="Ko'rish"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button 
                                                    className="action-btn edit-btn" 
                                                    onClick={() => openStatusUpdate(order)}
                                                    title="Holatni yangilash"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="no-data">Buyurtmalar topilmadi</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="admin-pagination">
                        <div className="pagination-info">
                            Jami: {totalOrders} ta buyurtma, 
                            <select 
                                value={itemsPerPage} 
                                onChange={handleItemsPerPageChange}
                                className="items-per-page"
                            >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                            tadan
                        </div>
                        
                        <div className="pagination-controls">
                            <button 
                                className="pagination-btn" 
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            
                            {pageNumbers.map(number => (
                                <button
                                    key={number}
                                    className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                                    onClick={() => handlePageChange(number)}
                                >
                                    {number}
                                </button>
                            ))}
                            
                            <button 
                                className="pagination-btn" 
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Order Details Modal */}
            {showOrderDetails && (
                <div className="admin-modal">
                    <div className="admin-modal-content">
                        <div className="admin-modal-header">
                            <h3>Buyurtma tafsilotlari</h3>
                            <button className="close-btn" onClick={closeOrderDetails}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="admin-modal-body">
                            {orderDetails.loading ? (
                                <div className="admin-loading">Yuklanmoqda...</div>
                            ) : orderDetails.error ? (
                                <div className="admin-error">Xato: {orderDetails.error}</div>
                            ) : (
                                <div className="order-details">
                                    <div className="order-info-section">
                                        <h4>Buyurtma ma'lumotlari</h4>
                                        <div className="order-info-grid">
                                            <div className="order-info-item">
                                                <span className="info-label">Buyurtma ID:</span>
                                                <span className="info-value">#{selectedOrder.$id}</span>
                                            </div>
                                            <div className="order-info-item">
                                                <span className="info-label">Sana:</span>
                                                <span className="info-value">{formatDate(selectedOrder.$createdAt)}</span>
                                            </div>
                                            <div className="order-info-item">
                                                <span className="info-label">Holat:</span>
                                                <span className={`status-badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                                                    {getStatusText(selectedOrder.status)}
                                                </span>
                                            </div>
                                            <div className="order-info-item">
                                                <span className="info-label">Jami narx:</span>
                                                <span className="info-value order-price">
                                                    {(selectedOrder.priceAtTimeOfOrder || 0).toLocaleString()} so'm
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="order-info-section">
                                        <h4>Foydalanuvchi ma'lumotlari</h4>
                                        {orderDetails.user ? (
                                            <div className="order-info-grid">
                                                <div className="order-info-item">
                                                    <span className="info-label">Ism:</span>
                                                    <span className="info-value">{orderDetails.user.fullName || orderDetails.user.name || 'Noma\'lum'}</span>
                                                </div>
                                                <div className="order-info-item">
                                                    <span className="info-label">Email:</span>
                                                    <span className="info-value">{orderDetails.user.email || 'Noma\'lum'}</span>
                                                </div>
                                                <div className="order-info-item">
                                                    <span className="info-label">Telefon:</span>
                                                    <span className="info-value">{orderDetails.user.phone || 'Noma\'lum'}</span>
                                                </div>
                                                <div className="order-info-item">
                                                    <span className="info-label">Manzil:</span>
                                                    <span className="info-value">{orderDetails.user.address || 'Noma\'lum'}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p>Foydalanuvchi ma'lumotlari mavjud emas</p>
                                        )}
                                    </div>
                                    
                                    <div className="order-info-section">
                                        <h4>Buyurtma qilingan kitoblar</h4>
                                        {orderDetails.books.length > 0 ? (
                                            <table className="admin-table books-table">
                                                <thead>
                                                    <tr>
                                                        <th>Rasm</th>
                                                        <th>Sarlavha</th>
                                                        <th>Miqdor</th>
                                                        <th>Narx</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {orderDetails.books.map(book => (
                                                        <tr key={book.$id}>
                                                            <td className="book-image">
                                                                <img
                                                                    src={book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                                                                    alt={book.title}
                                                                />
                                                            </td>
                                                            <td>{book.title}</td>
                                                            <td>{selectedOrder.quantity || 1}</td>
                                                            <td className="book-price">
                                                                {(selectedOrder.priceAtTimeOfOrder || book.price || 0).toLocaleString()} so'm
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p>Kitob ma'lumotlari mavjud emas</p>
                                        )}
                                    </div>
                                    
                                    <div className="form-actions">
                                        <button className="cancel-btn" onClick={closeOrderDetails}>
                                            Yopish
                                        </button>
                                        <button className="submit-btn" onClick={() => {
                                            closeOrderDetails();
                                            openStatusUpdate(selectedOrder);
                                        }}>
                                            Holatni yangilash
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {showStatusUpdate && (
                <div className="admin-modal">
                    <div className="admin-modal-content">
                        <div className="admin-modal-header">
                            <h3>Buyurtma holatini yangilash</h3>
                            <button className="close-btn" onClick={closeStatusUpdate}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="admin-modal-body">
                            <form onSubmit={handleStatusUpdate} className="admin-form">
                                <div className="form-group">
                                    <label htmlFor="status">Yangi holat</label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        required
                                    >
                                        <option value="pending">Kutilmoqda</option>
                                        <option value="processing">Jarayonda</option>
                                        <option value="completed">Yakunlangan</option>
                                        <option value="cancelled">Bekor qilingan</option>
                                    </select>
                                </div>
                                
                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={closeStatusUpdate}>
                                        Bekor qilish
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        Saqlash
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminOrderManagement;