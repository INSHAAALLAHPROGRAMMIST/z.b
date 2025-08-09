// Lazy Loading Book Grid Component
// Performance uchun kitoblarni lazy load qiladi

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ResponsiveImage from './ResponsiveImage';
import { getStockStatusColor, getStockStatusText } from '../utils/inventoryUtils';
import { toastMessages } from '../utils/toastUtils';

const LazyBookGrid = ({ 
  books = [], 
  loading = false, 
  hasMore = false, 
  onLoadMore = null,
  onAddToCart = null,
  className = "",
  itemsPerPage = 12
}) => {
  const [visibleBooks, setVisibleBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef();
  const loadMoreRef = useRef();

  // Initial load - faqat birinchi sahifani ko'rsatish
  useEffect(() => {
    if (books.length > 0) {
      const initialBooks = books.slice(0, itemsPerPage);
      setVisibleBooks(initialBooks);
      setCurrentPage(1);
    }
  }, [books, itemsPerPage]);

  // Lazy loading with Intersection Observer
  const lastBookElementRef = useCallback((node) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadMoreBooks();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px' // 100px oldin yuklashni boshlash
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading]);

  // Load more books locally (client-side pagination)
  const loadMoreBooks = useCallback(() => {
    if (isLoadingMore) return;
    
    const nextPage = currentPage + 1;
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Local books'dan keyingi sahifani olish
    if (startIndex < books.length) {
      setIsLoadingMore(true);
      
      // Simulate loading delay for better UX
      setTimeout(() => {
        const newBooks = books.slice(startIndex, endIndex);
        setVisibleBooks(prev => [...prev, ...newBooks]);
        setCurrentPage(nextPage);
        setIsLoadingMore(false);
      }, 300);
    } 
    // Agar local books tugagan bo'lsa, server'dan ko'proq yuklash
    else if (hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [currentPage, itemsPerPage, books, hasMore, onLoadMore, isLoadingMore]);

  // Add to cart handler
  const handleAddToCart = async (book) => {
    if (onAddToCart) {
      try {
        await onAddToCart(book);
        toastMessages.addedToCart(book.title);
      } catch (error) {
        console.error('Add to cart error:', error);
        toastMessages.cartError();
      }
    }
  };

  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className={`lazy-book-grid ${className}`}>
      {/* Books Grid */}
      <div className="books-grid">
        {visibleBooks.map((book, index) => {
          // Last element uchun ref qo'shish
          const isLast = index === visibleBooks.length - 1;
          const shouldLoadMore = isLast && 
            (currentPage * itemsPerPage < books.length || hasMore);

          return (
            <div 
              key={book.$id} 
              className="book-card glassmorphism-card"
              ref={shouldLoadMore ? lastBookElementRef : null}
            >
              {/* Book Image */}
              <div className="book-image-container">
                <Link to={`/book/${book.$id}`}>
                  <ResponsiveImage
                    src={book.imageUrl}
                    alt={book.title}
                    className="book-image"
                    loading={index < 6 ? "eager" : "lazy"} // Birinchi 6 ta eager
                  />
                </Link>
                
                {/* Stock Status Badge */}
                {book.stockStatus && (
                  <div 
                    className="stock-badge"
                    style={{ 
                      backgroundColor: getStockStatusColor(book.stockStatus),
                      color: 'white'
                    }}
                  >
                    {getStockStatusText(book.stockStatus)}
                  </div>
                )}

                {/* Relevance Score (development uchun) */}
                {import.meta.env.DEV && book.relevanceScore && (
                  <div className="relevance-score">
                    Score: {book.relevanceScore}
                  </div>
                )}
              </div>

              {/* Book Info */}
              <div className="book-info">
                <h3 className="book-title">
                  <Link to={`/book/${book.$id}`}>
                    {book.title}
                  </Link>
                </h3>
                
                {book.authorName && (
                  <p className="book-author">{book.authorName}</p>
                )}
                
                {/* Description Preview (agar description'dan topilgan bo'lsa) */}
                {book.description && book.relevanceScore && book.relevanceScore < 10 && (
                  <p className="book-description-preview">
                    {book.description.length > 100 
                      ? `${book.description.substring(0, 100)}...`
                      : book.description
                    }
                  </p>
                )}
                
                <div className="book-price">
                  {book.price ? `${book.price.toLocaleString()} so'm` : 'Narx ko\'rsatilmagan'}
                </div>

                {/* Quick Actions */}
                <div className="book-actions">
                  <button
                    onClick={() => handleAddToCart(book)}
                    className="glassmorphism-button add-to-cart-btn"
                    disabled={!book.isAvailable || book.stock <= 0}
                  >
                    <i className="fas fa-shopping-cart"></i>
                    Savatga
                  </button>
                  
                  <Link 
                    to={`/book/${book.$id}`}
                    className="glassmorphism-button view-btn"
                  >
                    <i className="fas fa-eye"></i>
                    Ko'rish
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading More Indicator */}
      {(isLoadingMore || loading) && (
        <div className="loading-more-container">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Ko'proq kitoblar yuklanmoqda...</p>
          </div>
        </div>
      )}

      {/* Load More Button (fallback) */}
      {!loading && !isLoadingMore && 
       (currentPage * itemsPerPage < books.length || hasMore) && (
        <div className="load-more-container">
          <button
            onClick={loadMoreBooks}
            className="glassmorphism-button load-more-btn"
            ref={loadMoreRef}
          >
            <i className="fas fa-plus"></i>
            Ko'proq yuklash ({visibleBooks.length}/{books.length})
          </button>
        </div>
      )}

      {/* End Message */}
      {!loading && !hasMore && visibleBooks.length === books.length && 
       books.length > 0 && (
        <div className="end-message">
          <p>Barcha kitoblar ko'rsatildi ({books.length} ta)</p>
        </div>
      )}
    </div>
  );
};

export default LazyBookGrid;