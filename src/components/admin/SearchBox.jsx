import React from 'react';
import '../../styles/admin.css';

const SearchBox = ({ 
    searchTerm, 
    onSearchChange, 
    placeholder = "Qidirish...",
    onClear,
    title = "Lotin va kiril alifbolarida qidirish mumkin"
}) => {
    return (
        <div className="search-box">
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={onSearchChange}
                title={title}
            />
            <i className="fas fa-search"></i>
            {searchTerm && (
                <button 
                    className="clear-search" 
                    onClick={onClear}
                    title="Qidiruvni tozalash"
                >
                    <i className="fas fa-times"></i>
                </button>
            )}
        </div>
    );
};

export default SearchBox;