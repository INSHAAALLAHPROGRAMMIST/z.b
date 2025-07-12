// src/components/AdminBookManagement.jsx

import React, { useState, useEffect } from 'react';
import { databases, Query } from '../appwriteConfig'; // Appwrite databases va Query import qilamiz
import '../index.css'; // Global CSS faylingiz

// --- Appwrite konsolidan olingan ID'lar (import.meta.env orqali) ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID; // Rasmlar uchun bucket ID

function AdminBookManagement() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // Qidiruv so'zi uchun state
    const [filterAuthor, setFilterAuthor] = useState(''); // Muallif filtri uchun state
    const [filterGenre, setFilterGenre] = useState(''); // Janr filtri uchun state
    const [authors, setAuthors] = useState([]); // Mualliflar ro'yxati (filter uchun)
    const [genres, setGenres] = useState([]);   // Janrlar ro'yxati (filter uchun)

    // Mualliflar va janrlarni yuklash
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const authorsResponse = await databases.listDocuments(DATABASE_ID, AUTHORS_COLLECTION_ID);
                setAuthors(authorsResponse.documents);

                const genresResponse = await databases.listDocuments(DATABASE_ID, GENRES_COLLECTION_ID);
                setGenres(genresResponse.documents);
            } catch (err) {
                console.error("Filtr ma'lumotlarini yuklashda xato:", err);
                // Xatolarni foydalanuvchiga ko'rsatish
            }
        };
        fetchFilters();
    }, []);

    // Kitoblarni yuklash funksiyasi
    const fetchBooks = async () => {
        setLoading(true);
        setError(null);
        try {
            const queries = [];

            if (searchTerm) {
                // Sarlavha yoki muallif nomi bo'yicha qidiruv
                queries.push(Query.or([
                    Query.search('title', searchTerm),
                    // Appwrite da relations bo'yicha search to'g'ridan-to'g'ri ishlamasligi mumkin.
                    // Agar ishlamasa, muallif nomini alohida maydonda saqlash yoki barcha kitoblarni yuklab, keyin Reactda filter qilish kerak bo'ladi.
                    // Hozircha "author.name" ni sinab ko'ramiz.
                    Query.search('author.name', searchTerm)
                ]));
            }

            if (filterAuthor) {
                queries.push(Query.equal('author.$id', filterAuthor)); // Muallif ID bo'yicha filter
            }

            if (filterGenre) {
                queries.push(Query.equal('genre.$id', filterGenre)); // Janr ID bo'yicha filter
            }

            // Kitob ma'lumotlari bilan birga muallif va janr ma'lumotlarini ham olish
            // Appwrite da relationsni olish uchun Query.select() dan foydalanamiz
            queries.push(Query.select(['*', 'author', 'genre']));

            const response = await databases.listDocuments(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                queries
            );
            setBooks(response.documents);
        } catch (err) {
            console.error("Kitoblarni yuklashda xato:", err);
            setError(err.message || "Kitoblarni yuklashda noma'lum xato yuz berdi.");
        } finally {
            setLoading(false);
        }
    };

    // `searchTerm`, `filterAuthor`, `filterGenre` o'zgarganda kitoblarni qayta yuklash
    useEffect(() => {
        fetchBooks();
    }, [searchTerm, filterAuthor, filterGenre]); // Dependency arrayga qo'shildi

    // Qidiruv maydoni o'zgarganda
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Muallif filtri o'zgarganda
    const handleAuthorFilterChange = (e) => {
        setFilterAuthor(e.target.value);
    };

    // Janr filtri o'zgarganda
    const handleGenreFilterChange = (e) => {
        setFilterGenre(e.target.value);
    };

    // Kitobni o'chirish funksiyasi (keyinchalik to'ldiriladi)
    const handleDeleteBook = async (bookId) => {
        if (window.confirm("Haqiqatan ham ushbu kitobni o'chirmoqchimisiz?")) {
            try {
                // TODO: Appwrite dan kitobni o'chirish logikasi
                // databases.deleteDocument(DATABASE_ID, BOOKS_COLLECTION_ID, bookId);
                alert("Kitob o'chirildi (funksionallik hali to'liq emas).");
                fetchBooks(); // Ro'yxatni yangilash
            } catch (err) {
                console.error("Kitobni o'chirishda xato:", err);
                alert("Kitobni o'chirishda xato yuz berdi.");
            }
        }
    };

    // Kitobni tahrirlash funksiyasi (keyinchalik to'ldiriladi)
    const handleEditBook = (book) => {
        alert(`Kitobni tahrirlash: ${book.title} (funksionallik hali to'liq emas)`);
        // TODO: Tahrirlash modalini ochish yoki tahrirlash sahifasiga yo'naltirish
    };

    // Yangi kitob qo'shish funksiyasi (keyinchalik to'ldiriladi)
    const handleAddBook = () => {
        alert("Yangi kitob qo'shish (funksionallik hali to'liq emas)");
        // TODO: Yangi kitob qo'shish modalini ochish
    };

    return (
        <div className="admin-book-management">
            <h2 style={{ color: 'var(--text-color-light)', marginBottom: '25px', fontFamily: 'Montserrat' }}>Kitoblarni Boshqarish</h2>

            <div className="admin-controls glassmorphism-card" style={{ marginBottom: '30px', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 250px' }}>
                    <label htmlFor="search-input" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-color-light)' }}>Qidiruv:</label>
                    <input
                        type="text"
                        id="search-input"
                        placeholder="Nomi, muallifi..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="glassmorphism-input"
                    />
                </div>

                <div style={{ flex: '1 1 150px' }}>
                    <label htmlFor="author-filter" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-color-light)' }}>Muallif:</label>
                    <select
                        id="author-filter"
                        value={filterAuthor}
                        onChange={handleAuthorFilterChange}
                        className="glassmorphism-input"
                    >
                        <option value="">Barcha mualliflar</option>
                        {authors.map(author => (
                            <option key={author.$id} value={author.$id}>{author.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ flex: '1 1 150px' }}>
                    <label htmlFor="genre-filter" style={{ display: 'block', marginBottom: '8px', color: 'var(--text-color-light)' }}>Janr:</label>
                    <select
                        id="genre-filter"
                        value={filterGenre}
                        onChange={handleGenreFilterChange}
                        className="glassmorphism-input"
                    >
                        <option value="">Barcha janrlar</option>
                        {genres.map(genre => (
                            <option key={genre.$id} value={genre.$id}>{genre.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    className="glassmorphism-button"
                    style={{ marginLeft: 'auto', padding: '12px 25px' }}
                    onClick={handleAddBook} // handleAddBook funksiyasini chaqiramiz
                >
                    + Yangi kitob qo'shish
                </button>
            </div>

            {loading && <p style={{ color: 'var(--text-color-light)' }}>Yuklanmoqda...</p>}
            {error && <p style={{ color: 'var(--accent-color)' }}>Xato: {error}</p>}

            {!loading && !error && books.length === 0 && (
                <p style={{ color: 'var(--text-color-light)' }}>Kitoblar topilmadi.</p>
            )}

            {!loading && !error && books.length > 0 && (
                <div className="books-table-container glassmorphism-card" style={{ overflowX: 'auto' }}>
                    <table className="books-table">
                        <thead>
                            <tr>
                                <th>Rasm</th>
                                <th>Sarlavha</th>
                                <th>Muallif</th>
                                <th>Janr</th>
                                <th>Narx</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {books.map(book => (
                                <tr key={book.$id}>
                                    <td>
                                        {/* Tasvirni URL orqali ko'rsatish */}
                                        <img
                                            src={book.imageUrl || 'https://placehold.co/50x75/3A4750/F0F4F8?text=NO+IMG'} // Agar imageUrl bo'lmasa, placeholder rasm
                                            alt={book.title}
                                            style={{ width: '50px', height: '75px', objectFit: 'cover', borderRadius: '5px' }}
                                        />
                                    </td>
                                    <td>{book.title}</td>
                                    <td>{book.author?.name || 'Nomaʼlum'}</td>
                                    <td>{book.genre?.name || 'Nomaʼlum'}</td>
                                    <td>{parseFloat(book.price).toFixed(2)} so'm</td>
                                    <td>
                                        <button
                                            className="glassmorphism-button small-button edit-button"
                                            onClick={() => handleEditBook(book)}
                                        >
                                            Tahrirlash
                                        </button>
                                        <button
                                            className="glassmorphism-button small-button delete-button"
                                            onClick={() => handleDeleteBook(book.$id)}
                                        >
                                            O'chirish
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminBookManagement;