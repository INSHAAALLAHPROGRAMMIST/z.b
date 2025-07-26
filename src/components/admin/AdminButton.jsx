import React from 'react';
import '../../styles/admin.css';

const AdminButton = ({ 
    onClick, 
    children, 
    variant = 'primary', // 'primary', 'secondary', 'danger', 'success'
    size = 'medium', // 'small', 'medium', 'large'
    disabled = false,
    className = '',
    title = ''
}) => {
    const getButtonClass = () => {
        let baseClass = 'admin-button';
        
        switch (variant) {
            case 'add':
                baseClass = 'admin-add-button';
                break;
            case 'edit':
                baseClass = 'action-btn edit-btn';
                break;
            case 'delete':
                baseClass = 'action-btn delete-btn';
                break;
            case 'cancel':
                baseClass = 'cancel-btn';
                break;
            case 'submit':
                baseClass = 'submit-btn';
                break;
            case 'pagination':
                baseClass = 'pagination-btn';
                break;
            default:
                baseClass = 'admin-button';
        }
        
        return `${baseClass} ${className}`;
    };

    return (
        <button
            className={getButtonClass()}
            onClick={onClick}
            disabled={disabled}
            title={title}
        >
            {children}
        </button>
    );
};

export default AdminButton;