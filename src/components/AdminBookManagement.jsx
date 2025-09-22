import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BooksAdmin, AuthorsAdmin, GenresAdmin } from '../utils/firebaseAdmin';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinaryConfig';

import { highlightText } from '../utils/highlightText.jsx';
import { toastMessages, toast } from '../utils/toastUtils';
import { generateSlug, generateAuthorSlug } from '../utils/slugUtils';
import ImageUpload from './ImageUpload';
import ResponsiveImage from './ResponsiveImage';
import ImageModal from './ImageModal';
import EnhancedBookForm from './admin/EnhancedBookForm';
import CloudinaryService from '../services/CloudinaryService';

import '../index.css';
import '../styles/admin.css';
import '../styles/admin/books.css';
import '../styles/admin/pagination.css';
import '../styles/admin/modal.css';
import '../styles/admin/forms.css';
import '../styles/responsive-images.css';
import '../styles/admin/improved-books.css';
import '../styles/admin/enhanced-book-form-modal.css';

function AdminBookManagement() {
    const [books, setBooks] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAuthor, setFilterAuthor] = useState('');
    const [filterGenre, setFilterGenre] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalBooks, setTotalBooks] = useState(0);

    // Book form
    const [showBookForm, setShowBookForm] = useState(false);
    const [bookFormMode, setBookFormMode] = useState('add'); // 'add' or 'edit'
    const [selectedBook, setSelectedBook] = useState(null);
    const [bookFormData, setBookFormData] = useState({});
    const [formLoading, setFormLoading] = useState(false);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [bookToDelete, setBookToDelete] = useState(null);
    
    // New author form states
    const [showNewAuthorForm, setShowNewAuthorForm] = useState(false);
    const [newAuthorForm, setNewAuthorForm] = useState({ name: '', bio: '' });
    
    // Image modal state
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [modalImageSrc, setModalImageSrc] = useState('');

    // Fetch authors and genres
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [authorsResponse, genresResponse] = await Promise.all([
                    AuthorsAdmin.listDocuments(),
                    GenresAdmin.listDocuments()
                ]);

                setAuthors(authorsResponse.documents);
                setGenres(genresResponse.documents);
            } catch (err) {
                console.error("Filtr ma'lumotlarini yuklashda xato:", err);
            }
        };

        fetchFilters();
    }, []);

    // Fetch books
    const fetchBooks = async () => {
        setLoading(true);
        setError(null);

        try {
            const filters = {};

            // Add search and filters
            if (searchTerm) {
                filters.search = searchTerm;
            }

            if (filterAuthor) {
                filters.authorId = filterAuthor;
            }

            if (filterGenre) {
                filters.genreId = filterGenre;
            }

            // Add pagination
            filters.limit = itemsPerPage;
            filters.offset = (currentPage - 1) * itemsPerPage;

            const response = await BooksAdmin.listDocuments(filters);

            setBooks(response.documents);
            setTotalBooks(response.total);
            setLoading(false);
        } catch (err) {
            console.error("Kitoblarni yuklashda xato:", err);
            setError(err.message || "Kitoblarni yuklashda noma'lum xato yuz berdi.");
            setLoading(false);
        }
    };

    // Fetch books when filters or pagination changes
    useEffect(() => {
        fetchBooks();
    }, [searchTerm, filterAuthor, filterGenre, currentPage, itemsPerPage]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on new search
    };

    // Handle filter changes
    const handleAuthorFilterChange = (e) => {
        setFilterAuthor(e.target.value);
        setCurrentPage(1);
    };

    const handleGenreFilterChange = (e) => {
        setFilterGenre(e.target.value);
        setCurrentPage(1);
    };

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    // Book form handlers
    const openAddBookForm = () => {
        setBookFormData({
            title: '',
            description: '',
            price: '',
            author: '',
            genres: [],
            publishedYear: '',
            isbn: '',
            pages: '',
            language: 'uz',
            isFeatured: false,
            isNewArrival: false,
            images: []
        });
        setBookFormMode('add');
        setSelectedBook(null);
        setShowBookForm(true);
    };

    const openEditBookForm = (book) => {
        setSelectedBook(book);
        
        // Convert existing book data to EnhancedBookForm format
        const existingImages = book.imageUrl ? [{
            url: book.imageUrl,
            publicId: extractPublicIdFromUrl(book.imageUrl),
            isExisting: true
        }] : [];

        setBookFormData({
            title: book.title || '',
            description: book.description || '',
            price: book.price?.toString() || '',
            author: book.author?.$id || '',
            genres: Array.isArray(book.genres) ? book.genres.map(g => g.$id || g) : [],
            publishedYear: book.publishedYear?.toString() || '',
            isbn: book.isbn || '',
            pages: book.pages?.toString() || '',
            language: book.language || 'uz',
            isFeatured: book.isFeatured || false,
            isNewArrival: book.isNewArrival || false,
            images: existingImages
        });
        setBookFormMode('edit');
        setShowBookForm(true);
    };

    const closeBookForm = () => {
        setShowBookForm(false);
        setSelectedBook(null);
        setBookFormData({});
        setFormLoading(false);
        setShowNewAuthorForm(false);
        setNewAuthorForm({ name: '', bio: '' });
    };

    // Helper function to extract public ID from Cloudinary URL
    const extractPublicIdFromUrl = (url) => {
        if (!url || !url.includes('cloudinary.com')) return null;
        
        try {
            const urlParts = url.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            if (uploadIndex === -1) return null;
            
            const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
            const publicIdWithExtension = pathAfterUpload.split('.')[0];
            return publicIdWithExtension;
        } catch (error) {
            console.error('Error extracting public ID:', error);
            return null;
        }
    };
    
    // New author form handlers
    const handleNewAuthorChange = (e) => {
        const { name, value } = e.target;
        setNewAuthorForm(prev => ({ ...prev, [name]: value }));
    };
    
    const handleNewAuthorSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Generate slug for new author
            const slug = generateAuthorSlug(newAuthorForm.name);
            
            const authorData = {
                name: newAuthorForm.name,
                bio: newAuthorForm.bio,
                slug: slug,
                profilePictureUrl: '' // Default empty
            };
            
            // Create new author
            const newAuthor = await AuthorsAdmin.createDocument(authorData);
            
            // Refresh authors list
            const authorsResponse = await AuthorsAdmin.listDocuments();
            setAuthors(authorsResponse.documents);
            
            // Select the new author in book form
            setBookForm(prev => ({ ...prev, author: newAuthor.$id }));
            
            // Close new author form
            setShowNewAuthorForm(false);
            setNewAuthorForm({ name: '', bio: '' });
            
            toast.success(`✅ Yangi muallif yaratildi: "${newAuthorForm.name}"`);
            
        } catch (error) {
            console.error('Yangi muallif yaratishda xato:', error);
            toast.error('Muallif yaratishda xato yuz berdi');
        }
    };

    const handleBookSubmit = async (formData) => {
        setFormLoading(true);

        try {
            // Process images - upload new ones and keep existing ones
            let primaryImageUrl = '';
            const processedImages = [];

            for (const image of formData.images) {
                if (image.isExisting) {
                    // Keep existing image
                    processedImages.push(image.url);
                    if (!primaryImageUrl) primaryImageUrl = image.url;
                } else if (image.file) {
                    // Upload new image using CloudinaryService
                    const cloudinaryService = new CloudinaryService();
                    const uploadResult = await cloudinaryService.uploadImage(image.file, {
                        folder: 'books',
                        transformation: [
                            { width: 800, height: 1200, crop: 'fill', quality: 'auto' },
                            { format: 'auto' }
                        ]
                    });
                    
                    processedImages.push(uploadResult.secure_url);
                    if (!primaryImageUrl) primaryImageUrl = uploadResult.secure_url;
                }
            }

            // Get author name for slug generation
            const authorName = authors.find(a => a.$id === formData.author)?.name || '';
            
            // Generate slug automatically
            const slug = generateSlug(formData.title, authorName);

            const bookData = {
                title: formData.title,
                description: formData.description,
                price: parseFloat(formData.price),
                author: formData.author,
                genres: formData.genres,
                publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : null,
                isbn: formData.isbn,
                pages: formData.pages ? parseInt(formData.pages) : null,
                language: formData.language,
                isFeatured: formData.isFeatured,
                isNewArrival: formData.isNewArrival,
                imageUrl: primaryImageUrl, // Primary image for backward compatibility
                images: processedImages, // All images array
                slug: slug // Auto-generated slug
            };

            if (bookFormMode === 'add') {
                // Create new book
                await BooksAdmin.createDocument(bookData);
                
                // Success message with slug info
                toast.success(`✅ Kitob yaratildi!\n📖 "${formData.title}"\n🔗 URL: /kitob/${slug}`);
            } else {
                // Delete old images that are no longer used
                if (selectedBook?.imageUrl && !processedImages.includes(selectedBook.imageUrl)) {
                    try {
                        const publicId = extractPublicIdFromUrl(selectedBook.imageUrl);
                        if (publicId) {
                            const cloudinaryService = new CloudinaryService();
                            await cloudinaryService.deleteImage(publicId);
                        }
                    } catch (deleteError) {
                        console.warn('Failed to delete old image:', deleteError);
                    }
                }

                // Update existing book
                await BooksAdmin.updateDocument(selectedBook.$id, bookData);
                
                // Success message with slug info
                toast.success(`✅ Kitob yangilandi!\n📖 "${formData.title}"\n🔗 URL: /kitob/${slug}`);
            }

            // Close form and refresh books
            closeBookForm();
            fetchBooks();

        } catch (err) {
            console.error("Kitobni saqlashda xato:", err);
            toast.error(`Kitobni saqlashda xato: ${err.message}`);
        } finally {
            setFormLoading(false);
        }
    };

    // Delete book handlers
    const openDeleteConfirm = (book) => {
        setBookToDelete(book);
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        setBookToDelete(null);
    };

    const handleDeleteBook = async () => {
        try {
            // Cloudinary'dan rasmni o'chirish (agar mavjud bo'lsa)
            if (bookToDelete.imageUrl && bookToDelete.imageUrl.includes('cloudinary.com')) {
                const urlParts = bookToDelete.imageUrl.split('/');
                const publicIdWithExtension = urlParts[urlParts.length - 1];
                const publicId = `books/${publicIdWithExtension.split('.')[0]}`;
                await deleteFromCloudinary(publicId);
            }

            // Firebase'dan kitobni o'chirish
            await BooksAdmin.deleteDocument(bookToDelete.$id);

            // Close modal and refresh books
            closeDeleteConfirm();
            fetchBooks();

        } catch (err) {
            console.error("Kitobni o'chirishda xato:", err);
            toast.error(`Kitobni o'chirishda xato: ${err.message}`);
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(totalBooks / itemsPerPage);
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="admin-book-management">
            {/* Header */}
            <div className="books-header">
                <div>
                    <h1 className="books-title">
                        <i className="fas fa-book"></i>
                        Kitoblar Boshqaruvi
                    </h1>
                    <div className="books-stats">
                        <span className="stat-badge">Jami: {totalBooks} ta kitob</span>
                        <span className="stat-badge">Sahifa: {currentPage}/{totalPages}</span>
                    </div>
                </div>
                <button className="admin-add-button" onClick={openAddBookForm}>
                    <i className="fas fa-plus"></i> Yangi kitob
                </button>
            </div>

            {/* Filters and Search */}
            <div className="admin-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Kitob nomini qidirish..."
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

                <div className="filter-group">
                    <select
                        value={filterAuthor}
                        onChange={handleAuthorFilterChange}
                    >
                        <option value="">Barcha mualliflar</option>
                        {authors.map(author => (
                            <option key={author.$id} value={author.$id}>
                                {author.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterGenre}
                        onChange={handleGenreFilterChange}
                    >
                        <option value="">Barcha janrlar</option>
                        {genres.map(genre => (
                            <option key={genre.$id} value={genre.$id}>
                                {genre.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Books Display */}
            {loading ? (
                <div className="admin-loading">
                    <div className="loading-spinner"></div>
                    <p>Kitoblar yuklanmoqda...</p>
                </div>
            ) : error ? (
                <div className="admin-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>Xato: {error}</p>
                </div>
            ) : books.length === 0 ? (
                <div className="books-empty">
                    <i className="fas fa-book-open"></i>
                    <h3>Kitoblar topilmadi</h3>
                    <p>Hozircha hech qanday kitob qo'shilmagan yoki qidiruv natijasida hech narsa topilmadi.</p>
                    <button className="admin-add-button" onClick={openAddBookForm}>
                        <i className="fas fa-plus"></i> Birinchi kitobni qo'shish
                    </button>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="admin-table-container">
                        <table className="admin-table books-table">
                            <thead>
                                <tr>
                                    <th>Rasm</th>
                                    <th>Sarlavha</th>
                                    <th>Muallif</th>
                                    <th>Janr</th>
                                    <th>Narx</th>
                                    <th>Yil</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map(book => (
                                    <tr key={book.$id}>
                                        <td className="book-image">
                                            <ResponsiveImage
                                                src={book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                                                alt={book.title}
                                                isProtected={false}
                                                className="admin-book-image-small"
                                                context="admin-thumb"
                                                onClick={() => {
                                                    setModalImageSrc(book.imageUrl);
                                                    setIsImageModalOpen(true);
                                                }}
                                            />
                                        </td>
                                        <td className="book-title">
                                            <Link 
                                                to={book.slug ? `/kitob/${book.slug}` : `/book/${book.$id}`} 
                                                className="book-title-link"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <div className="book-title-text">{searchTerm ? highlightText(book.title, searchTerm) : book.title}</div>
                                            </Link>
                                            {book.description && (
                                                <div className="book-description">
                                                    {searchTerm
                                                        ? highlightText(book.description.length > 100
                                                            ? book.description.substring(0, 100) + '...'
                                                            : book.description, searchTerm)
                                                        : (book.description.length > 100
                                                            ? book.description.substring(0, 100) + '...'
                                                            : book.description)
                                                    }
                                                </div>
                                            )}
                                            {/* Badges */}
                                            {(book.isFeatured || book.isNewArrival) && (
                                                <div className="book-badges" style={{ marginTop: '8px' }}>
                                                    {book.isFeatured && <span className="book-badge badge-featured">Tavsiya</span>}
                                                    {book.isNewArrival && <span className="book-badge badge-new">Yangi</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td>{searchTerm ? highlightText(book.author?.name || 'Noma\'lum', searchTerm) : (book.author?.name || 'Noma\'lum')}</td>
                                        <td>{book.genres && book.genres.length > 0 ? (
                                            searchTerm
                                                ? highlightText(book.genres.map(g => g.name || g).join(', '), searchTerm)
                                                : book.genres.map(g => g.name || g).join(', ')
                                        ) : 'Janr belgilanmagan'}</td>
                                        <td className="book-price">{parseFloat(book.price).toLocaleString()} so'm</td>
                                        <td>{book.publishedYear || '-'}</td>
                                        <td className="book-actions">
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={() => openEditBookForm(book)}
                                                title="Tahrirlash"
                                                aria-label={`${book.title} kitobini tahrirlash`}
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => openDeleteConfirm(book)}
                                                title="O'chirish"
                                                aria-label={`${book.title} kitobini o'chirish`}
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>



                    {/* Pagination */}
                    <div className="admin-pagination">
                        <div className="pagination-info">
                            Jami: {totalBooks} ta kitob,
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

            {/* Enhanced Book Form Modal */}
            {showBookForm && (
                <div className="admin-modal">
                    <div className="admin-modal-content enhanced-book-form-modal">
                        <div className="admin-modal-header">
                            <h3>{bookFormMode === 'add' ? 'Yangi kitob qo\'shish' : 'Kitobni tahrirlash'}</h3>
                            <button className="close-btn" onClick={closeBookForm}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            <EnhancedBookForm
                                initialData={bookFormData}
                                onSubmit={handleBookSubmit}
                                onCancel={closeBookForm}
                                authors={authors.map(author => ({
                                    id: author.$id,
                                    name: author.name
                                }))}
                                genres={genres.map(genre => ({
                                    id: genre.$id,
                                    name: genre.name
                                }))}
                                loading={formLoading}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="admin-modal">
                    <div className="admin-modal-content delete-confirm">
                        <div className="admin-modal-header">
                            <h3>Kitobni o'chirish</h3>
                            <button className="close-btn" onClick={closeDeleteConfirm}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            <p>
                                Haqiqatan ham <strong>{bookToDelete?.title}</strong> kitobini o'chirmoqchimisiz?
                                <br />
                                Bu amalni qaytarib bo'lmaydi.
                            </p>

                            <div className="form-actions">
                                <button className="cancel-btn" onClick={closeDeleteConfirm}>
                                    Bekor qilish
                                </button>
                                <button className="delete-btn" onClick={handleDeleteBook}>
                                    O'chirish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* New Author Modal */}
            {showNewAuthorForm && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <div className="admin-modal-header">
                            <h3>Yangi Muallif Qo'shish</h3>
                            <button 
                                className="close-btn" 
                                onClick={() => setShowNewAuthorForm(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="admin-modal-body">
                            <form onSubmit={handleNewAuthorSubmit} className="admin-form">
                                <div className="form-group">
                                    <label htmlFor="newAuthorName">Muallif ismi *</label>
                                    <input
                                        type="text"
                                        id="newAuthorName"
                                        name="name"
                                        value={newAuthorForm.name}
                                        onChange={handleNewAuthorChange}
                                        placeholder="Masalan: Abdulla Qodiriy"
                                        required
                                    />
                                    {/* Auto-generated slug preview */}
                                    {newAuthorForm.name && (
                                        <div style={{
                                            marginTop: '8px',
                                            padding: '8px 12px',
                                            background: 'rgba(106, 138, 255, 0.1)',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            color: 'var(--primary-color)'
                                        }}>
                                            <strong>🔗 Auto URL:</strong> /muallif/{generateAuthorSlug(newAuthorForm.name)}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="newAuthorBio">Qisqa biografiya</label>
                                    <textarea
                                        id="newAuthorBio"
                                        name="bio"
                                        value={newAuthorForm.bio}
                                        onChange={handleNewAuthorChange}
                                        placeholder="Muallif haqida qisqa ma'lumot..."
                                        rows="3"
                                    />
                                </div>
                                
                                <div className="form-actions">
                                    <button 
                                        type="button" 
                                        className="cancel-btn"
                                        onClick={() => setShowNewAuthorForm(false)}
                                    >
                                        Bekor qilish
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        Muallif Yaratish
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Image Modal */}
            <ImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                imageSrc={modalImageSrc}
                imageAlt="Kitob rasmi"
            />
        </div>
    );
}

export default AdminBookManagement;