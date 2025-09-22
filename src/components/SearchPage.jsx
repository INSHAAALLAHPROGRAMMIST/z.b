import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import LazyImage from './LazyImage';
import { prepareSearchText } from '../utils/transliteration';
import { highlightText } from '../utils/highlightText.jsx';
import { toastMessages } from '../utils/toastUtils';

// Firebase imports
import firebaseService from '../services/FirebaseService';
import useFirebaseCart from '../hooks/useFirebaseCart';
import { formatPrice } from '../utils/firebaseHelpers';

import '../index.css';

// Firebase Collections

function SearchPage() {
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const searchQuery = new URLSearchParams(location.search).get('q');

    // Firebase cart hook
    const { addToCart, getBookQuantity, updateQuantity, cartItems } = useFirebaseCart();

    // Handle add to cart
    const handleAddToCart = useCallback(async (book) => {
        try {
            await addToCart(book.id, 1);
            toastMessages.addedToCart(book.title);
        } catch (err) {
            console.error('Add to cart error:', err);
            toastMessages.cartError();
        }
    }, [addToCart]);

    // Handle quantity update
    const handleQuantityUpdate = useCallback(async (bookId, newQuantity) => {
        try {
            const cartItem = cartItems.find(item => item.bookId === bookId);
            if (cartItem) {
                await updateQuantity(cartItem.id, newQuantity);
            }
        } catch (err) {
            console.error('Quantity update error:', err);
            toastMessages.cartError();
        }
    }, [cartItems, updateQuantity]);

    // Search function using Firebase service
    const performSearch = useCallback(async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use Firebase service for search
            const result = await firebaseService.searchBooks(query.trim(), {
                limitCount: 50
            });
            
            // Additional client-side filtering with transliteration
            const [searchTermLower, searchTermAlternate, searchTermXToH, searchTermHToX] = prepareSearchText(query);
            
            const enhancedResults = result.documents.filter(book => {
                // Enhanced search with transliteration support
                const searchFields = [
                    book.title,
                    book.authorName,
                    book.description
                ].filter(Boolean);

                return searchFields.some(field => {
                    const fieldLower = field.toLowerCase();
                    return fieldLower.includes(searchTermLower) || 
                           fieldLower.includes(searchTermAlternate) ||
                           fieldLower.includes(searchTermXToH) ||
                           fieldLower.includes(searchTermHToX);
                });
            });
            
            setSearchResults(enhancedResults);
            
            if (import.meta.env.DEV) {
                console.log(`🔍 Search results for "${query}": ${enhancedResults.length} books found`);
            }
        } catch (err) {
            console.error('Search error:', err);
            setError(err.message || 'Qidiruv natijalarini yuklashda xato yuz berdi.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Perform search when query changes
    useEffect(() => {
        performSearch(searchQuery);
    }, [searchQuery, performSearch]);

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
            marginTop: '15px'
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
                        <Link to={book.slug ? `/kitob/${book.slug}` : `/book/${book.id}`} key={book.id} className="book-card glassmorphism-card" style={{
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
                                    }}>{formatPrice(book.price)}</p>
                                    
                                    {/* Stock status */}
                                    {book.stockStatus && book.stockStatus !== 'available' && (
                                        <div style={{
                                            fontSize: '0.8rem',
                                            marginBottom: '8px',
                                            fontWeight: '600',
                                            color: book.stockStatus === 'out_of_stock' ? '#ef4444' : '#f59e0b'
                                        }}>
                                            {book.stockStatus === 'out_of_stock' ? 'Tugagan' : 
                                             book.stockStatus === 'low_stock' ? 'Kam qoldi' : ''}
                                        </div>
                                    )}

                                    {getBookQuantity(book.id) === 0 ? (
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
                                                handleAddToCart(book);
                                            }}
                                            disabled={book.stockStatus === 'out_of_stock'}
                                        >
                                            <i className="fas fa-shopping-cart"></i> 
                                            <span className="cart-button-text">
                                                {book.stockStatus === 'out_of_stock' ? 'Tugagan' : 'Savatga'}
                                            </span>
                                        </button>
                                    ) : (
                                        <div className="quantity-controls" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            width: '100%'
                                        }}>
                                            <button
                                                className="glassmorphism-button"
                                                style={{
                                                    width: '30px',
                                                    height: '30px',
                                                    padding: '0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.9rem'
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleQuantityUpdate(book.id, getBookQuantity(book.id) - 1);
                                                }}
                                            >
                                                -
                                            </button>
                                            <span style={{
                                                fontSize: '1rem',
                                                fontWeight: 'bold',
                                                minWidth: '25px',
                                                textAlign: 'center'
                                            }}>
                                                {getBookQuantity(book.id)}
                                            </span>
                                            <button
                                                className="glassmorphism-button"
                                                style={{
                                                    width: '30px',
                                                    height: '30px',
                                                    padding: '0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.9rem'
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleQuantityUpdate(book.id, getBookQuantity(book.id) + 1);
                                                }}
                                                disabled={book.stockStatus === 'out_of_stock'}
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
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