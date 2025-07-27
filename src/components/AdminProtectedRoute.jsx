// Admin Protected Route - faqat adminlar kirishi mumkin
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { account, databases, Query } from '../appwriteConfig';

// Database import'lari olib tashlandi - faqat Auth ishlatamiz

const AdminProtectedRoute = ({ children }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                // Avval login tekshirish
                const authUser = await account.get();
                
                // Faqat Auth labels'dan admin tekshirish (xavfsiz usul)
                const finalAdminStatus = authUser.labels?.includes('admin') || false;
                
                console.log('Admin tekshirish:', {
                    authLabels: authUser.labels,
                    isAdmin: finalAdminStatus
                });
                
                if (finalAdminStatus) {
                    setIsAdmin(true);
                } else {
                    console.error('Admin huquqlari yo\'q');
                    navigate('/', { replace: true });
                }
                
            } catch (error) {
                console.error('Admin tekshirishda xato:', error);
                navigate('/auth', { replace: true });
            } finally {
                setLoading(false);
            }
        };

        checkAdminAccess();
    }, [navigate]);

    if (loading) {
        return (
            <div className="container" style={{ 
                padding: '50px', 
                textAlign: 'center',
                minHeight: '50vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '20px' }}></i>
                    <p>Admin huquqlari tekshirilmoqda...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="container" style={{ 
                padding: '50px', 
                textAlign: 'center',
                minHeight: '50vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#ff5252', marginBottom: '20px' }}></i>
                    <h2>Ruxsat yo'q</h2>
                    <p>Bu sahifaga kirish uchun admin huquqlari kerak.</p>
                </div>
            </div>
        );
    }

    return children;
};

export default AdminProtectedRoute;