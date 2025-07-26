import React, { useState, useEffect } from 'react';
import { databases, Query, ID } from '../appwriteConfig';
import { uploadToCloudinary } from '../config/cloudinaryConfig';
import { prepareSearchText } from '../utils/transliteration';
import { highlightText } from '../utils/highlightText.jsx';
import ImageUpload from './ImageUpload';
import siteConfig from '../config/siteConfig';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/authors.css';
import '../styles/admin/pagination.css';
import '../styles/admin/modal.css';
import '../styles/admin/forms.css';

// Appwrite konsolidan olingan ID'lar
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;

function AdminAuthorManagement() {
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalAuthors, setTotalAuthors] = useState(0);
    
    // Author form
    const [showAuthorForm, setShowAuthorForm] = useState(false);
    const [authorFormMode, setAuthorFormMode] = useState('add'); // 'add' or 'edit'
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [authorForm, setAuthorForm] = useState({
        name: '',
        bio: '',
        imageFile: null,
        imageUrl: ''
    });
    
    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [authorToDelete, setAuthorToDelete] = useState(null);

    // Fetch authors
    const fetchAuthors = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const queries = [];
            
            // Add search
            if (searchTerm) {
                queries.push(Query.search('name', searchTerm));
            }
            
            // Add pagination
            queries.push(Query.limit(itemsPerPage));
            queries.push(Query.offset((currentPage - 1) * itemsPerPage));
            
            const response = await databases.listDocuments(
                DATABASE_ID,
                AUTHORS_COLLECTION_ID,
                queries
            );
            
            setAuthors(response.documents);
            setTotalAuthors(response.total);
            setLoading(false);
        } catch (err) {
            console.error("Mualliflarni yuklashda xato:", err);
            setError(err.message || "Mualliflarni yuklashda noma'lum xato yuz berdi.");
            setLoading(false);
        }
    };

    // Fetch authors when filters or pagination changes
    useEffect(() => {
        fetchAuthors();
    }, [searchTerm, currentPage, itemsPerPage]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on new search
    };

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };
    
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    // Author form handlers
    const handleAuthorFormChange = (e) => {
        const { name, value, type, files } = e.target;
        
        if (type === 'file') {
            setAuthorForm({
                ...authorForm,
                imageFile: files[0]
            });
        } else {
            setAuthorForm({
                ...authorForm,
                [name]: value
            });
        }
    };
    
    const openAddAuthorForm = () => {
        setAuthorForm({
            name: '',
            bio: '',
            imageFile: null,
            imageUrl: ''
        });
        setAuthorFormMode('add');
        setShowAuthorForm(true);
    };
    
    const openEditAuthorForm = (author) => {
        setSelectedAuthor(author);
        setAuthorForm({
            name: author.name || '',
            bio: author.bio || '',
            imageFile: null,
            imageUrl: author.profilePictureUrl || ''
        });
        setAuthorFormMode('edit');
        setShowAuthorForm(true);
    };
    
    const closeAuthorForm = () => {
        setShowAuthorForm(false);
        setSelectedAuthor(null);
    };
    
    const handleAuthorSubmit = async (e) => {
        e.preventDefault();
        
        try {
            let imageUrl = authorForm.imageUrl;
            
            // Upload image to Cloudinary if provided
            if (authorForm.imageFile) {
                try {
                    const uploadResult = await uploadToCloudinary(authorForm.imageFile, 'authors');
                    imageUrl = uploadResult.url;
                } catch (uploadError) {
                    console.error('Cloudinary yuklash xatosi:', uploadError);
                    alert('Rasm yuklashda xato yuz berdi. Iltimos, qaytadan urinib ko\'ring yoki boshqa rasm tanlang.');
                    return; // Form submit'ni to'xtatish
                }
            }
            
            const authorData = {
                name: authorForm.name,
                bio: authorForm.bio,
                profilePictureUrl: imageUrl
            };
            
            if (authorFormMode === 'add') {
                // Create new author
                await databases.createDocument(
                    DATABASE_ID,
                    AUTHORS_COLLECTION_ID,
                    ID.unique(),
                    authorData
                );
            } else {
                // Update existing author
                await databases.updateDocument(
                    DATABASE_ID,
                    AUTHORS_COLLECTION_ID,
                    selectedAuthor.$id,
                    authorData
                );
            }
            
            // Close form and refresh authors
            closeAuthorForm();
            fetchAuthors();
            
        } catch (err) {
            console.error("Muallifni saqlashda xato:", err);
            alert(`Muallifni saqlashda xato: ${err.message}`);
        }
    };

    // Delete author handlers
    const openDeleteConfirm = (author) => {
        setAuthorToDelete(author);
        setShowDeleteConfirm(true);
    };
    
    const closeDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        setAuthorToDelete(null);
    };
    
    const handleDeleteAuthor = async () => {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                AUTHORS_COLLECTION_ID,
                authorToDelete.$id
            );
            
            // Close modal and refresh authors
            closeDeleteConfirm();
            fetchAuthors();
            
        } catch (err) {
            console.error("Muallifni o'chirishda xato:", err);
            alert(`Muallifni o'chirishda xato: ${err.message}`);
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(totalAuthors / itemsPerPage);
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="admin-author-management" style={{ marginTop: `${siteConfig.layout.contentSpacing}px` }}>
            {/* Filters and Search */}
            <div className="admin-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Muallif nomini qidirish..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        title="Lotin va kiril alifbolarida qidirish mumkin"
                    />
                    <i className="fas fa-search"></i>
                    {searchTerm && (
                        <button 
                            className="clear-search" 
                            onClick={() => {
                                setSearchTerm('');
                                setCurrentPage(1);
                            }}
                            title="Qidiruvni tozalash"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
                
                <button className="admin-add-button" onClick={openAddAuthorForm}>
                    <i className="fas fa-plus"></i> Yangi muallif
                </button>
            </div>

            {/* Authors Display */}
            {loading ? (
                <div className="admin-loading">
                    <div className="loading-spinner"></div>
                    <p>Mualliflar yuklanmoqda...</p>
                </div>
            ) : error ? (
                <div className="admin-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Xato: {error}</p>
                </div>
            ) : (
                <>
                    <div className="admin-table-container">
                        <table className="admin-table authors-table">
                            <thead>
                                <tr>
                                    <th>Rasm</th>
                                    <th>Ism</th>
                                    <th>Qisqacha ma'lumot</th>
                                    <th>Kitoblar soni</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {authors.length > 0 ? (
                                    authors.map(author => (
                                        <tr key={author.$id}>
                                            <td className="author-image">
                                                <img
                                                    src={author.profilePictureUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                                                    alt={author.name}
                                                    loading="lazy"
                                                />
                                            </td>
                                            <td className="author-name">
                                                <div className="author-name-text">{searchTerm ? highlightText(author.name, searchTerm) : author.name}</div>
                                            </td>
                                            <td className="author-bio">
                                                {author.bio ? (
                                                    searchTerm 
                                                        ? highlightText(author.bio.length > 100 ? author.bio.substring(0, 100) + '...' : author.bio, searchTerm)
                                                        : (author.bio.length > 100 ? author.bio.substring(0, 100) + '...' : author.bio)
                                                ) : '-'}
                                            </td>
                                            <td>{author.bookCount || 0}</td>
                                            <td className="author-actions">
                                                <button 
                                                    className="action-btn edit-btn" 
                                                    onClick={() => openEditAuthorForm(author)}
                                                    title="Tahrirlash"
                                                    aria-label={`${author.name} muallifini tahrirlash`}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button 
                                                    className="action-btn delete-btn" 
                                                    onClick={() => openDeleteConfirm(author)}
                                                    title="O'chirish"
                                                    aria-label={`${author.name} muallifini o'chirish`}
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="no-data">
                                            <i className="fas fa-user-edit"></i>
                                            <p>Mualliflar topilmadi</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="admin-pagination">
                        <div className="pagination-info">
                            Jami: {totalAuthors} ta muallif, 
                            <select 
                                value={itemsPerPage} 
                                onChange={handleItemsPerPageChange}
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
                            <button 
                                className="pagination-btn" 
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            
                            {pageNumbers.map(number => (
                                <button
                                    key={number}
                                    className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                                    onClick={() => handlePageChange(number)}
                                >
                                    {number}
                                </button>
                            ))}
                            
                            <button 
                                className="pagination-btn" 
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Author Form Modal */}
            {showAuthorForm && (
                <div className="admin-modal">
                    <div className="admin-modal-content">
                        <div className="admin-modal-header">
                            <h3>{authorFormMode === 'add' ? 'Yangi muallif qo\'shish' : 'Muallifni tahrirlash'}</h3>
                            <button className="close-btn" onClick={closeAuthorForm}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="admin-modal-body">
                            <form onSubmit={handleAuthorSubmit} className="admin-form">
                                <div className="form-group">
                                    <label htmlFor="name">Ism</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={authorForm.name}
                                        onChange={handleAuthorFormChange}
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="bio">Biografiya</label>
                                    <textarea
                                        id="bio"
                                        name="bio"
                                        value={authorForm.bio}
                                        onChange={handleAuthorFormChange}
                                        rows="4"
                                    ></textarea>
                                </div>
                                

                                
                                <div className="form-group">
                                    <label>Muallif rasmi</label>
                                    <ImageUpload
                                        imagePreview={authorForm.imageFile 
                                            ? URL.createObjectURL(authorForm.imageFile) 
                                            : authorForm.imageUrl}
                                        onImageChange={(file) => setAuthorForm({...authorForm, imageFile: file})}
                                        label="Muallif rasmi tanlash"
                                    />
                                </div>
                                
                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={closeAuthorForm}>
                                        Bekor qilish
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        {authorFormMode === 'add' ? 'Qo\'shish' : 'Saqlash'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="admin-modal">
                    <div className="admin-modal-content delete-confirm">
                        <div className="admin-modal-header">
                            <h3>Muallifni o'chirish</h3>
                            <button className="close-btn" onClick={closeDeleteConfirm}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="admin-modal-body">
                            <p>
                                Haqiqatan ham <strong>{authorToDelete?.name}</strong> muallifini o'chirmoqchimisiz?
                                <br />
                                <strong className="text-danger">Diqqat:</strong> Bu muallif bilan bog'liq kitoblar ham o'chirilishi mumkin.
                            </p>
                            
                            <div className="form-actions">
                                <button className="cancel-btn" onClick={closeDeleteConfirm}>
                                    Bekor qilish
                                </button>
                                <button className="delete-btn" onClick={handleDeleteAuthor}>
                                    O'chirish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminAuthorManagement;