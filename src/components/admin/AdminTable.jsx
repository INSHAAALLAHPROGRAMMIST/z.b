import React from 'react';
import '../../styles/admin.css';

const AdminTable = ({ 
    columns, 
    data, 
    loading = false, 
    error = null,
    noDataMessage = "Ma'lumotlar topilmadi",
    className = ''
}) => {
    if (loading) {
        return <div className="admin-loading">Yuklanmoqda...</div>;
    }

    if (error) {
        return <div className="admin-error">Xato: {error}</div>;
    }

    return (
        <div className="admin-table-container">
            <table className={`admin-table ${className}`}>
                <thead>
                    <tr>
                        {columns.map((column, index) => (
                            <th key={index} style={column.width ? { width: column.width } : {}}>
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data && data.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map((column, colIndex) => (
                                    <td 
                                        key={colIndex} 
                                        className={column.className || ''}
                                        data-label={column.header}
                                    >
                                        {column.render ? column.render(row, rowIndex) : row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="no-data">
                                {noDataMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AdminTable;