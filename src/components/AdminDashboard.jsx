import React, { useState, useEffect } from 'react';
import { databases } from '../appwriteConfig';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/dashboard.css';

// Appwrite konsolidan olingan ID'lar
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;

function AdminDashboard() {
    const [stats, setStats] = useState({
        totalBooks: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0,
        recentOrders: [],
        topSellingBooks: [],
        loading: true,
        error: null
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Parallel requests for better performance
                const [booksResponse, ordersResponse, usersResponse] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID),
                    databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID),
                    databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID)
                ]);

                // Calculate total revenue
                const totalRevenue = ordersResponse.documents.reduce((sum, order) => {
                    const quantity = order.quantity || 0;
                    const price = order.priceAtTimeOfAdd || 0;
                    return sum + (quantity * price);
                }, 0);

                // Get recent orders (last 5)
                const recentOrders = ordersResponse.documents
                    .filter(order => order.$createdAt) // Faqat to'g'ri sana bo'lgan orderlar
                    .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))
                    .slice(0, 5);

                // Top selling books - vaqtincha bo'sh array
                const topSellingWithDetails = [];

                setStats({
                    totalBooks: booksResponse.total,
                    totalOrders: ordersResponse.total,
                    totalUsers: usersResponse.total,
                    totalRevenue,
                    recentOrders,
                    topSellingBooks: topSellingWithDetails.length > 0 ? topSellingWithDetails : [],
                    loading: false,
                    error: null
                });
            } catch (err) {
                console.error("Statistikani yuklashda xato:", err);
                setStats(prev => ({
                    ...prev,
                    loading: false,
                    error: err.message || "Ma'lumotlarni yuklashda xato yuz berdi"
                }));
            }
        };

        fetchStats();
    }, []);

    if (stats.loading) {
        return <div className="admin-loading">Yuklanmoqda...</div>;
    }

    if (stats.error) {
        return <div className="admin-error">Xato: {stats.error}</div>;
    }

    return (
        <div className="admin-dashboard" style={{ marginTop: '0px', padding: '0 15px' }}>
            {/* Stats Cards */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="stat-icon books-icon">
                        <i className="fas fa-book"></i>
                    </div>
                    <div className="stat-details">
                        <h3>Jami Kitoblar</h3>
                        <p className="stat-value">{stats.totalBooks}</p>
                    </div>
                </div>
                
                <div className="admin-stat-card">
                    <div className="stat-icon orders-icon">
                        <i className="fas fa-shopping-cart"></i>
                    </div>
                    <div className="stat-details">
                        <h3>Jami Buyurtmalar</h3>
                        <p className="stat-value">{stats.totalOrders}</p>
                    </div>
                </div>
                
                <div className="admin-stat-card">
                    <div className="stat-icon users-icon">
                        <i className="fas fa-users"></i>
                    </div>
                    <div className="stat-details">
                        <h3>Jami Foydalanuvchilar</h3>
                        <p className="stat-value">{stats.totalUsers}</p>
                    </div>
                </div>
                
                <div className="admin-stat-card">
                    <div className="stat-icon revenue-icon">
                        <i className="fas fa-money-bill-wave"></i>
                    </div>
                    <div className="stat-details">
                        <h3>Jami Daromad</h3>
                        <p className="stat-value">{stats.totalRevenue.toLocaleString()} so'm</p>
                    </div>
                </div>
            </div>

            {/* Charts and Tables */}
            <div className="admin-dashboard-grid">
                {/* Recent Orders */}
                <div className="admin-card recent-orders">
                    <div className="card-header">
                        <h3>So'nggi Buyurtmalar</h3>
                        <button className="view-all-btn">Barchasini ko'rish</button>
                    </div>
                    <div className="card-content">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Foydalanuvchi</th>
                                    <th>Sana</th>
                                    <th>Miqdor</th>
                                    <th>Holat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentOrders.length > 0 ? (
                                    stats.recentOrders.map(order => (
                                        <tr key={order.$id}>
                                            <td>#{order.$id.substring(0, 8)}</td>
                                            <td>{order.users || 'Noma\'lum'}</td>
                                            <td>{new Date(order.$createdAt).toLocaleDateString()}</td>
                                            <td>{order.quantity || 1}</td>
                                            <td>
                                                <span className="status-badge completed">Yakunlangan</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="no-data">Buyurtmalar mavjud emas</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Selling Books */}
                <div className="admin-card top-selling">
                    <div className="card-header">
                        <h3>Eng Ko'p Sotilgan Kitoblar</h3>
                        <button className="view-all-btn">Barchasini ko'rish</button>
                    </div>
                    <div className="card-content">
                        <ul className="top-selling-list">
                            {stats.topSellingBooks.length > 0 ? (
                                stats.topSellingBooks.map((book, index) => (
                                    <li key={book.bookId} className="top-selling-item">
                                        <span className="rank">{index + 1}</span>
                                        <div className="book-info">
                                            <h4>{book.title}</h4>
                                            <p>{book.quantity} dona sotilgan</p>
                                        </div>
                                        <span className="book-price">{book.price.toLocaleString()} so'm</span>
                                    </li>
                                ))
                            ) : (
                                <li className="no-data">Ma'lumot mavjud emas</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="admin-card activity-timeline" style={{ marginTop: '5px' }}>
                <div className="card-header">
                    <h3>So'nggi Faoliyat</h3>
                </div>
                <div className="card-content" style={{ padding: '8px 12px' }}>
                    <ul className="timeline" style={{ margin: '0', padding: '0' }}>
                        <li className="timeline-item">
                            <div className="timeline-icon">
                                <i className="fas fa-user-plus"></i>
                            </div>
                            <div className="timeline-content">
                                <h4>Yangi foydalanuvchi ro'yxatdan o'tdi</h4>
                                <p>Yangi foydalanuvchi</p>
                                <span className="timeline-date">Bugun, 14:30</span>
                            </div>
                        </li>
                        <li className="timeline-item">
                            <div className="timeline-icon">
                                <i className="fas fa-shopping-cart"></i>
                            </div>
                            <div className="timeline-content">
                                <h4>Yangi buyurtma qabul qilindi</h4>
                                <p>Buyurtma #12345 - 3 ta kitob</p>
                                <span className="timeline-date">Bugun, 12:15</span>
                            </div>
                        </li>
                        <li className="timeline-item">
                            <div className="timeline-icon">
                                <i className="fas fa-book"></i>
                            </div>
                            <div className="timeline-content">
                                <h4>Yangi kitob qo'shildi</h4>
                                <p>Yangi kitob qo'shildi</p>
                                <span className="timeline-date">Kecha, 18:45</span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;