import React from 'react';
import AdminButton from './AdminButton';
import '../../styles/admin.css';
import '../../styles/admin/modal.css';

const AdminModal = ({ 
    isOpen, 
    onClose, 
    title, 
    children,
    size = 'medium' // 'small', 'medium', 'large'
}) => {
    if (!isOpen) return null;

    const getSizeClass = () => {
        switch (size) {
            case 'small':
                return 'admin-modal-small';
            case 'large':
                return 'admin-modal-large';
            default:
                return '';
        }
    };

    return (
        <div className="admin-modal">
            <div className={`admin-modal-content ${getSizeClass()}`}>
                <div className="admin-modal-header">
                    <h3>{title}</h3>
                    <AdminButton 
                        variant="close" 
                        onClick={onClose}
                        className="close-btn"
                    >
                        <i className="fas fa-times"></i>
                    </AdminButton>
                </div>
                
                <div className="admin-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminModal;