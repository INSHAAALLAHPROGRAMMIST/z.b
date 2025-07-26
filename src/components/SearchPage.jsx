import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { databases, Query } from '../appwriteConfig';
import LazyImage from './LazyImage';
import { prepareSearchText } from '../utils/transliteration';
import { highlightText } from '../utils/highlightText.jsx';
import '../index.css';

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;

function SearchPage() {
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const searchQuery = new URLSearchParams(location.search).get('q');

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchQuery) {
                setSearchResults([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Appwrite'da fulltext index yo'q bo'lgani uchun oddiy usulda qidiramiz
                const allBooksResponse = await databases.listDocuments(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    [
                        Query.limit(100) // Ko'proq kitoblarni olish
                    ]
                );
                
                // Qidiruv so'rovini lotin va kiril alifbolarida tayyorlash
                const [searchTermLower, searchTermAlternate, searchTermXToH, searchTermHToX] = prepareSearchText(searchQuery);
                
                console.log(`Qidiruv so'rovi: "${searchTermLower}" va uning variantlari: 
                    - Transliteratsiya: "${searchTermAlternate}"
                    - X→H: "${searchTermXToH}"
                    - H→X: "${searchTermHToX}"`);
                
                // Client-side filtering - kitob nomi, muallif, janr va tavsif bo'yicha qidirish
                const filteredBooks = allBooksResponse.documents.filter(book => {
                    // Kitob nomi bo'yicha qidirish
                    if (book.title) {
                        const titleLower = book.title.toLowerCase();
                        if (titleLower.includes(searchTermLower) || 
                            titleLower.includes(searchTermAlternate) ||
                            titleLower.includes(searchTermXToH) ||
                            titleLower.includes(searchTermHToX)) {
                            return true;
                        }
                    }
                    
                    // Muallif ismi bo'yicha qidirish
                    if (book.author && book.author.name) {
                        const authorNameLower = book.author.name.toLowerCase();
                        if (authorNameLower.includes(searchTermLower) || 
                            authorNameLower.includes(searchTermAlternate) ||
                            authorNameLower.includes(searchTermXToH) ||
                            authorNameLower.includes(searchTermHToX)) {
                            return true;
                        }
                    }
                    
                    // Muallif ismi (authorName maydonidan) bo'yicha qidirish
                    if (book.authorName) {
                        const authorNameLower = book.authorName.toLowerCase();
                        if (authorNameLower.includes(searchTermLower) || 
                            authorNameLower.includes(searchTermAlternate) ||
                            authorNameLower.includes(searchTermXToH) ||
                            authorNameLower.includes(searchTermHToX)) {
                            return true;
                        }
                    }
                    
                    // Janr nomi bo'yicha qidirish
                    if (book.genres && book.genres.length > 0) {
                        for (const genre of book.genres) {
                            if (genre.name) {
                                const genreNameLower = genre.name.toLowerCase();
                                if (genreNameLower.includes(searchTermLower) || 
                                    genreNameLower.includes(searchTermAlternate) ||
                                    genreNameLower.includes(searchTermXToH) ||
                                    genreNameLower.includes(searchTermHToX)) {
                                    return true;
                                }
                            }
                        }
                    }
                    
                    // Janr nomi (genreName maydonidan) bo'yicha qidirish
                    if (book.genreName) {
                        const genreNameLower = book.genreName.toLowerCase();
                        if (genreNameLower.includes(searchTermLower) || 
                            genreNameLower.includes(searchTermAlternate) ||
                            genreNameLower.includes(searchTermXToH) ||
                            genreNameLower.includes(searchTermHToX)) {
                            return true;
                        }
                    }
                    
                    // Tavsif bo'yicha qidirish
                    if (book.description) {
                        const descriptionLower = book.description.toLowerCase();
                        if (descriptionLower.includes(searchTermLower) || 
                            descriptionLower.includes(searchTermAlternate) ||
                            descriptionLower.includes(searchTermXToH) ||
                            descriptionLower.includes(searchTermHToX)) {
                            return true;
                        }
                    }
                    
                    return false;
                });
                
                // Natijalarni saqlash
                const response = {
                    documents: filteredBooks,
                    total: filteredBooks.length
                };

                setSearchResults(response.documents);
                setLoading(false);
                
                // Log qo'shish
                console.log(`Qidiruv natijasi: ${response.documents.length} ta kitob topildi`);
            } catch (err) {
                console.error("Qidiruv natijalarini yuklashda xato:", err);
                setError(err.message || "Qidiruv natijalarini yuklashda noma'lum xato yuz berdi.");
                setLoading(false);
            }
        };

        fetchSearchResults();
    }, [searchQuery]);

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>Yuklanmoqda...</div>;
    }

    if (error) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', color: 'red', minHeight: 'calc(100vh - 200px)' }}>Xato: {error}</div>;
    }

    return (
        <div className="container" style={{ 
            padding: '30px 15px', 
            minHeight: 'calc(100vh - 200px)',
            marginTop: '70px'
        }}>
            <h1 className="section-title" style={{ 
                fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
                wordBreak: 'break-word',
                padding: '0 10px'
            }}>"{searchQuery}" uchun qidiruv natijalari</h1>
            <p style={{ textAlign: 'center', marginBottom: '20px', opacity: '0.8' }}>
                Kitob nomi, muallif, janr va tavsif bo'yicha lotin va kiril alifbolarida, 
                shuningdek x/h harflari almashtirilgan holda qidirildi
            </p>
            
            {searchResults.length === 0 ? (
                <div className="glassmorphism-card" style={{ 
                    textAlign: 'center', 
                    padding: '30px 20px',
                    maxWidth: '500px',
                    margin: '30px auto'
                }}>
                    <i className="fas fa-search" style={{ 
                        fontSize: '3rem', 
                        marginBottom: '20px',
                        opacity: '0.5'
                    }}></i>
                    <p style={{ marginBottom: '15px' }}>Hech qanday natija topilmadi.</p>
                    <Link to="/" className="glassmorphism-button">
                        <i className="fas fa-home"></i> Bosh sahifaga qaytish
                    </Link>
                </div>
            ) : (
                <div className="book-grid" style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '20px',
                    justifyContent: 'center'
                }}>
                    {searchResults.map(book => (
                        <Link to={`/book/${book.$id}`} key={book.$id} className="book-card glassmorphism-card" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '15px',
                            height: '100%'
                        }}>
                            <LazyImage 
                                src={book.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'} 
                                alt={book.title}
                                style={{ 
                                    width: '100%', 
                                    height: '200px', 
                                    borderRadius: '10px', 
                                    marginBottom: '15px',
                                    objectFit: 'cover'
                                }}
                            />
                            <div className="book-info" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: '1',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <h3 style={{ 
                                        fontSize: '1rem',
                                        marginBottom: '8px',
                                        lineHeight: '1.3',
                                        display: '-webkit-box',
                                        WebkitLineClamp: '2',
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>{highlightText(book.title, searchQuery)}</h3>
                                    {book.author?.name && <p className="author" style={{ 
                                        fontSize: '0.9rem',
                                        marginBottom: '5px',
                                        opacity: '0.8'
                                    }}>{highlightText(book.author.name, searchQuery)}</p>}
                                    {book.authorName && <p className="author" style={{ 
                                        fontSize: '0.9rem',
                                        marginBottom: '5px',
                                        opacity: '0.8'
                                    }}>{highlightText(book.authorName, searchQuery)}</p>}
                                </div>
                                
                                <div>
                                    <p className="price" style={{ 
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        marginBottom: '10px',
                                        marginTop: '10px'
                                    }}>{parseFloat(book.price).toLocaleString()} so'm</p>
                                    <button
                                        className="add-to-cart glassmorphism-button"
                                        style={{
                                            width: '100%',
                                            padding: '8px 0',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px'
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            alert(`${book.title} savatga qo'shildi!`);
                                            window.dispatchEvent(new CustomEvent('cartUpdated'));
                                        }}
                                    >
                                        <i className="fas fa-shopping-cart"></i> 
                                        <span className="cart-button-text">Savatga</span>
                                    </button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SearchPage;