import React, { useState, useEffect } from 'react';
import { databases, ID, Query, DATABASE_ID, BOOKS_COLLECTION_ID, WAITLIST_COLLECTION_ID, PREORDER_COLLECTION_ID } from '../appwriteConfig';
import { toast } from '../utils/toastUtils';
import { 
    canPreOrder, 
    canJoinWaitlist, 
    formatRestockDate
} from '../utils/inventoryUtils';

// Collections will be imported from appwriteConfig

function PreOrderWaitlist({ book, currentUserId }) {
    const [loading, setLoading] = useState(false);
    const [userStatus, setUserStatus] = useState({
        inWaitlist: false,
        hasPreOrder: false,
        waitlistPosition: 0
    });
    
    // If collections are not configured, show fallback
    if (!WAITLIST_COLLECTION_ID || !PREORDER_COLLECTION_ID) {
        return (
            <div className="pre-order-waitlist">
                <div className="status-message info">
                    <i className="fas fa-info-circle"></i>
                    Pre-order/Waitlist tizimi hali sozlanmagan
                </div>
                <p style={{ color: 'var(--text-color)', opacity: 0.8, fontSize: '0.9rem', textAlign: 'center' }}>
                    Admin tomonidan tez orada yoqiladi
                </p>
            </div>
        );
    }

    useEffect(() => {
        checkUserStatus();
    }, [book.$id, currentUserId]);

    const checkUserStatus = async () => {
        if (!currentUserId) return;
        
        // Check if collections exist
        if (!WAITLIST_COLLECTION_ID || !PREORDER_COLLECTION_ID) {
            console.warn('Waitlist/PreOrder collections not configured yet');
            return;
        }

        try {
            // Check waitlist status
            const waitlistQuery = await databases.listDocuments(
                DATABASE_ID,
                WAITLIST_COLLECTION_ID,
                [
                    Query.equal('bookId', book.$id),
                    Query.equal('userId', currentUserId),
                    Query.equal('status', 'waiting')
                ]
            );

            // Check pre-order status
            const preOrderQuery = await databases.listDocuments(
                DATABASE_ID,
                PREORDER_COLLECTION_ID,
                [
                    Query.equal('bookId', book.$id),
                    Query.equal('userId', currentUserId)
                ]
            );

            // Get waitlist position
            const allWaitlist = await databases.listDocuments(
                DATABASE_ID,
                WAITLIST_COLLECTION_ID,
                [
                    Query.equal('bookId', book.$id),
                    Query.equal('status', 'waiting'),
                    Query.orderAsc('$createdAt')
                ]
            );

            const userWaitlistEntry = allWaitlist.documents.find(
                entry => entry.userId === currentUserId
            );

            setUserStatus({
                inWaitlist: waitlistQuery.documents.length > 0,
                hasPreOrder: preOrderQuery.documents.length > 0,
                waitlistPosition: userWaitlistEntry ? 
                    allWaitlist.documents.indexOf(userWaitlistEntry) + 1 : 0
            });

        } catch (error) {
            console.error('User status tekshirishda xato:', error);
        }
    };

    const handlePreOrder = async () => {
        if (!currentUserId) {
            toast.warning('Oldindan buyurtma berish uchun tizimga kiring');
            return;
        }
        
        if (!PREORDER_COLLECTION_ID) {
            toast.error('Pre-order tizimi hali sozlanmagan');
            return;
        }

        setLoading(true);
        try {
            // Create pre-order entry
            await databases.createDocument(
                DATABASE_ID,
                PREORDER_COLLECTION_ID,
                ID.unique(),
                {
                    bookId: book.$id,
                    userId: currentUserId,
                    bookTitle: book.title,
                    bookPrice: book.price,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    estimatedDelivery: book.expectedRestockDate || book.estimatedDelivery
                }
            );

            // Update book pre-order count
            await databases.updateDocument(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                book.$id,
                {
                    preOrderCount: (book.preOrderCount || 0) + 1
                }
            );

            toast.success('Oldindan buyurtma muvaffaqiyatli berildi!');
            checkUserStatus();

        } catch (error) {
            console.error('Pre-order xatosi:', error);
            toast.error('Oldindan buyurtma berishda xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinWaitlist = async () => {
        if (!currentUserId) {
            toast.warning('Navbatga qo\'shilish uchun tizimga kiring');
            return;
        }
        
        if (!WAITLIST_COLLECTION_ID) {
            toast.error('Waitlist tizimi hali sozlanmagan');
            return;
        }

        setLoading(true);
        try {
            // Create waitlist entry
            await databases.createDocument(
                DATABASE_ID,
                WAITLIST_COLLECTION_ID,
                ID.unique(),
                {
                    bookId: book.$id,
                    userId: currentUserId,
                    bookTitle: book.title,
                    status: 'waiting',
                    createdAt: new Date().toISOString(),
                    notificationSent: false
                }
            );

            // Update book waitlist count
            await databases.updateDocument(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                book.$id,
                {
                    waitlistCount: (book.waitlistCount || 0) + 1
                }
            );

            toast.success('Navbatga muvaffaqiyatli qo\'shildingiz!');
            checkUserStatus();

        } catch (error) {
            console.error('Waitlist xatosi:', error);
            toast.error('Navbatga qo\'shilishda xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveWaitlist = async () => {
        setLoading(true);
        try {
            // Find and delete waitlist entry
            const waitlistQuery = await databases.listDocuments(
                DATABASE_ID,
                WAITLIST_COLLECTION_ID,
                [
                    Query.equal('bookId', book.$id),
                    Query.equal('userId', currentUserId),
                    Query.equal('status', 'waiting')
                ]
            );

            if (waitlistQuery.documents.length > 0) {
                await databases.deleteDocument(
                    DATABASE_ID,
                    WAITLIST_COLLECTION_ID,
                    waitlistQuery.documents[0].$id
                );

                // Update book waitlist count
                await databases.updateDocument(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    book.$id,
                    {
                        waitlistCount: Math.max(0, (book.waitlistCount || 0) - 1)
                    }
                );

                toast.success('Navbatdan chiqarildingiz');
                checkUserStatus();
            }

        } catch (error) {
            console.error('Waitlist`dan chiqish xatosi:', error);
            toast.error('Navbatdan chiqishda xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    // Pre-order button
    if (canPreOrder(book) && !userStatus.hasPreOrder) {
        return (
            <div className="pre-order-waitlist">
                <button
                    className="pre-order-btn"
                    onClick={handlePreOrder}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Yuklanmoqda...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-calendar-plus"></i>
                            Oldindan buyurtma berish
                        </>
                    )}
                </button>
                
                {book.expectedRestockDate && (
                    <div className="restock-info">
                        <i className="fas fa-clock"></i>
                        Kutilayotgan sana: {formatRestockDate(book.expectedRestockDate)}
                    </div>
                )}
                
                {book.preOrderCount > 0 && (
                    <div className="pre-order-count">
                        {book.preOrderCount} kishi oldindan buyurtma bergan
                    </div>
                )}
            </div>
        );
    }

    // Already pre-ordered
    if (userStatus.hasPreOrder) {
        return (
            <div className="pre-order-waitlist">
                <div className="status-message success">
                    <i className="fas fa-check-circle"></i>
                    Siz allaqachon oldindan buyurtma bergansiz
                </div>
                {book.expectedRestockDate && (
                    <div className="restock-info">
                        <i className="fas fa-clock"></i>
                        Kutilayotgan sana: {formatRestockDate(book.expectedRestockDate)}
                    </div>
                )}
            </div>
        );
    }

    // Waitlist button
    if (canJoinWaitlist(book) && !userStatus.inWaitlist) {
        return (
            <div className="pre-order-waitlist">
                <button
                    className="waitlist-btn"
                    onClick={handleJoinWaitlist}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Yuklanmoqda...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-bell"></i>
                            Navbatga qo'shilish
                        </>
                    )}
                </button>
                
                <div className="waitlist-info">
                    <p>Kitob mavjud bo'lganda sizga xabar beramiz</p>
                    {book.waitlistCount > 0 && (
                        <span>{book.waitlistCount} kishi navbatda</span>
                    )}
                </div>
            </div>
        );
    }

    // Already in waitlist
    if (userStatus.inWaitlist) {
        return (
            <div className="pre-order-waitlist">
                <div className="status-message info">
                    <i className="fas fa-bell"></i>
                    Siz navbatdasiz (#{userStatus.waitlistPosition})
                </div>
                
                <button
                    className="leave-waitlist-btn"
                    onClick={handleLeaveWaitlist}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Yuklanmoqda...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-times"></i>
                            Navbatdan chiqish
                        </>
                    )}
                </button>
            </div>
        );
    }

    return null;
}

export default PreOrderWaitlist;