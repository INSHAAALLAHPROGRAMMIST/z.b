import React, { useState, useEffect } from 'react';
// Firebase imports
import firebaseService from '../services/FirebaseService';
import { getCurrentUserId } from '../utils/firebaseHelpers';
import { toastMessages } from '../utils/toastUtils';
import { 
    STOCK_STATUS, 
    getStockStatusColor, 
    getStockStatusText, 
    canPreOrder, 
    canJoinWaitlist 
} from '../utils/inventoryUtils';

function PreOrderWaitlist({ book, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [userPreOrder, setUserPreOrder] = useState(null);
    const [userWaitlist, setUserWaitlist] = useState(null);
    const [preOrderCount, setPreOrderCount] = useState(0);
    const [waitlistCount, setWaitlistCount] = useState(0);

    const userId = getCurrentUserId();

    // Load user's existing pre-order and waitlist status
    useEffect(() => {
        if (!book || !userId) return;

        const loadUserStatus = async () => {
            try {
                // Check pre-orders
                const preOrders = await firebaseService.getPreOrders({ 
                    bookId: book.id, 
                    userId 
                });
                if (preOrders.documents.length > 0) {
                    setUserPreOrder(preOrders.documents[0]);
                }

                // Check waitlist
                const waitlist = await firebaseService.getWaitlist({ 
                    bookId: book.id, 
                    userId 
                });
                if (waitlist.documents.length > 0) {
                    setUserWaitlist(waitlist.documents[0]);
                }

                // Get counts
                const allPreOrders = await firebaseService.getPreOrders({ bookId: book.id });
                const allWaitlist = await firebaseService.getWaitlist({ bookId: book.id });
                
                setPreOrderCount(allPreOrders.documents.length);
                setWaitlistCount(allWaitlist.documents.length);

            } catch (error) {
                console.error('Error loading user status:', error);
            }
        };

        loadUserStatus();
    }, [book, userId]);

    // Handle pre-order
    const handlePreOrder = async () => {
        if (!book || !userId || loading) return;

        try {
            setLoading(true);

            if (userPreOrder) {
                // Cancel pre-order
                await firebaseService.cancelPreOrder(userPreOrder.id);
                setUserPreOrder(null);
                setPreOrderCount(prev => prev - 1);
                toastMessages.success('Oldindan buyurtma bekor qilindi');
            } else {
                // Create pre-order
                const preOrderData = {
                    bookId: book.id,
                    userId,
                    bookTitle: book.title,
                    bookPrice: book.price,
                    quantity: 1,
                    customerName: 'Foydalanuvchi', // This should come from user profile
                    customerEmail: '', // This should come from user profile
                    customerPhone: '', // This should come from user profile
                    estimatedAvailability: 'Tez orada'
                };

                const newPreOrder = await firebaseService.createPreOrder(preOrderData);
                setUserPreOrder(newPreOrder);
                setPreOrderCount(prev => prev + 1);
                toastMessages.success('Oldindan buyurtma berildi!');
                
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error('Pre-order error:', error);
            toastMessages.error('Xato yuz berdi. Qayta urinib ko\'ring.');
        } finally {
            setLoading(false);
        }
    };

    // Handle waitlist
    const handleWaitlist = async () => {
        if (!book || !userId || loading) return;

        try {
            setLoading(true);

            if (userWaitlist) {
                // Remove from waitlist
                await firebaseService.removeFromWaitlist(userWaitlist.id);
                setUserWaitlist(null);
                setWaitlistCount(prev => prev - 1);
                toastMessages.success('Navbatdan chiqarildi');
            } else {
                // Add to waitlist
                const waitlistData = {
                    bookId: book.id,
                    userId,
                    bookTitle: book.title,
                    userEmail: '' // This should come from user profile
                };

                const newWaitlist = await firebaseService.addToWaitlist(waitlistData);
                setUserWaitlist(newWaitlist);
                setWaitlistCount(prev => prev + 1);
                toastMessages.success('Navbatga qo\'shildi!');
                
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error('Waitlist error:', error);
            toastMessages.error('Xato yuz berdi. Qayta urinib ko\'ring.');
        } finally {
            setLoading(false);
        }
    };

    if (!book) return null;

    const showPreOrder = canPreOrder(book);
    const showWaitlist = canJoinWaitlist(book);

    if (!showPreOrder && !showWaitlist) return null;

    return (
        <div className="pre-order-waitlist" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '15px',
            padding: '15px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <div className="stock-status" style={{
                color: getStockStatusColor(book.stockStatus),
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '10px'
            }}>
                <i className="fas fa-info-circle" style={{ marginRight: '5px' }}></i>
                {getStockStatusText(book.stockStatus, book.stock)}
            </div>

            {showPreOrder && (
                <div className="pre-order-section">
                    <button
                        onClick={handlePreOrder}
                        disabled={loading}
                        className="glassmorphism-button"
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: userPreOrder 
                                ? 'rgba(255, 59, 59, 0.2)' 
                                : 'rgba(52, 211, 153, 0.2)',
                            border: userPreOrder 
                                ? '1px solid rgba(255, 59, 59, 0.3)' 
                                : '1px solid rgba(52, 211, 153, 0.3)',
                            color: userPreOrder ? '#ff6b6b' : '#34d399'
                        }}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                Yuklanmoqda...
                            </>
                        ) : userPreOrder ? (
                            <>
                                <i className="fas fa-times" style={{ marginRight: '8px' }}></i>
                                Oldindan buyurtmani bekor qilish
                            </>
                        ) : (
                            <>
                                <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                                Oldindan buyurtma berish
                            </>
                        )}
                    </button>
                    
                    {preOrderCount > 0 && (
                        <p style={{ 
                            fontSize: '0.8rem', 
                            opacity: 0.7, 
                            marginTop: '5px',
                            textAlign: 'center'
                        }}>
                            {preOrderCount} kishi oldindan buyurtma bergan
                        </p>
                    )}
                </div>
            )}

            {showWaitlist && (
                <div className="waitlist-section">
                    <button
                        onClick={handleWaitlist}
                        disabled={loading}
                        className="glassmorphism-button"
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: userWaitlist 
                                ? 'rgba(255, 59, 59, 0.2)' 
                                : 'rgba(106, 138, 255, 0.2)',
                            border: userWaitlist 
                                ? '1px solid rgba(255, 59, 59, 0.3)' 
                                : '1px solid rgba(106, 138, 255, 0.3)',
                            color: userWaitlist ? '#ff6b6b' : '#6a8aff'
                        }}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                Yuklanmoqda...
                            </>
                        ) : userWaitlist ? (
                            <>
                                <i className="fas fa-times" style={{ marginRight: '8px' }}></i>
                                Navbatdan chiqish
                            </>
                        ) : (
                            <>
                                <i className="fas fa-bell" style={{ marginRight: '8px' }}></i>
                                Mavjud bo'lganda xabar berish
                            </>
                        )}
                    </button>
                    
                    {waitlistCount > 0 && (
                        <p style={{ 
                            fontSize: '0.8rem', 
                            opacity: 0.7, 
                            marginTop: '5px',
                            textAlign: 'center'
                        }}>
                            {waitlistCount} kishi navbatda kutmoqda
                        </p>
                    )}
                </div>
            )}

            <div className="info-text" style={{
                fontSize: '0.8rem',
                opacity: 0.6,
                textAlign: 'center',
                marginTop: '10px'
            }}>
                {showPreOrder && (
                    <p>Oldindan buyurtma - kitob mavjud bo'lganda birinchi bo'lib xabar olasiz</p>
                )}
                {showWaitlist && (
                    <p>Navbat - kitob mavjud bo'lganda email orqali xabar beramiz</p>
                )}
            </div>
        </div>
    );
}

export default PreOrderWaitlist;