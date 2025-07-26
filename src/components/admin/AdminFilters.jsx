import React from 'react';
import SearchBox from './SearchBox';
import AdminButton from './AdminButton';
import '../../styles/admin.css';

const AdminFilters = ({ 
    searchTerm, 
    onSearchChange, 
    onSearchClear,
    searchPlaceholder,
    onAddClick,
    addButtonText = "Yangi qo'shish",
    addButtonIcon = "fas fa-plus",
    children // Qo'shimcha filterlar uchun
}) => {
    return (
        <div className="admin-filters">
            <SearchBox
                searchTerm={searchTerm}
                onSearchChange={onSearchChange}
                onClear={onSearchClear}
                placeholder={searchPlaceholder}
            />
            
            {children}
            
            <AdminButton variant="add" onClick={onAddClick}>
                <i className={addButtonIcon}></i> {addButtonText}
            </AdminButton>
        </div>
    );
};

export default AdminFilters;