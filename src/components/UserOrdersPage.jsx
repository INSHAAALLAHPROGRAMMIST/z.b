import React, { useState, useEffect } from 'react';
import { databases, account, Query } from '../appwriteConfig';
import { Link } from 'react-router-dom';
import '../index.css';
import '../styles/userOrders.css';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

function UserOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchUserOrders();
    }, []);

    const fetchUserOrders = async () => {
        setLoading(true);
        setError(null);

        try {
            // Current user'ni olish
            const currentUser = await account.get();
            setUser(currentUser);

            // Orders service'ni import qilish
            const { getUserOrders } = await import('../utils/orderService');
            
            // User'ning orderlarini olish
            const ordersWithBookDetails = await getUserOrders(currentUser.$id);

            setOrders(ordersWithBookDetails);
        } catch (err) {
            console.error('Buyurtmalarni yuklashda xato:', err);
            setError(err.message || 'Buyurtmalarni yuklashda xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status text and class
    const getStatusInfo = (status) => {
        switch (status) {
            case 'pending':
                return { text: 'Kutilmoqda', class: 'status-pending' };
            case 'processing':
                return { text: 'Jarayonda', class: 'status-processing' };
            case 'completed':
                return { text: 'Yakunlangan', class: 'status-completed' };
            case 'cancelled':
                return { text: 'Bekor qilingan', class: 'status-cancelled' };
            default:
                return { text: 'Kutilmoqda', class: 'status-pending' };
        }
    };

    // Calculate total for all orders
    const calculateTotal = () => {
        return orders.reduce((total, order) => total + (order.priceAtTimeOfOrder * order.quantity), 0);
    };

    if (loading) {
        return (
            <main className="container" style={{ marginTop: '100px', textAlign: 'center', padding: '50px 20px' }}>
                <div className="loading-spinner" style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid rgba(106, 138, 255, 0.2)',
                    borderTop: '4px solid var(--primary-color)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <p>Buyurtmalar yuklanmoqda...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="container" style={{ marginTop: '100px', textAlign: 'center', padding: '50px 20px' }}>
                <div className="error-message glassmorphism-card" style={{
                    padding: '30px',
                    maxWidth: '500px',
                    margin: '0 auto',
                    color: '#ff5252'
                }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', marginBottom: '20px' }}></i>
                    <h3>Xato yuz berdi</h3>
                    <p>{error}</p>
                    <button 
                        className="glassmorphism-button" 
                        onClick={fetchUserOrders}
                        style={{ marginTop: '20px' }}
                    >
                        <i className="fas fa-redo"></i> Qayta urinish
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="user-orders-page container" style={{ marginTop: '100px', marginBottom: '50px' }}>
                <div className="page-header" style={{ marginBottom: '30px' }}>
                    <h1 className="section-title">Mening Buyurtmalarim</h1>
                    {user && (
                        <p style={{ color: 'var(--light-text-color)', fontSize: '1.1rem' }}>
                            Salom, {user.name || user.email}! Bu yerda sizning barcha buyurtmalaringizni ko'rishingiz mumkin.
                        </p>
                    )}
                </div>

                {orders.length === 0 ? (
                    <div className="empty-orders glassmorphism-card" style={{
                        textAlign: 'center',
                        padding: '50px 30px',
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>
                        <i className="fas fa-shopping-bag" style={{ 
                            fontSize: '4rem', 
                            marginBottom: '20px', 
                            opacity: '0.5',
                            color: 'var(--primary-color)'
                        }}></i>
                        <h3 style={{ marginBottom: '15px' }}>Hali buyurtmalaringiz yo'q</h3>
                        <p style={{ marginBottom: '25px', color: 'var(--light-text-color)' }}>
                            Kitoblarni ko'rib chiqing va birinchi buyurtmangizni bering!
                        </p>
                        <Link to="/" className="glassmorphism-button">
                            <i className="fas fa-book"></i> Kitoblarni ko'rish
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Orders Summary */}
                        <div className="orders-summary glassmorphism-card" style={{
                            padding: '25px',
                            marginBottom: '30px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '20px'
                        }}>
                            <div className="summary-item">
                                <h3 style={{ margin: '0 0 5px 0', color: 'var(--primary-color)' }}>
                                    {orders.length}
                                </h3>
                                <p style={{ margin: 0, color: 'var(--light-text-color)' }}>Jami buyurtmalar</p>
                            </div>
                            <div className="summary-item">
                                <h3 style={{ margin: '0 0 5px 0', color: 'var(--accent-light)' }}>
                                    {calculateTotal().toLocaleString()} so'm
                                </h3>
                                <p style={{ margin: 0, color: 'var(--light-text-color)' }}>Jami summa</p>
                            </div>
                            <div className="summary-item">
                                <h3 style={{ margin: '0 0 5px 0', color: 'var(--success-color, #4caf50)' }}>
                                    {orders.filter(o => o.status === 'completed').length}
                                </h3>
                                <p style={{ margin: 0, color: 'var(--light-text-color)' }}>Yakunlangan</p>
                            </div>
                        </div>

                        {/* Orders List */}
                        <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {orders.map(order => {
                                const statusInfo = getStatusInfo(order.status);
                                return (
                                    <div key={order.$id} className="order-card glassmorphism-card" style={{
                                        padding: '25px',
                                        display: 'flex',
                                        gap: '20px',
                                        alignItems: 'center',
                                        flexWrap: 'wrap'
                                    }}>
                                        {/* Book Image */}
                                        <div className="order-book-image" style={{ flexShrink: 0 }}>
                                            <img 
                                                src={order.book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                                                alt={order.book.title}
                                                style={{
                                                    width: '80px',
                                                    height: '100px',
                                                    objectFit: 'cover',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                                }}
                                            />
                                        </div>

                                        {/* Order Info */}
                                        <div className="order-info" style={{ flex: 1, minWidth: '200px' }}>
                                            <h3 style={{ 
                                                margin: '0 0 8px 0', 
                                                fontSize: '1.2rem',
                                                color: 'var(--neo-text)'
                                            }}>
                                                {order.book.title}
                                            </h3>
                                            <p style={{ 
                                                margin: '0 0 8px 0', 
                                                color: 'var(--light-text-color)',
                                                fontSize: '0.9rem'
                                            }}>
                                                Buyurtma ID: #{order.$id.substring(0, 8)}
                                            </p>
                                            <p style={{ 
                                                margin: '0 0 8px 0', 
                                                color: 'var(--light-text-color)',
                                                fontSize: '0.9rem'
                                            }}>
                                                Sana: {formatDate(order.orderDate || order.$createdAt)}
                                            </p>
                                            <div className="order-quantity" style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '15px',
                                                marginTop: '10px'
                                            }}>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--light-text-color)' }}>
                                                    Miqdor: <strong>{order.quantity}</strong>
                                                </span>
                                                <span style={{ 
                                                    fontSize: '1.1rem', 
                                                    fontWeight: 'bold',
                                                    color: 'var(--primary-color)'
                                                }}>
                                                    {(order.priceAtTimeOfOrder * order.quantity).toLocaleString()} so'm
                                                </span>
                                            </div>
                                        </div>

                                        {/* Order Status */}
                                        <div className="order-status" style={{ textAlign: 'center' }}>
                                            <span className={`status-badge ${statusInfo.class}`} style={{
                                                padding: '8px 16px',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'inline-block'
                                            }}>
                                                {statusInfo.text}
                                            </span>
                                            {order.status === 'pending' && (
                                                <p style={{ 
                                                    margin: '10px 0 0 0', 
                                                    fontSize: '0.8rem',
                                                    color: 'var(--light-text-color)',
                                                    fontStyle: 'italic'
                                                }}>
                                                    Admin siz bilan bog'lanadi
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Back to Shopping */}
                        <div style={{ textAlign: 'center', marginTop: '40px' }}>
                            <Link to="/" className="glassmorphism-button" style={{
                                padding: '12px 30px',
                                fontSize: '1.1rem'
                            }}>
                                <i className="fas fa-arrow-left"></i> Kitoblarni ko'rishda davom etish
                            </Link>
                        </div>
                    </>
                )}

        </main>
    );
}

export default UserOrdersPage;