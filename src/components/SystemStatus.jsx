import React, { useState, useEffect } from 'react';
// Firebase imports
import firebaseService from '../services/FirebaseService';

function SystemStatus() {
    const [status, setStatus] = useState({
        database: 'checking',
        books: 'checking',
        waitlist: 'checking',
        preorder: 'checking'
    });

    useEffect(() => {
        checkSystemStatus();
    }, []);

    const checkSystemStatus = async () => {
        const newStatus = { ...status };

        try {
            // Check database connection
            await databases.list();
            newStatus.database = 'connected';

            // Check books collection
            try {
                await databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, []);
                newStatus.books = 'connected';
            } catch (error) {
                newStatus.books = 'error';
            }

            // Check waitlist collection
            if (WAITLIST_COLLECTION_ID) {
                try {
                    await databases.listDocuments(DATABASE_ID, WAITLIST_COLLECTION_ID, []);
                    newStatus.waitlist = 'connected';
                } catch (error) {
                    newStatus.waitlist = 'error';
                }
            } else {
                newStatus.waitlist = 'not_configured';
            }

            // Check preorder collection
            if (PREORDER_COLLECTION_ID) {
                try {
                    await databases.listDocuments(DATABASE_ID, PREORDER_COLLECTION_ID, []);
                    newStatus.preorder = 'connected';
                } catch (error) {
                    newStatus.preorder = 'error';
                }
            } else {
                newStatus.preorder = 'not_configured';
            }

        } catch (error) {
            newStatus.database = 'error';
            newStatus.books = 'error';
            newStatus.waitlist = 'error';
            newStatus.preorder = 'error';
        }

        setStatus(newStatus);
    };

    const getStatusIcon = (statusValue) => {
        switch (statusValue) {
            case 'connected':
                return { icon: 'fas fa-check-circle', color: '#10b981' };
            case 'error':
                return { icon: 'fas fa-times-circle', color: '#ef4444' };
            case 'not_configured':
                return { icon: 'fas fa-exclamation-triangle', color: '#f59e0b' };
            case 'checking':
            default:
                return { icon: 'fas fa-spinner fa-spin', color: '#6b7280' };
        }
    };

    const getStatusText = (statusValue) => {
        switch (statusValue) {
            case 'connected':
                return 'Ulangan';
            case 'error':
                return 'Xato';
            case 'not_configured':
                return 'Sozlanmagan';
            case 'checking':
            default:
                return 'Tekshirilmoqda...';
        }
    };

    return (
        <div className="system-status">
            <h3>
                <i className="fas fa-server"></i>
                Tizim Holati
            </h3>
            
            <div className="status-grid">
                <div className="status-item">
                    <div className="status-header">
                        <i className="fas fa-database"></i>
                        <span>Database</span>
                    </div>
                    <div className="status-indicator">
                        <i 
                            className={getStatusIcon(status.database).icon}
                            style={{ color: getStatusIcon(status.database).color }}
                        ></i>
                        <span>{getStatusText(status.database)}</span>
                    </div>
                </div>

                <div className="status-item">
                    <div className="status-header">
                        <i className="fas fa-book"></i>
                        <span>Books Collection</span>
                    </div>
                    <div className="status-indicator">
                        <i 
                            className={getStatusIcon(status.books).icon}
                            style={{ color: getStatusIcon(status.books).color }}
                        ></i>
                        <span>{getStatusText(status.books)}</span>
                    </div>
                </div>

                <div className="status-item">
                    <div className="status-header">
                        <i className="fas fa-bell"></i>
                        <span>Waitlist Collection</span>
                    </div>
                    <div className="status-indicator">
                        <i 
                            className={getStatusIcon(status.waitlist).icon}
                            style={{ color: getStatusIcon(status.waitlist).color }}
                        ></i>
                        <span>{getStatusText(status.waitlist)}</span>
                    </div>
                    {status.waitlist === 'not_configured' && (
                        <div className="status-help">
                            <small>Environment variable: VITE_APPWRITE_COLLECTION_WAITLIST_ID</small>
                        </div>
                    )}
                </div>

                <div className="status-item">
                    <div className="status-header">
                        <i className="fas fa-calendar-plus"></i>
                        <span>PreOrder Collection</span>
                    </div>
                    <div className="status-indicator">
                        <i 
                            className={getStatusIcon(status.preorder).icon}
                            style={{ color: getStatusIcon(status.preorder).color }}
                        ></i>
                        <span>{getStatusText(status.preorder)}</span>
                    </div>
                    {status.preorder === 'not_configured' && (
                        <div className="status-help">
                            <small>Environment variable: VITE_APPWRITE_COLLECTION_PREORDER_ID</small>
                        </div>
                    )}
                </div>
            </div>

            <button 
                className="refresh-status-btn"
                onClick={checkSystemStatus}
            >
                <i className="fas fa-sync-alt"></i>
                Yangilash
            </button>

            {/* Setup Instructions */}
            {(status.waitlist === 'not_configured' || status.preorder === 'not_configured') && (
                <div className="setup-instructions">
                    <h4>
                        <i className="fas fa-info-circle"></i>
                        Sozlash Ko'rsatmalari
                    </h4>
                    <ol>
                        <li>Appwrite Console'da yangi collection'lar yarating:</li>
                        <ul>
                            {status.waitlist === 'not_configured' && <li><code>waitlist</code></li>}
                            {status.preorder === 'not_configured' && <li><code>preorder</code></li>}
                        </ul>
                        <li>Environment variables'ni qo'shing:</li>
                        <ul>
                            {status.waitlist === 'not_configured' && (
                                <li><code>VITE_APPWRITE_COLLECTION_WAITLIST_ID=your_waitlist_id</code></li>
                            )}
                            {status.preorder === 'not_configured' && (
                                <li><code>VITE_APPWRITE_COLLECTION_PREORDER_ID=your_preorder_id</code></li>
                            )}
                        </ul>
                        <li>Loyihani qayta ishga tushiring</li>
                        <li>Enhanced Migration'ni ishga tushiring</li>
                    </ol>
                </div>
            )}
        </div>
    );
}

export default SystemStatus;