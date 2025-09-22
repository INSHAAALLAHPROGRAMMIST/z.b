// Admin Protected Route - Firebase bilan
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminAuth } from '../utils/adminAuth';

const AdminProtectedRoute = ({ children }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdminAccess = () => {
            try {
                // Test admin auth
                const currentUser = AdminAuth.getCurrentUser();
                
                if (currentUser && AdminAuth.isAdmin()) {
                    setIsAdmin(true);
                } else {
                    console.log('❌ Admin access denied, redirecting to login');
                    navigate('/admin-login');
                }
            } catch (error) {
                console.error('Admin check error:', error);
                navigate('/admin-login');
            } finally {
                setLoading(false);
            }
        };

        checkAdminAccess();
    }, [navigate]);

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                background: 'linear-gradient(145deg, #0f172a, #1e293b)',
                color: '#f3f4f6'
            }}>
                <div>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                    <p>Admin huquqlar tekshirilmoqda...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                background: 'linear-gradient(145deg, #0f172a, #1e293b)',
                color: '#f3f4f6'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: '#ff5252', marginBottom: '1rem' }}></i>
                    <h2>Ruxsat yo'q</h2>
                    <p>Bu sahifaga kirish uchun admin huquqlari kerak.</p>
                </div>
            </div>
        );
    }

    return children;
};

export default AdminProtectedRoute;