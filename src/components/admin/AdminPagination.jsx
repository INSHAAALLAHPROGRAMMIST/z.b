import React from 'react';
import AdminButton from './AdminButton';
import '../../styles/admin.css';
import '../../styles/admin/pagination.css';

const AdminPagination = ({ 
    currentPage, 
    totalItems, 
    itemsPerPage, 
    onPageChange, 
    onItemsPerPageChange,
    itemName = "element"
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageNumbers = [];
    
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="admin-pagination">
            <div className="pagination-info">
                Jami: {totalItems} ta {itemName}, 
                <select 
                    value={itemsPerPage} 
                    onChange={onItemsPerPageChange}
                    className="items-per-page"
                >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                </select>
                tadan
            </div>
            
            <div className="pagination-controls">
                <AdminButton 
                    variant="pagination"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    <i className="fas fa-chevron-left"></i>
                </AdminButton>
                
                {pageNumbers.map(number => (
                    <AdminButton
                        key={number}
                        variant="pagination"
                        className={currentPage === number ? 'active' : ''}
                        onClick={() => onPageChange(number)}
                    >
                        {number}
                    </AdminButton>
                ))}
                
                <AdminButton 
                    variant="pagination"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    <i className="fas fa-chevron-right"></i>
                </AdminButton>
            </div>
        </div>
    );
};

export default AdminPagination;