import React, { useState, useEffect } from 'react';
import { OrdersAdmin, FirebaseQuery } from '../utils/firebaseAdmin';
import { toastMessages, toast } from '../utils/toastUtils';
import { highlightText } from '../utils/highlightText.jsx';
import TelegramIntegration from '../services/TelegramIntegration.js';
import NotificationSettingsService from '../services/NotificationSettingsService.js';
import siteConfig from '../config/siteConfig';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/pagination.css';
import '../styles/admin/modal.css';
import '../styles/admin/forms.css';
import '../styles/admin/notifications.css';

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
    
    // Notification settings
    const [notificationSettings, setNotificationSettings] = useState({
        enableTelegram: true,
        notifyOnNewOrder: true,
        notifyOnStatusChange: true,
        notifyOnLowStock: true
    });
    
    // Notification history
    const [showNotificationHistory, setShowNotificationHistory] = useState(false);
    const [notificationHistory, setNotificationHistory] = useState([]);
    const [notificationLoading, setNotificationLoading] = useState(false);

    // Load notification settings
    const loadNotificationSettings = async () => {
        try {
            const settings = await NotificationSettingsService.getSettings();
            setNotificationSettings({
                enableTelegram: settings.enableTelegram,
                notifyOnNewOrder: settings.notifyOnNewOrder,
                notifyOnStatusChange: settings.notifyOnStatusChange,
                notifyOnLowStock: settings.notifyOnLowStock
            });
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    };

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

    // Load settings and orders on component mount
    useEffect(() => {
        loadNotificationSettings();
        fetchOrders();
    }, []);

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
            
            // Send Telegram notification if enabled
            if (notificationSettings.enableTelegram && notificationSettings.notifyOnStatusChange) {
                try {
                    const notificationResult = await TelegramIntegration.handleOrderStatusChange(
                        orderToUpdate.$id, 
                        newStatus
                    );
                    
                    if (notificationResult.success) {
                        toast.success('Buyurtma holati yangilandi va bildirishnoma yuborildi');
                        
                        // Add to notification history
                        const historyEntry = {
                            orderId: orderToUpdate.$id,
                            type: 'status_change',
                            status: newStatus,
                            success: notificationResult.telegramSent,
                            message: `Buyurtma holati "${getStatusText(newStatus)}" ga o'zgartirildi`
                        };
                        
                        await NotificationSettingsService.addToHistory(historyEntry);
                        setNotificationHistory(prev => [historyEntry, ...prev.slice(0, 49)]); // Keep last 50
                    } else {
                        toast.warning('Buyurtma holati yangilandi, lekin bildirishnoma yuborilmadi');
                    }
                } catch (notificationError) {
                    console.warn('Telegram notification failed:', notificationError);
                    toast.warning('Buyurtma holati yangilandi, lekin bildirishnoma yuborilmadi');
                }
            } else {
                toast.success('Buyurtma holati yangilandi');
            }
            
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

    // Test Telegram connection
    const testTelegramConnection = async () => {
        setNotificationLoading(true);
        try {
            const result = await TelegramIntegration.testConnection();
            if (result.success) {
                toast.success(`Telegram bot ulandi: ${result.message}`);
            } else {
                toast.error(`Telegram bot ulanmadi: ${result.message || result.error}`);
            }
        } catch (error) {
            toast.error(`Telegram test xatosi: ${error.message}`);
        } finally {
            setNotificationLoading(false);
        }
    };

    // Toggle notification settings
    const toggleNotificationSetting = async (setting) => {
        const newValue = !notificationSettings[setting];
        
        setNotificationSettings(prev => ({
            ...prev,
            [setting]: newValue
        }));

        // Save to persistent storage
        try {
            await NotificationSettingsService.updateSetting(setting, newValue);
        } catch (error) {
            console.error('Error saving notification setting:', error);
            toast.error('Sozlamani saqlashda xato yuz berdi');
            
            // Revert the change
            setNotificationSettings(prev => ({
                ...prev,
                [setting]: !newValue
            }));
        }
    };

    // Load notification history
    const loadNotificationHistory = async () => {
        setNotificationLoading(true);
        try {
            const history = await NotificationSettingsService.getHistory();
            setNotificationHistory(history);
            setShowNotificationHistory(true);
        } catch (error) {
            toast.error(`Bildirishnoma tarixini yuklashda xato: ${error.message}`);
        } finally {
            setNotificationLoading(false);
        }
    };

    // Send test notification
    const sendTestNotification = async () => {
        setNotificationLoading(true);
        try {
            const testOrderData = {
                orderNumber: '#TEST-' + Date.now(),
                customer: {
                    name: 'Test Mijoz',
                    phone: '+998901234567',
                    email: 'test@example.com',
                    address: {
                        street: 'Test ko\'chasi',
                        city: 'Toshkent'
                    }
                },
                items: [{
                    title: 'Test Kitob',
                    quantity: 1,
                    price: 50000
                }],
                totalAmount: 50000,
                createdAt: new Date()
            };

            const result = await TelegramIntegration.telegramService.notifyNewOrder(testOrderData);
            
            if (result.success) {
                toast.success('Test bildirishnoma yuborildi');
                
                // Add to notification history
                const historyEntry = {
                    orderId: 'TEST',
                    type: 'test',
                    success: true,
                    message: 'Test bildirishnoma yuborildi'
                };
                
                await NotificationSettingsService.addToHistory(historyEntry);
                setNotificationHistory(prev => [historyEntry, ...prev.slice(0, 49)]);
            } else {
                toast.error(`Test bildirishnoma yuborilmadi: ${result.error}`);
            }
        } catch (error) {
            toast.error(`Test bildirishnoma xatosi: ${error.message}`);
        } finally {
            setNotificationLoading(false);
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
                        className="admin-select status-filter"
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
                    
                    <button 
                        className="admin-btn secondary-btn"
                        onClick={loadNotificationHistory}
                        disabled={notificationLoading}
                    >
                        <i className="fas fa-bell"></i>
                        Bildirishnomalar
                    </button>
                    
                    <button 
                        className="admin-btn info-btn"
                        onClick={testTelegramConnection}
                        disabled={notificationLoading}
                    >
                        <i className="fas fa-paper-plane"></i>
                        Telegram test
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
                                className="admin-select items-per-page"
                                value={itemsPerPage} 
                                onChange={handleItemsPerPageChange}
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
                    
                    {/* Notification Settings Panel */}
                    <div className="admin-card notification-settings">
                        <div className="card-header">
                            <h4>Bildirishnoma sozlamalari</h4>
                        </div>
                        <div className="card-content">
                            <div className="notification-controls">
                                <div className="notification-setting">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.enableTelegram}
                                            onChange={() => toggleNotificationSetting('enableTelegram')}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <span className="setting-label">Telegram bildirishnomalarini yoqish</span>
                                </div>
                                
                                <div className="notification-setting">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.notifyOnNewOrder}
                                            onChange={() => toggleNotificationSetting('notifyOnNewOrder')}
                                            disabled={!notificationSettings.enableTelegram}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <span className="setting-label">Yangi buyurtma haqida xabar berish</span>
                                </div>
                                
                                <div className="notification-setting">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.notifyOnStatusChange}
                                            onChange={() => toggleNotificationSetting('notifyOnStatusChange')}
                                            disabled={!notificationSettings.enableTelegram}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <span className="setting-label">Holat o'zgarishi haqida xabar berish</span>
                                </div>
                                
                                <div className="notification-setting">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.notifyOnLowStock}
                                            onChange={() => toggleNotificationSetting('notifyOnLowStock')}
                                            disabled={!notificationSettings.enableTelegram}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <span className="setting-label">Stok tugashi haqida xabar berish</span>
                                </div>
                            </div>
                            
                            <div className="notification-actions">
                                <button 
                                    className="admin-btn test-btn"
                                    onClick={sendTestNotification}
                                    disabled={notificationLoading || !notificationSettings.enableTelegram}
                                >
                                    {notificationLoading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Yuborilmoqda...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-paper-plane"></i>
                                            Test xabar yuborish
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Notification History Modal */}
            {showNotificationHistory && (
                <div className="admin-modal">
                    <div className="admin-modal-content large-modal">
                        <div className="admin-modal-header">
                            <h3>Bildirishnoma tarixi</h3>
                            <button className="close-btn" onClick={() => setShowNotificationHistory(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="admin-modal-body">
                            {notificationHistory.length > 0 ? (
                                <div className="notification-history">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Vaqt</th>
                                                <th>Buyurtma</th>
                                                <th>Turi</th>
                                                <th>Xabar</th>
                                                <th>Holat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {notificationHistory.map(entry => (
                                                <tr key={entry.id}>
                                                    <td>{formatDate(entry.timestamp)}</td>
                                                    <td>#{entry.orderId}</td>
                                                    <td>
                                                        <span className={`notification-type ${entry.type}`}>
                                                            {entry.type === 'status_change' ? 'Holat o\'zgarishi' :
                                                             entry.type === 'new_order' ? 'Yangi buyurtma' :
                                                             entry.type === 'test' ? 'Test' : entry.type}
                                                        </span>
                                                    </td>
                                                    <td>{entry.message}</td>
                                                    <td>
                                                        <span className={`status-badge ${entry.success ? 'completed' : 'cancelled'}`}>
                                                            {entry.success ? 'Yuborildi' : 'Xato'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="no-data">
                                    <i className="fas fa-bell-slash"></i>
                                    <p>Hali bildirishnoma tarixi yo'q</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
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
                                        className="admin-select"
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