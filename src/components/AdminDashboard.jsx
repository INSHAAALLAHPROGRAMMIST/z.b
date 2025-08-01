import React, { useState, useEffect } from 'react';
import { databases } from '../appwriteConfig';
import WebhookMonitor from './WebhookMonitor';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/dashboard.css';
import '../styles/admin/improved-dashboard.css';

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
                    databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID) // Qayta yoqildi
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
        return (
            <div className="admin-dashboard" style={{ marginTop: '0px', padding: '0 15px' }}>
                {/* Loading Skeleton */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(106, 138, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                    padding: '25px',
                    borderRadius: '15px',
                    marginBottom: '25px',
                    border: '1px solid rgba(106, 138, 255, 0.2)'
                }}>
                    <div style={{
                        height: '32px',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '8px',
                        marginBottom: '10px'
                    }}></div>
                    <div style={{
                        height: '20px',
                        width: '60%',
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '4px'
                    }}></div>
                </div>

                {/* Stats Cards Skeleton */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    marginBottom: '32px'
                }}>
                    {[1,2,3,4].map(i => (
                        <div key={i} style={{
                            padding: '28px',
                            borderRadius: '18px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.5s infinite'
                            }}></div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    height: '16px',
                                    width: '80px',
                                    background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite',
                                    borderRadius: '4px',
                                    marginBottom: '8px'
                                }}></div>
                                <div style={{
                                    height: '32px',
                                    width: '60px',
                                    background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 1.5s infinite',
                                    borderRadius: '4px'
                                }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                <style jsx>{`
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                `}</style>
            </div>
        );
    }

    if (stats.error) {
        return <div className="admin-error">Xato: {stats.error}</div>;
    }

    return (
        <div className="admin-dashboard" style={{ marginTop: '0px', padding: '0 15px' }}>
            {/* Welcome Section */}
            <div className="admin-welcome-section" style={{
                background: 'linear-gradient(135deg, rgba(106, 138, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                padding: '25px',
                borderRadius: '15px',
                marginBottom: '20px',
                border: '1px solid rgba(106, 138, 255, 0.2)'
            }}>
                <h1 style={{ 
                    fontSize: '2rem', 
                    margin: '0 0 10px 0',
                    background: 'linear-gradient(135deg, #6A8AFF, #A855F7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    <i className="fas fa-tachometer-alt" style={{ marginRight: '15px' }}></i>
                    Admin Dashboard
                </h1>
                <p style={{ 
                    fontSize: '1.1rem', 
                    opacity: '0.8', 
                    margin: '0',
                    color: 'var(--text-color)'
                }}>
                    Zamon Books boshqaruv paneli - barcha ma'lumotlar bir joyda
                </p>
            </div>

            {/* Webhook Security Monitor - Compact */}
            <WebhookMonitor />

            {/* Stats Cards */}
            <div className="admin-stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
            }}>
                <div className="admin-stat-card books-card glassmorphism-card">
                    <div className="stat-icon" style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.3))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        color: '#22C55E',
                        boxShadow: '0 4px 16px rgba(34, 197, 94, 0.2)',
                        position: 'relative'
                    }}>
                        <i className="fas fa-book"></i>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '16px',
                            padding: '2px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                            WebkitMaskComposite: 'xor'
                        }}></div>
                    </div>
                    <div className="stat-details" style={{ flex: 1 }}>
                        <h3 style={{ 
                            fontSize: '0.9rem', 
                            margin: '0 0 8px 0',
                            color: 'var(--light-text-color)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontWeight: '500'
                        }}>Jami Kitoblar</h3>
                        <p className="stat-value" style={{ 
                            fontSize: '2.2rem', 
                            fontWeight: '700', 
                            margin: '0 0 8px 0',
                            color: '#22C55E',
                            lineHeight: '1'
                        }}>{stats.totalBooks}</p>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            color: '#22C55E',
                            fontWeight: '500'
                        }}>
                            <i className="fas fa-arrow-up" style={{ fontSize: '0.7rem' }}></i>
                            <span>+12% bu oy</span>
                        </div>
                    </div>
                </div>
                
                <div className="admin-stat-card orders-card glassmorphism-card">
                    <div className="stat-icon" style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '15px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: '#3B82F6'
                    }}>
                        <i className="fas fa-shopping-cart"></i>
                    </div>
                    <div className="stat-details">
                        <h3>Jami Buyurtmalar</h3>
                        <p className="stat-value" style={{ color: '#3B82F6' }}>{stats.totalOrders}</p>
                        <div className="stat-trend positive">
                            <i className="fas fa-arrow-up"></i>
                            <span>+8% bu oy</span>
                        </div>
                    </div>
                </div>
                
                <div className="admin-stat-card users-card glassmorphism-card">
                    <div className="stat-icon" style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '15px',
                        background: 'rgba(168, 85, 247, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: '#A855F7'
                    }}>
                        <i className="fas fa-users"></i>
                    </div>
                    <div className="stat-details">
                        <h3 style={{ fontSize: '0.9rem', opacity: '0.7', margin: '0 0 5px 0' }}>Jami Foydalanuvchilar</h3>
                        <p className="stat-value" style={{ 
                            fontSize: '2rem', 
                            fontWeight: 'bold', 
                            margin: '0',
                            color: '#A855F7'
                        }}>{stats.totalUsers}</p>
                    </div>
                </div>
                
                <div className="admin-stat-card revenue-card glassmorphism-card">
                    <div className="stat-icon" style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '15px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        color: '#F59E0B'
                    }}>
                        <i className="fas fa-money-bill-wave"></i>
                    </div>
                    <div className="stat-details">
                        <h3 style={{ fontSize: '0.9rem', opacity: '0.7', margin: '0 0 5px 0' }}>Jami Daromad</h3>
                        <p className="stat-value" style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold', 
                            margin: '0',
                            color: '#F59E0B'
                        }}>{stats.totalRevenue.toLocaleString()} so'm</p>
                    </div>
                </div>
            </div>

            {/* Charts and Tables */}
            <div className="admin-dashboard-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '25px',
                marginBottom: '30px'
            }}>
                {/* Recent Orders */}
                <div className="admin-card glassmorphism-card" style={{
                    padding: '25px',
                    borderRadius: '15px',
                    border: '1px solid rgba(106, 138, 255, 0.2)'
                }}>
                    <div className="card-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '1px solid rgba(106, 138, 255, 0.1)'
                    }}>
                        <h3 style={{ 
                            fontSize: '1.3rem', 
                            margin: '0',
                            color: 'var(--text-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <i className="fas fa-clock" style={{ color: '#6A8AFF' }}></i>
                            So'nggi Buyurtmalar
                        </h3>
                        <button className="glassmorphism-button" style={{
                            padding: '8px 15px',
                            fontSize: '0.9rem',
                            backgroundColor: 'rgba(106, 138, 255, 0.1)'
                        }}>
                            Barchasini ko'rish
                        </button>
                    </div>
                    <div className="card-content">
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.9rem'
                            }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid rgba(106, 138, 255, 0.1)' }}>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', opacity: '0.7' }}>ID</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', opacity: '0.7' }}>Foydalanuvchi</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', opacity: '0.7' }}>Sana</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', opacity: '0.7' }}>Miqdor</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', opacity: '0.7' }}>Holat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentOrders.length > 0 ? (
                                        stats.recentOrders.map(order => (
                                            <tr key={order.$id} style={{ 
                                                borderBottom: '1px solid rgba(106, 138, 255, 0.05)',
                                                transition: 'background-color 0.2s'
                                            }}>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <code style={{ 
                                                        background: 'rgba(106, 138, 255, 0.1)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem'
                                                    }}>
                                                        #{order.$id.substring(0, 8)}
                                                    </code>
                                                </td>
                                                <td style={{ padding: '12px 8px' }}>{order.users || 'Noma\'lum'}</td>
                                                <td style={{ padding: '12px 8px' }}>{new Date(order.$createdAt).toLocaleDateString()}</td>
                                                <td style={{ padding: '12px 8px' }}>{order.quantity || 1}</td>
                                                <td style={{ padding: '12px 8px' }}>
                                                    <span style={{
                                                        background: 'rgba(34, 197, 94, 0.1)',
                                                        color: '#22C55E',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        Yakunlangan
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ 
                                                padding: '30px',
                                                textAlign: 'center',
                                                opacity: '0.6',
                                                fontStyle: 'italic'
                                            }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
                                                Buyurtmalar mavjud emas
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Top Selling Books */}
                <div className="admin-card glassmorphism-card" style={{
                    padding: '25px',
                    borderRadius: '15px',
                    border: '1px solid rgba(168, 85, 247, 0.2)'
                }}>
                    <div className="card-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: '1px solid rgba(168, 85, 247, 0.1)'
                    }}>
                        <h3 style={{ 
                            fontSize: '1.3rem', 
                            margin: '0',
                            color: 'var(--text-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <i className="fas fa-trophy" style={{ color: '#A855F7' }}></i>
                            Eng Ko'p Sotilgan Kitoblar
                        </h3>
                        <button className="glassmorphism-button" style={{
                            padding: '8px 15px',
                            fontSize: '0.9rem',
                            backgroundColor: 'rgba(168, 85, 247, 0.1)'
                        }}>
                            Barchasini ko'rish
                        </button>
                    </div>
                    <div className="card-content">
                        <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                            {stats.topSellingBooks.length > 0 ? (
                                stats.topSellingBooks.map((book, index) => (
                                    <li key={book.bookId} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        padding: '15px 0',
                                        borderBottom: index < stats.topSellingBooks.length - 1 ? '1px solid rgba(168, 85, 247, 0.05)' : 'none'
                                    }}>
                                        <span style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '50%',
                                            background: 'rgba(168, 85, 247, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            color: '#A855F7'
                                        }}>
                                            {index + 1}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{book.title}</h4>
                                            <p style={{ margin: '0', fontSize: '0.9rem', opacity: '0.7' }}>
                                                {book.quantity} dona sotilgan
                                            </p>
                                        </div>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: '#A855F7',
                                            fontSize: '0.9rem'
                                        }}>
                                            {book.price.toLocaleString()} so'm
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li style={{ 
                                    padding: '30px',
                                    textAlign: 'center',
                                    opacity: '0.6',
                                    fontStyle: 'italic'
                                }}>
                                    <i className="fas fa-chart-bar" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
                                    Ma'lumot mavjud emas
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="admin-card glassmorphism-card" style={{ 
                padding: '25px',
                borderRadius: '15px',
                border: '1px solid rgba(34, 197, 94, 0.2)'
            }}>
                <div className="card-header" style={{
                    marginBottom: '20px',
                    paddingBottom: '15px',
                    borderBottom: '1px solid rgba(34, 197, 94, 0.1)'
                }}>
                    <h3 style={{ 
                        fontSize: '1.3rem', 
                        margin: '0',
                        color: 'var(--text-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <i className="fas fa-history" style={{ color: '#22C55E' }}></i>
                        So'nggi Faoliyat
                    </h3>
                </div>
                <div className="card-content">
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                        <li style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '15px',
                            padding: '15px 0',
                            borderBottom: '1px solid rgba(34, 197, 94, 0.05)'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#22C55E',
                                fontSize: '1.1rem'
                            }}>
                                <i className="fas fa-user-plus"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>
                                    Yangi foydalanuvchi ro'yxatdan o'tdi
                                </h4>
                                <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', opacity: '0.7' }}>
                                    Yangi foydalanuvchi tizimga qo'shildi
                                </p>
                                <span style={{ 
                                    fontSize: '0.8rem', 
                                    opacity: '0.6',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}>
                                    Bugun, 14:30
                                </span>
                            </div>
                        </li>
                        <li style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '15px',
                            padding: '15px 0',
                            borderBottom: '1px solid rgba(59, 130, 246, 0.05)'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(59, 130, 246, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#3B82F6',
                                fontSize: '1.1rem'
                            }}>
                                <i className="fas fa-shopping-cart"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>
                                    Yangi buyurtma qabul qilindi
                                </h4>
                                <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', opacity: '0.7' }}>
                                    Buyurtma #12345 - 3 ta kitob
                                </p>
                                <span style={{ 
                                    fontSize: '0.8rem', 
                                    opacity: '0.6',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}>
                                    Bugun, 12:15
                                </span>
                            </div>
                        </li>
                        <li style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '15px',
                            padding: '15px 0 0 0'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(168, 85, 247, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#A855F7',
                                fontSize: '1.1rem'
                            }}>
                                <i className="fas fa-book"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>
                                    Yangi kitob qo'shildi
                                </h4>
                                <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', opacity: '0.7' }}>
                                    Kutubxonaga yangi kitob qo'shildi
                                </p>
                                <span style={{ 
                                    fontSize: '0.8rem', 
                                    opacity: '0.6',
                                    background: 'rgba(168, 85, 247, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}>
                                    Kecha, 18:45
                                </span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;