import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from './OptimizedImage';
import firebaseService from '../services/FirebaseService';

const LazyBookGrid = ({ 
    books = [], 
    loading = false, 
    onAddToCart,
    onAddToWishlist,
    itemsPerPage = 12,
    enableVirtualization = false 
}) => {
    const [visibleBooks, setVisibleBooks] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef = useRef(null);
    const loadMoreRef = useRef(null);

    // Memoize visible books calculation
    const paginatedBooks = useMemo(() => {
        if (enableVirtualization) {
            return books.slice(0, currentPage * itemsPerPage);
        }
        return books;
    }, [books, currentPage, itemsPerPage, enableVirtualization]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!enableVirtualization || !loadMoreRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isLoadingMore && paginatedBooks.length < books.length) {
                    setIsLoadingMore(true);
                    // Simulate loading delay
                    setTimeout(() => {
                        setCurrentPage(prev => prev + 1);
                        setIsLoadingMore(false);
                    }, 300);
                }
            },
            {
                rootMargin: '100px',
                threshold: 0.1
            }
        );

        observer.observe(loadMoreRef.current);
        observerRef.current = observer;

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [enableVirtualization, isLoadingMore, paginatedBooks.length, books.length]);

    // Optimized add to cart handler
    const handleAddToCart = async (book, e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (onAddToCart) {
            try {
                await onAddToCart(book);
            } catch (error) {
                console.error('Error adding to cart:', error);
            }
        }
    };

    // Optimized add to wishlist handler
    const handleAddToWishlist = async (book, e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (onAddToWishlist) {
            try {
                await onAddToWishlist(book);
            } catch (error) {
                console.error('Error adding to wishlist:', error);
            }
        }
    };

    // Generate SEO-friendly slug
    const generateSlug = (title, id) => {
        if (!title) return id;
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    if (loading) {
        return (
            <div className="book-grid">
                {Array.from({ length: itemsPerPage }).map((_, index) => (
                    <div key={index} className="book-card glassmorphism-card">
                        <div className="book-skeleton">
                            <div className="skeleton-image"></div>
                            <div className="skeleton-content">
                                <div className="skeleton-title"></div>
                                <div className="skeleton-author"></div>
                                <div className="skeleton-price"></div>
                                <div className="skeleton-button"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="book-grid">
                {paginatedBooks.map((book, index) => {
                    const slug = generateSlug(book.title, book.$id);
                    const bookUrl = `/kitob/${slug}`;
                    
                    return (
                        <Link 
                            key={book.$id} 
                            to={bookUrl}
                            className="book-card glassmorphism-card"
                            style={{ textDecoration: 'none' }}
                        >
                            <OptimizedImage
                                src={book.imageUrl || book.image}
                                alt={book.title}
                                width={220}
                                height={300}
                                className="book-image"
                                lazy={index > 6} // First 6 images load immediately
                                placeholder={true}
                                quality="auto"
                                format="auto"
                            />
                            
                            <div className="book-info">
                                <h3 title={book.title}>{book.title}</h3>
                                <p className="author" title={book.author}>
                                    {book.author}
                                </p>
                                <p className="genre" title={book.genre}>
                                    {book.genre}
                                </p>
                                <p className="price">
                                    {book.price ? `${book.price.toLocaleString()} so'm` : 'Narx ko\'rsatilmagan'}
                                </p>
                            </div>
                            
                            <div className="book-actions">
                                <button
                                    className="add-to-cart glassmorphism-button"
                                    onClick={(e) => handleAddToCart(book, e)}
                                    aria-label={`${book.title} ni savatga qo'shish`}
                                >
                                    <i className="fas fa-shopping-cart"></i>
                                    Savatga
                                </button>
                                
                                <button
                                    className="add-to-wishlist glassmorphism-button wishlist-btn"
                                    onClick={(e) => handleAddToWishlist(book, e)}
                                    aria-label={`${book.title} ni sevimlilarga qo'shish`}
                                >
                                    <i className="fas fa-heart"></i>
                                </button>
                            </div>
                        </Link>
                    );
                })}
            </div>
            
            {/* Load more trigger for infinite scroll */}
            {enableVirtualization && paginatedBooks.length < books.length && (
                <div 
                    ref={loadMoreRef} 
                    className="load-more-trigger"
                    style={{ 
                        height: '20px', 
                        margin: '20px 0',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    {isLoadingMore && (
                        <div className="loading-spinner">
                            <div style={{
                                width: '30px',
                                height: '30px',
                                border: '2px solid rgba(106, 138, 255, 0.2)',
                                borderTop: '2px solid var(--primary-color)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default LazyBookGrid;