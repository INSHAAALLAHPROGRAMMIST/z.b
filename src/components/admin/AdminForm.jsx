import React from 'react';
import AdminButton from './AdminButton';
import '../../styles/admin.css';
import '../../styles/admin/forms.css';

const AdminForm = ({ 
    onSubmit, 
    children, 
    submitText = "Saqlash",
    cancelText = "Bekor qilish",
    onCancel,
    loading = false
}) => {
    return (
        <form onSubmit={onSubmit} className="admin-form">
            {children}
            
            <div className="form-actions">
                <AdminButton 
                    type="button" 
                    variant="cancel" 
                    onClick={onCancel}
                    disabled={loading}
                >
                    {cancelText}
                </AdminButton>
                <AdminButton 
                    type="submit" 
                    variant="submit"
                    disabled={loading}
                >
                    {loading ? 'Saqlanmoqda...' : submitText}
                </AdminButton>
            </div>
        </form>
    );
};

// Form input komponenti
export const FormGroup = ({ 
    label, 
    children, 
    required = false,
    error = null 
}) => {
    return (
        <div className="form-group">
            <label>
                {label}
                {required && <span className="required">*</span>}
            </label>
            {children}
            {error && <div className="form-error">{error}</div>}
        </div>
    );
};

export default AdminForm;