import React, { useState, useEffect } from 'react';
import { prepareSearchText } from '../utils/transliteration';
import { highlightText } from '../utils/highlightText.jsx';
import { toastMessages, toast } from '../utils/toastUtils';
import siteConfig from '../config/siteConfig';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/pagination.css';
import '../styles/admin/modal.css';
import '../styles/admin/forms.css';

// Firebase imports
import firebaseService from '../services/FirebaseService';
import { formatFirebaseDate } from '../utils/firebaseHelpers';

function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalUsers, setTotalUsers] = useState(0);
    
    // User details
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState({
        orders: [],
        loading: false,
        error: null
    });
    
    // Role update
    const [showRoleUpdate, setShowRoleUpdate] = useState(false);
    const [userToUpdate, setUserToUpdate] = useState(null);
    const [newRole, setNewRole] = useState('');

    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const queries = [];
            
            // Add search with transliteration support
            if (searchTerm) {
                // Qidiruv so'rovini lotin va kiril alifbolarida tayyorlash
                const [searchTermLower, searchTermAlternate, searchTermXToH, searchTermHToX] = prepareSearchText(searchTerm);
                
                // Appwrite'da fulltext search imkoniyati cheklangan, shuning uchun
                // faqat asl qidiruv so'rovini ishlatamiz, qolgan variantlarni client-side filtering orqali qo'llaymiz
                queries.push(Query.search('fullName', searchTermLower));
                
                // Qo'shimcha qidiruv variantlari uchun limit oshiriladi
                queries.push(Query.limit(100)); // Ko'proq natijalarni olish
            } else {
                queries.push(Query.limit(itemsPerPage));
            }
            
            // Add role filter
            if (filterRole) {
                queries.push(Query.equal('role', filterRole));
            }
            
            // Add pagination
            queries.push(Query.limit(itemsPerPage));
            queries.push(Query.offset((currentPage - 1) * itemsPerPage));
            
            // Sort by creation date (newest first)
            queries.push(Query.orderDesc('$createdAt'));
            
            const response = await databases.listDocuments(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                queries
            );
            
            setUsers(response.documents);
            setTotalUsers(response.total);
            setLoading(false);
        } catch (err) {
            console.error("Foydalanuvchilarni yuklashda xato:", err);
            setError(err.message || "Foydalanuvchilarni yuklashda noma'lum xato yuz berdi.");
            setLoading(false);
        }
    };

    // Fetch users when filters or pagination changes
    useEffect(() => {
        fetchUsers();
    }, [searchTerm, filterRole, currentPage, itemsPerPage]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on new search
    };

    // Handle filter changes
    const handleRoleFilterChange = (e) => {
        setFilterRole(e.target.value);
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

    // Create sample users for testing
    const createSampleUsers = async () => {
        if (!confirm('Test foydalanuvchilarini yaratishni xohlaysizmi? Bu real auth userlar yaratadi.')) {
            return;
        }

        setLoading(true);
        try {
            // Import sample users utility
            const { createSampleUsers: createSampleUsersUtil } = await import('../utils/createSampleUsers');
            
            await createSampleUsersUtil();
            toast.success('Test foydalanuvchilari muvaffaqiyatli yaratildi!\n\nLogin ma\'lumotlari:\n- user1@test.com / password123\n- user2@test.com / password123\n- admin@test.com / admin123', 6000);
            fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Test foydalanuvchilarini yaratishda xato:', err);
            toast.error(`Xato: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // User details handlers
    const openUserDetails = async (user) => {
        setSelectedUser(user);
        setShowUserDetails(true);
        
        setUserDetails({
            orders: [],
            loading: true,
            error: null
        });
        
        try {
            // Fetch user's orders
            const ordersResponse = await databases.listDocuments(
                DATABASE_ID,
                ORDERS_COLLECTION_ID,
                [
                    Query.equal('users', user.$id),
                    Query.orderDesc('$createdAt'),
                    Query.limit(10)
                ]
            );
            
            setUserDetails({
                orders: ordersResponse.documents,
                loading: false,
                error: null
            });
            
        } catch (err) {
            console.error("Foydalanuvchi buyurtmalarini yuklashda xato:", err);
            setUserDetails(prev => ({
                ...prev,
                loading: false,
                error: err.message || "Ma'lumotlarni yuklashda xato yuz berdi"
            }));
        }
    };
    
    const closeUserDetails = () => {
        setShowUserDetails(false);
        setSelectedUser(null);
    };

    // Role update handlers
    const openRoleUpdate = (user) => {
        setUserToUpdate(user);
        setNewRole(user.role || 'user');
        setShowRoleUpdate(true);
    };
    
    const closeRoleUpdate = () => {
        setShowRoleUpdate(false);
        setUserToUpdate(null);
    };
    
    const handleRoleUpdate = async (e) => {
        e.preventDefault();
        
        try {
            await databases.updateDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                userToUpdate.$id,
                {
                    role: newRole
                }
            );
            
            // Close modal and refresh users
            closeRoleUpdate();
            fetchUsers();
            
        } catch (err) {
            console.error("Foydalanuvchi rolini yangilashda xato:", err);
            toast.error(`Foydalanuvchi rolini yangilashda xato: ${err.message}`);
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(totalUsers / itemsPerPage);
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

    // Get role badge class
    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'admin':
                return 'admin-role';
            case 'editor':
                return 'editor-role';
            case 'user':
                return 'user-role';
            default:
                return 'user-role';
        }
    };

    // Get role text
    const getRoleText = (role) => {
        switch (role) {
            case 'admin':
                return 'Administrator';
            case 'editor':
                return 'Muharrir';
            case 'user':
                return 'Foydalanuvchi';
            default:
                return 'Foydalanuvchi';
        }
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
        <div className="admin-user-management" style={{ marginTop: `10px` }}>
            {/* Filters and Search */}
            <div className="admin-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Foydalanuvchi qidirish..."
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
                        value={filterRole}
                        onChange={handleRoleFilterChange}
                    >
                        <option value="">Barcha rollar</option>
                        <option value="admin">Administrator</option>
                        <option value="editor">Muharrir</option>
                        <option value="user">Foydalanuvchi</option>
                    </select>
                </div>
                
                <div className="admin-actions">
                    <button 
                        className="admin-btn primary-btn"
                        onClick={createSampleUsers}
                        disabled={loading}
                    >
                        <i className="fas fa-plus"></i>
                        Test foydalanuvchilari
                    </button>
                </div>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="admin-loading">Yuklanmoqda...</div>
            ) : error ? (
                <div className="admin-error">Xato: {error}</div>
            ) : (
                <>
                    <div className="admin-table-container">
                        <table className="admin-table users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Ism</th>
                                    <th>Email</th>
                                    <th>Sana</th>
                                    <th>Rol</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? (
                                    users.map(user => (
                                        <tr key={user.$id}>
                                            <td>#{user.$id.substring(0, 8)}</td>
                                            <td className="user-name">{searchTerm ? highlightText(user.fullName || user.name || 'Noma\'lum', searchTerm) : (user.fullName || user.name || 'Noma\'lum')}</td>
                                            <td>{searchTerm ? highlightText(user.email || 'Noma\'lum', searchTerm) : (user.email || 'Noma\'lum')}</td>
                                            <td>{formatDate(user.$createdAt)}</td>
                                            <td>
                                                <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                                                    {getRoleText(user.role)}
                                                </span>
                                            </td>
                                            <td className="user-actions">
                                                <button 
                                                    className="action-btn view-btn" 
                                                    onClick={() => openUserDetails(user)}
                                                    title="Ko'rish"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button 
                                                    className="action-btn edit-btn" 
                                                    onClick={() => openRoleUpdate(user)}
                                                    title="Rolni yangilash"
                                                >
                                                    <i className="fas fa-user-tag"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="no-data">Foydalanuvchilar topilmadi</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="admin-pagination">
                        <div className="pagination-info">
                            Jami: {totalUsers} ta foydalanuvchi, 
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
                </>
            )}

            {/* User Details Modal */}
            {showUserDetails && (
                <div className="admin-modal">
                    <div className="admin-modal-content">
                        <div className="admin-modal-header">
                            <h3>Foydalanuvchi tafsilotlari</h3>
                            <button className="close-btn" onClick={closeUserDetails}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="admin-modal-body">
                            <div className="user-details">
                                <div className="user-info-section">
                                    <h4>Foydalanuvchi ma'lumotlari</h4>
                                    <div className="user-info-grid">
                                        <div className="user-info-item">
                                            <span className="info-label">ID:</span>
                                            <span className="info-value">#{selectedUser.$id}</span>
                                        </div>
                                        <div className="user-info-item">
                                            <span className="info-label">Ism:</span>
                                            <span className="info-value">{selectedUser.fullName || selectedUser.name || 'Noma\'lum'}</span>
                                        </div>
                                        <div className="user-info-item">
                                            <span className="info-label">Email:</span>
                                            <span className="info-value">{selectedUser.email || 'Noma\'lum'}</span>
                                        </div>
                                        <div className="user-info-item">
                                            <span className="info-label">Telefon:</span>
                                            <span className="info-value">{selectedUser.phone || 'Noma\'lum'}</span>
                                        </div>
                                        <div className="user-info-item">
                                            <span className="info-label">Manzil:</span>
                                            <span className="info-value">{selectedUser.address || 'Noma\'lum'}</span>
                                        </div>
                                        <div className="user-info-item">
                                            <span className="info-label">Ro'yxatdan o'tgan sana:</span>
                                            <span className="info-value">{formatDate(selectedUser.$createdAt)}</span>
                                        </div>
                                        <div className="user-info-item">
                                            <span className="info-label">Rol:</span>
                                            <span className={`role-badge ${getRoleBadgeClass(selectedUser.role)}`}>
                                                {getRoleText(selectedUser.role)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="user-info-section">
                                    <h4>So'nggi buyurtmalar</h4>
                                    {userDetails.loading ? (
                                        <div className="admin-loading">Yuklanmoqda...</div>
                                    ) : userDetails.error ? (
                                        <div className="admin-error">Xato: {userDetails.error}</div>
                                    ) : userDetails.orders.length > 0 ? (
                                        <table className="admin-table orders-table">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Sana</th>
                                                    <th>Miqdor</th>
                                                    <th>Narx</th>
                                                    <th>Holat</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userDetails.orders.map(order => (
                                                    <tr key={order.$id}>
                                                        <td>#{order.$id.substring(0, 8)}</td>
                                                        <td>{formatDate(order.$createdAt)}</td>
                                                        <td>{order.quantity || 1}</td>
                                                        <td className="order-price">
                                                            {(order.priceAtTimeOfAdd || 0).toLocaleString()} so'm
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                                                                {getStatusText(order.status)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>Buyurtmalar mavjud emas</p>
                                    )}
                                </div>
                                
                                <div className="form-actions">
                                    <button className="cancel-btn" onClick={closeUserDetails}>
                                        Yopish
                                    </button>
                                    <button className="submit-btn" onClick={() => {
                                        closeUserDetails();
                                        openRoleUpdate(selectedUser);
                                    }}>
                                        Rolni yangilash
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Update Modal */}
            {showRoleUpdate && (
                <div className="admin-modal">
                    <div className="admin-modal-content">
                        <div className="admin-modal-header">
                            <h3>Foydalanuvchi rolini yangilash</h3>
                            <button className="close-btn" onClick={closeRoleUpdate}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="admin-modal-body">
                            <form onSubmit={handleRoleUpdate} className="admin-form">
                                <div className="form-group">
                                    <label htmlFor="role">Yangi rol</label>
                                    <select
                                        className="admin-select"
                                        id="role"
                                        name="role"
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        required
                                    >
                                        <option value="user">Foydalanuvchi</option>
                                        <option value="editor">Muharrir</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                
                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={closeRoleUpdate}>
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

export default AdminUserManagement;