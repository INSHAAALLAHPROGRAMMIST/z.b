import React, { useState, useEffect } from 'react';
import { databases, Query, ID } from '../appwriteConfig';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinaryConfig';
import { prepareSearchText } from '../utils/transliteration';
import { highlightText } from '../utils/highlightText.jsx';
import ImageUpload from './ImageUpload';
import siteConfig from '../config/siteConfig';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/books.css';
import '../styles/admin/pagination.css';
import '../styles/admin/modal.css';
import '../styles/admin/forms.css';

// Appwrite konsolidan olingan ID'lar
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;

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
    const [bookForm, setBookForm] = useState({
        title: '',
        description: '',
        price: '',
        author: '',
        genres: [],
        publishedYear: '',
        isbn: '',
        pages: '',
        language: '',
        isFeatured: false,
        isNewArrival: false,
        imageFile: null,
        imageUrl: ''
    });

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [bookToDelete, setBookToDelete] = useState(null);

    // Fetch authors and genres
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [authorsResponse, genresResponse] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, AUTHORS_COLLECTION_ID),
                    databases.listDocuments(DATABASE_ID, GENRES_COLLECTION_ID)
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
            const queries = [];

            // Add search and filters
            if (searchTerm) {
                queries.push(Query.search('title', searchTerm));
            }

            if (filterAuthor) {
                queries.push(Query.equal('author.$id', filterAuthor));
            }

            if (filterGenre) {
                queries.push(Query.equal('genres.$id', filterGenre));
            }

            // Add pagination
            queries.push(Query.limit(itemsPerPage));
            queries.push(Query.offset((currentPage - 1) * itemsPerPage));

            const response = await databases.listDocuments(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                queries
            );

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
    const handleBookFormChange = (e) => {
        const { name, value, type, files, checked } = e.target;

        if (type === 'file') {
            setBookForm({
                ...bookForm,
                imageFile: files[0]
            });
        } else if (type === 'checkbox') {
            setBookForm({
                ...bookForm,
                [name]: checked
            });
        } else {
            setBookForm({
                ...bookForm,
                [name]: value
            });
        }
    };

    const openAddBookForm = () => {
        setBookForm({
            title: '',
            description: '',
            price: '',
            author: '',
            genres: [],
            publishedYear: '',
            isbn: '',
            pages: '',
            language: '',
            isFeatured: false,
            isNewArrival: false,
            imageFile: null,
            imageUrl: ''
        });
        setBookFormMode('add');
        setShowBookForm(true);
    };

    const openEditBookForm = (book) => {
        setSelectedBook(book);
        setBookForm({
            title: book.title || '',
            description: book.description || '',
            price: book.price || '',
            author: book.author?.$id || '',
            genres: book.genres || [],
            publishedYear: book.publishedYear || '',
            isbn: book.isbn || '',
            pages: book.pages || '',
            language: book.language || '',
            isFeatured: book.isFeatured || false,
            isNewArrival: book.isNewArrival || false,
            imageFile: null,
            imageUrl: book.imageUrl || ''
        });
        setBookFormMode('edit');
        setShowBookForm(true);
    };

    const closeBookForm = () => {
        setShowBookForm(false);
        setSelectedBook(null);
    };

    const handleBookSubmit = async (e) => {
        e.preventDefault();

        try {
            let imageUrl = bookForm.imageUrl;

            // Upload image to Cloudinary if provided
            if (bookForm.imageFile) {
                try {
                    const uploadResult = await uploadToCloudinary(bookForm.imageFile, 'books');
                    imageUrl = uploadResult.url;
                } catch (uploadError) {
                    console.error('Cloudinary yuklash xatosi:', uploadError);
                    alert('Rasm yuklashda xato yuz berdi. Iltimos, qaytadan urinib ko\'ring yoki boshqa rasm tanlang.');
                    return; // Form submit'ni to'xtatish
                }
            }

            const bookData = {
                title: bookForm.title,
                description: bookForm.description,
                price: parseFloat(bookForm.price),
                author: bookForm.author,
                genres: bookForm.genres,
                publishedYear: bookForm.publishedYear ? parseInt(bookForm.publishedYear) : null,
                isbn: bookForm.isbn,
                pages: bookForm.pages ? parseInt(bookForm.pages) : null,
                language: bookForm.language,
                isFeatured: bookForm.isFeatured,
                isNewArrival: bookForm.isNewArrival,
                imageUrl: imageUrl
            };

            if (bookFormMode === 'add') {
                // Create new book
                await databases.createDocument(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    ID.unique(),
                    bookData
                );
            } else {
                // Update existing book
                await databases.updateDocument(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    selectedBook.$id,
                    bookData
                );
            }

            // Close form and refresh books
            closeBookForm();
            fetchBooks();

        } catch (err) {
            console.error("Kitobni saqlashda xato:", err);
            alert(`Kitobni saqlashda xato: ${err.message}`);
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

            // Appwrite'dan kitobni o'chirish
            await databases.deleteDocument(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                bookToDelete.$id
            );

            // Close modal and refresh books
            closeDeleteConfirm();
            fetchBooks();

        } catch (err) {
            console.error("Kitobni o'chirishda xato:", err);
            alert(`Kitobni o'chirishda xato: ${err.message}`);
        }
    };

    // Calculate pagination
    const totalPages = Math.ceil(totalBooks / itemsPerPage);
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="admin-book-management" style={{ marginTop: `${siteConfig.layout.contentSpacing}px` }}>
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

                <button className="admin-add-button" onClick={openAddBookForm}>
                    <i className="fas fa-plus"></i> Yangi kitob
                </button>
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
                                {books.length > 0 ? (
                                    books.map(book => (
                                        <tr key={book.$id}>
                                            <td className="book-image">
                                                <img
                                                    src={book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                                                    alt={book.title}
                                                    loading="lazy"
                                                />
                                            </td>
                                            <td className="book-title">
                                                <div className="book-title-text">{searchTerm ? highlightText(book.title, searchTerm) : book.title}</div>
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
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="no-data">
                                            <i className="fas fa-book-open"></i>
                                            <p>Kitoblar topilmadi</p>
                                        </td>
                                    </tr>
                                )}
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

            {/* Book Form Modal */}
            {showBookForm && (
                <div className="admin-modal">
                    <div className="admin-modal-content">
                        <div className="admin-modal-header">
                            <h3>{bookFormMode === 'add' ? 'Yangi kitob qo\'shish' : 'Kitobni tahrirlash'}</h3>
                            <button className="close-btn" onClick={closeBookForm}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="admin-modal-body">
                            <form onSubmit={handleBookSubmit} className="admin-form">
                                <div className="form-group">
                                    <label htmlFor="title">Sarlavha</label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={bookForm.title}
                                        onChange={handleBookFormChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Tavsif</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={bookForm.description}
                                        onChange={handleBookFormChange}
                                        rows="4"
                                    ></textarea>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="price">Narx (so'm)</label>
                                        <input
                                            type="number"
                                            id="price"
                                            name="price"
                                            value={bookForm.price}
                                            onChange={handleBookFormChange}
                                            required
                                            min="0"
                                            step="1000"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="publishedYear">Nashr yili</label>
                                        <input
                                            type="number"
                                            id="publishedYear"
                                            name="publishedYear"
                                            value={bookForm.publishedYear}
                                            onChange={handleBookFormChange}
                                            min="1800"
                                            max={new Date().getFullYear()}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="author">Muallif</label>
                                        <select
                                            id="author"
                                            name="author"
                                            value={bookForm.author}
                                            onChange={handleBookFormChange}
                                            required
                                        >
                                            <option value="">Muallifni tanlang</option>
                                            {authors.map(author => (
                                                <option key={author.$id} value={author.$id}>
                                                    {author.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="genres">Janrlar</label>
                                        <div className="checkbox-group">
                                            {genres.map(genre => (
                                                <div key={genre.$id} className="checkbox-item">
                                                    <input
                                                        type="checkbox"
                                                        id={`genre-${genre.$id}`}
                                                        name="genres"
                                                        value={genre.$id}
                                                        checked={bookForm.genres.includes(genre.$id)}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setBookForm(prev => ({
                                                                ...prev,
                                                                genres: e.target.checked
                                                                    ? [...prev.genres, value]
                                                                    : prev.genres.filter(g => g !== value)
                                                            }));
                                                        }}
                                                    />
                                                    <label htmlFor={`genre-${genre.$id}`}>{genre.name}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="isbn">ISBN</label>
                                        <input
                                            type="text"
                                            id="isbn"
                                            name="isbn"
                                            value={bookForm.isbn}
                                            onChange={handleBookFormChange}
                                            placeholder="978-3-16-148410-0"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="pages">Sahifalar soni</label>
                                        <input
                                            type="number"
                                            id="pages"
                                            name="pages"
                                            value={bookForm.pages}
                                            onChange={handleBookFormChange}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="language">Til</label>
                                        <input
                                            type="text"
                                            id="language"
                                            name="language"
                                            value={bookForm.language}
                                            onChange={handleBookFormChange}
                                            placeholder="O'zbek, Rus, Ingliz..."
                                        />
                                    </div>

                                    <div className="form-group checkbox-container">
                                        <div className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                id="isFeatured"
                                                name="isFeatured"
                                                checked={bookForm.isFeatured}
                                                onChange={handleBookFormChange}
                                            />
                                            <label htmlFor="isFeatured">Tavsiya etilgan</label>
                                        </div>

                                        <div className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                id="isNewArrival"
                                                name="isNewArrival"
                                                checked={bookForm.isNewArrival}
                                                onChange={handleBookFormChange}
                                            />
                                            <label htmlFor="isNewArrival">Yangi kelgan</label>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Kitob rasmi</label>
                                    <ImageUpload
                                        imagePreview={bookForm.imageFile
                                            ? URL.createObjectURL(bookForm.imageFile)
                                            : bookForm.imageUrl}
                                        onImageChange={(file) => setBookForm({ ...bookForm, imageFile: file })}
                                        label="Kitob rasmi tanlash"
                                    />
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="cancel-btn" onClick={closeBookForm}>
                                        Bekor qilish
                                    </button>
                                    <button type="submit" className="submit-btn">
                                        {bookFormMode === 'add' ? 'Qo\'shish' : 'Saqlash'}
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
        </div>
    );
}

export default AdminBookManagement;