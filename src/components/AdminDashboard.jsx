import React, { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import DashboardOverview from './admin/enhanced/Dashboard/DashboardOverview';
import WebhookMonitor from './WebhookMonitor';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/enhanced-dashboard.css';

function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState('admin');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                
                // Check if user is admin/superadmin
                // For now, default to 'admin', but this should be checked from Firestore
                try {
                    // TODO: Check user role from Firestore users collection
                    // const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    // const userData = userDoc.data();
                    // setUserRole(userData?.role || 'admin');
                    setUserRole('admin'); // Default for now
                } catch (error) {
                    console.error('Error checking user role:', error);
                    setUserRole('admin');
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="admin-dashboard-loading">
                <div className="enhanced-dashboard-overview">
                    <div className="dashboard-header">
                        <div style={{
                            height: '40px',
                            width: '300px',
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 100%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s infinite',
                            borderRadius: '8px'
                        }}></div>
                    </div>
                    <div className="dashboard-content">
                        <div className="dashboard-section">
                            <div className="stats-grid">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="stat-card loading">
                                        <div className="stat-skeleton"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
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

    if (!user) {
        return (
            <div className="admin-dashboard-error">
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: 'var(--text-color)'
                }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '48px', marginBottom: '20px', color: '#ef4444' }}></i>
                    <h2>Kirish talab etiladi</h2>
                    <p>Admin panelga kirish uchun tizimga kiring.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard-container">
            {/* Webhook Security Monitor - Compact */}
            <div style={{ marginBottom: '20px' }}>
                <WebhookMonitor />
            </div>

            {/* Enhanced Dashboard */}
            <DashboardOverview userRole={userRole} />
        </div>
    );
}

export default AdminDashboard;