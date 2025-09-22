import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toastMessages } from '../utils/toastUtils';
import { useLazyCSS } from '../hooks/useLazyCSS';
import PreOrderWaitlist from './PreOrderWaitlist';
import { STOCK_STATUS, getStockStatusColor, getStockStatusText } from '../utils/inventoryUtils';

// Firebase imports
import firebaseService from '../services/FirebaseService';
import useFirebaseCart from '../hooks/useFirebaseCart';
import { formatPrice, formatFirebaseDate } from '../utils/firebaseHelpers';

// Direct CSS imports for production reliability
import '../styles/components/book-detail-clean.css';
import '../styles/components/book-detail-animations.css';

import BookSEO from './SEO/BookSEO';
import ResponsiveImage from './ResponsiveImage';
import ImageModal from './ImageModal';

const linkifyText = (text) => {
  if (!text) return text;

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|uz|ru|co|uk|de|fr|it|es|nl|au|ca|jp|cn|in|br|io|ai|me|ly|cc|tv|fm|am|to|gg|tk|ml|ga|cf|gq|tel|app|dev|tech|info|biz|name|pro|mobi|travel|museum|aero|coop|jobs|post|xxx|asia|cat|int|mil|arpa|onion|local|test|example|invalid|localhost)[^\s]*)/gi;

  const paragraphs = text.split(/\n\s*\n/);
  
  return paragraphs.map((paragraph, paragraphIndex) => {
    const lines = paragraph.split('\n');
    
    const processedLines = lines.map((line, lineIndex) => {
      const parts = line.split(urlRegex);
      
      const processedParts = parts.map((part, partIndex) => {
        if (urlRegex.test(part)) {
          let url = part.trim();
          
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.startsWith('www.')) {
              url = 'https://' + url;
            } else {
              url = 'https://' + url;
            }
          }

          let linkText = part;
          
          if (linkText.length > 50) {
            linkText = linkText.substring(0, 47) + '...';
          }

          return (
            <a
              key={`link-${paragraphIndex}-${lineIndex}-${partIndex}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="description-link"
            >
              {linkText}
            </a>
          );
        }
        return part;
      });
      
      if (lineIndex < lines.length - 1) {
        processedParts.push(<br key={`br-${paragraphIndex}-${lineIndex}`} />);
      }
      
      return processedParts;
    });
    
    return (
      <div key={`paragraph-${paragraphIndex}`} className="description-paragraph">
        {processedLines}
      </div>
    );
  });
};

function BookDetailPage() {
    const { bookId, bookSlug } = useParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [relatedBooks, setRelatedBooks] = useState([]);
    const [relatedLoading, setRelatedLoading] = useState(false);

    // Firebase cart hook
    const { 
        cartItems, 
        addToCart, 
        updateQuantity, 
        getBookQuantity,
        isInCart 
    } = useFirebaseCart();

    // CSS lazy loading
    useLazyCSS('/styles/components/book-detail-responsive.css');

    // Load book data
    const loadBook = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let bookData = null;

            // Try to get book by slug first, then by ID
            if (bookSlug) {
                try {
                    bookData = await firebaseService.getBookBySlug(bookSlug);
                } catch (slugError) {
                    console.log('Book not found by slug, trying ID...');
                }
            }

            if (!bookData && bookId) {
                bookData = await firebaseService.getBookById(bookId);
            }

            if (!bookData) {
                throw new Error('Kitob topilmadi');
            }

            setBook(bookData);

            // Increment view count
            firebaseService.incrementBookViews(bookData.id);

            // Load related books
            loadRelatedBooks(bookData);

        } catch (err) {
            console.error('Book loading error:', err);
            setError(err.message || 'Kitob ma\'lumotlarini yuklashda xato');
        } finally {
            setLoading(false);
        }
    }, [bookId, bookSlug]);

    // Load related books
    const loadRelatedBooks = useCallback(async (currentBook) => {
        try {
            setRelatedLoading(true);

            const filters = {};
            
            // Try to get books from same genre or author
            if (currentBook.genreId) {
                filters.genreId = currentBook.genreId;
            } else if (currentBook.authorId) {
                filters.authorId = currentBook.authorId;
            }

            const result = await firebaseService.getBooks({
                limitCount: 6,
                filters: { 
                    ...filters,
                    isAvailable: true 
                },
                orderByField: 'salesCount',
                orderDirection: 'desc'
            });

            // Filter out current book
            const filtered = result.documents.filter(
                relatedBook => relatedBook.id !== currentBook.id
            ).slice(0, 4);

            setRelatedBooks(filtered);

        } catch (err) {
            console.error('Related books loading error:', err);
        } finally {
            setRelatedLoading(false);
        }
    }, []);

    // Handle add to cart
    const handleAddToCart = useCallback(async () => {
        if (!book) return;

        try {
            await addToCart(book.id, 1);
            toastMessages.addedToCart(book.title);
        } catch (err) {
            console.error('Add to cart error:', err);
            toastMessages.cartError();
        }
    }, [book, addToCart]);

    // Handle quantity update
    const handleQuantityUpdate = useCallback(async (newQuantity) => {
        if (!book) return;

        try {
            const cartItem = cartItems.find(item => item.bookId === book.id);
            if (cartItem) {
                await updateQuantity(cartItem.id, newQuantity);
            }
        } catch (err) {
            console.error('Quantity update error:', err);
            toastMessages.cartError();
        }
    }, [book, cartItems, updateQuantity]);

    // Load book on mount or param change
    useEffect(() => {
        loadBook();
    }, [loadBook]);

    // Memoized values
    const bookQuantity = useMemo(() => {
        return book ? getBookQuantity(book.id) : 0;
    }, [book, getBookQuantity]);

    const isBookInCart = useMemo(() => {
        return book ? isInCart(book.id) : false;
    }, [book, isInCart]);

    const stockInfo = useMemo(() => {
        if (!book) return null;

        return {
            status: book.stockStatus || 'available',
            count: book.stock || 0,
            color: getStockStatusColor(book.stockStatus),
            text: getStockStatusText(book.stockStatus, book.stock)
        };
    }, [book]);

    const canAddToCart = useMemo(() => {
        if (!book) return false;
        return book.isAvailable && stockInfo?.status !== 'out_of_stock';
    }, [book, stockInfo]);

    if (loading) {
        return (
            <div className="book-detail-container">
                <div className="book-detail-loading">
                    <div className="loading-spinner"></div>
                    <p>Kitob ma'lumotlari yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="book-detail-container">
                <div className="book-detail-error">
                    <div className="error-icon">
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2>Xato yuz berdi</h2>
                    <p>{error}</p>
                    <button 
                        onClick={loadBook} 
                        className="glassmorphism-button retry-button"
                    >
                        <i className="fas fa-redo"></i>
                        Qayta urinish
                    </button>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="book-detail-container">
                <div className="book-detail-error">
                    <div className="error-icon">
                        <i className="fas fa-book"></i>
                    </div>
                    <h2>Kitob topilmadi</h2>
                    <p>Siz qidirayotgan kitob mavjud emas yoki o'chirilgan.</p>
                    <Link to="/" className="glassmorphism-button">
                        <i className="fas fa-home"></i>
                        Bosh sahifaga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <BookSEO book={book} />
            
            <div className="book-detail-container">
                <div className="book-detail-content">
                    {/* Book Image Section */}
                    <div className="book-image-section">
                        <div className="book-image-wrapper">
                            <ResponsiveImage
                                src={book.imageUrl}
                                alt={book.title}
                                className="book-detail-image"
                                context="book-detail"
                                loading="eager"
                                onClick={() => setIsImageModalOpen(true)}
                            />
                            
                            {book.isFeatured && (
                                <div className="featured-badge">
                                    <i className="fas fa-star"></i>
                                    Tavsiya etiladi
                                </div>
                            )}
                            
                            {book.isNewArrival && (
                                <div className="new-badge">
                                    <i className="fas fa-sparkles"></i>
                                    Yangi
                                </div>
                            )}
                        </div>

                        {/* Stock Status */}
                        {stockInfo && (
                            <div className="stock-info" style={{ color: stockInfo.color }}>
                                <i className="fas fa-box"></i>
                                {stockInfo.text}
                            </div>
                        )}
                    </div>

                    {/* Book Info Section */}
                    <div className="book-info-section">
                        <div className="book-header">
                            <h1 className="book-title">{book.title}</h1>
                            
                            {book.authorName && (
                                <p className="book-author">
                                    <i className="fas fa-user"></i>
                                    {book.authorName}
                                </p>
                            )}

                            <div className="book-meta">
                                {book.publishedYear && (
                                    <span className="meta-item">
                                        <i className="fas fa-calendar"></i>
                                        {book.publishedYear}
                                    </span>
                                )}
                                
                                {book.pageCount && (
                                    <span className="meta-item">
                                        <i className="fas fa-file-alt"></i>
                                        {book.pageCount} sahifa
                                    </span>
                                )}
                                
                                {book.language && (
                                    <span className="meta-item">
                                        <i className="fas fa-language"></i>
                                        {book.language === 'uz' ? 'O\'zbek' : book.language}
                                    </span>
                                )}
                            </div>

                            {/* Analytics Info */}
                            <div className="book-analytics">
                                {book.viewCount > 0 && (
                                    <span className="analytics-item">
                                        <i className="fas fa-eye"></i>
                                        {book.viewCount} marta ko'rilgan
                                    </span>
                                )}
                                
                                {book.salesCount > 0 && (
                                    <span className="analytics-item">
                                        <i className="fas fa-shopping-bag"></i>
                                        {book.salesCount} marta sotilgan
                                    </span>
                                )}
                                
                                {book.rating > 0 && (
                                    <span className="analytics-item">
                                        <i className="fas fa-star"></i>
                                        {book.rating.toFixed(1)} ({book.reviewCount} baho)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Price and Actions */}
                        <div className="book-actions">
                            <div className="price-section">
                                <span className="current-price">
                                    {formatPrice(book.price)}
                                </span>
                            </div>

                            <div className="action-buttons">
                                {!isBookInCart ? (
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={!canAddToCart}
                                        className={`add-to-cart-btn glassmorphism-button ${!canAddToCart ? 'disabled' : ''}`}
                                    >
                                        <i className="fas fa-shopping-cart"></i>
                                        {!canAddToCart ? 'Mavjud emas' : 'Savatga qo\'shish'}
                                    </button>
                                ) : (
                                    <div className="quantity-controls">
                                        <button
                                            onClick={() => handleQuantityUpdate(bookQuantity - 1)}
                                            className="quantity-btn glassmorphism-button"
                                        >
                                            <i className="fas fa-minus"></i>
                                        </button>
                                        
                                        <span className="quantity-display">
                                            {bookQuantity}
                                        </span>
                                        
                                        <button
                                            onClick={() => handleQuantityUpdate(bookQuantity + 1)}
                                            className="quantity-btn glassmorphism-button"
                                            disabled={!canAddToCart}
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                )}

                                {/* Pre-order/Waitlist */}
                                {!book.isAvailable && (book.allowPreOrder || book.enableWaitlist) && (
                                    <PreOrderWaitlist 
                                        book={book}
                                        onSuccess={() => {
                                            toastMessages.success('Muvaffaqiyatli qo\'shildi!');
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Book Description */}
                        {book.description && (
                            <div className="book-description">
                                <h3>Kitob haqida</h3>
                                <div className="description-content">
                                    {linkifyText(book.description)}
                                </div>
                            </div>
                        )}

                        {/* Additional Info */}
                        <div className="book-additional-info">
                            {book.isbn && (
                                <div className="info-item">
                                    <strong>ISBN:</strong> {book.isbn}
                                </div>
                            )}
                            
                            {book.createdAt && (
                                <div className="info-item">
                                    <strong>Qo'shilgan sana:</strong> {formatFirebaseDate(book.createdAt)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Books Section */}
                {relatedBooks.length > 0 && (
                    <div className="related-books-section">
                        <h3>O'xshash kitoblar</h3>
                        
                        {relatedLoading ? (
                            <div className="related-loading">
                                <div className="loading-spinner"></div>
                                <p>O'xshash kitoblar yuklanmoqda...</p>
                            </div>
                        ) : (
                            <div className="related-books-grid">
                                {relatedBooks.map((relatedBook) => (
                                    <Link
                                        key={relatedBook.id}
                                        to={relatedBook.slug ? `/kitob/${relatedBook.slug}` : `/book/${relatedBook.id}`}
                                        className="related-book-card glassmorphism-card"
                                    >
                                        <ResponsiveImage
                                            src={relatedBook.imageUrl}
                                            alt={relatedBook.title}
                                            className="related-book-image"
                                            context="related-book"
                                            loading="lazy"
                                        />
                                        
                                        <div className="related-book-info">
                                            <h4>{relatedBook.title}</h4>
                                            <p className="related-book-author">{relatedBook.authorName}</p>
                                            <p className="related-book-price">{formatPrice(relatedBook.price)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Modal */}
            <ImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                imageUrl={book.imageUrl}
                imageAlt={book.title}
            />
        </>
    );
}

export default BookDetailPage;