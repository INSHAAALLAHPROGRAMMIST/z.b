import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { databases, Query, ID } from '../appwriteConfig';
import { toastMessages } from '../utils/toastUtils';
import { useLazyCSS } from '../hooks/useLazyCSS';

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
              key={`${paragraphIndex}-${lineIndex}-${partIndex}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="description-link"
              style={{
                color: 'var(--primary-color)',
                textDecoration: 'underline',
                wordBreak: 'break-all',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--accent-color)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--primary-color)';
              }}
            >
              {linkText}
            </a>
          );
        }
        
        return part.replace(/\t/g, '    ');
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

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;

function BookDetailPage() {
    const { bookId, bookSlug } = useParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    useLazyCSS('/src/styles/components/book-detail-clean.css');
    useLazyCSS('/src/styles/components/book-detail-animations.css');

    const fetchCartItems = useCallback(async () => {
        try {
            let currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('appwriteGuestId');

            if (!currentUserId) {
                return;
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [Query.equal('userId', currentUserId)]
            );

            setCartItems(response.documents);
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error("Savat elementlarini yuklashda xato:", err);
            }
        }
    }, []);

    const addToCart = useCallback(async (bookToAdd) => {
        if (!bookToAdd?.$id) {
            toastMessages.cartError();
            return;
        }

        try {
            let currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('appwriteGuestId');

            if (!currentUserId) {
                currentUserId = ID.unique();
                localStorage.setItem('appwriteGuestId', currentUserId);
            }

            const existingCartItems = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [
                    Query.equal('userId', currentUserId),
                    Query.equal('bookId', bookToAdd.$id)
                ]
            );

            if (existingCartItems.documents.length > 0) {
                const cartItem = existingCartItems.documents[0];
                const newQuantity = cartItem.quantity + 1;
                await databases.updateDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    cartItem.$id,
                    { quantity: newQuantity }
                );
            } else {
                await databases.createDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    ID.unique(),
                    {
                        userId: currentUserId,
                        bookId: bookToAdd.$id,
                        quantity: 1,
                        priceAtTimeOfAdd: parseFloat(bookToAdd.price) || 0
                    }
                );
            }

            toastMessages.addedToCart(bookToAdd.title);
            await fetchCartItems();
            window.dispatchEvent(new CustomEvent('cartUpdated'));

        } catch (err) {
            if (import.meta.env.DEV) {
                console.error("Savatga qo'shishda xato yuz berdi:", err);
            }
            toastMessages.cartError();
        }
    }, [fetchCartItems]);

    const updateBookQuantityInCart = useCallback(async (bookId, newQuantity) => {
        try {
            let currentUserId = localStorage.getItem('currentUserId') || localStorage.getItem('appwriteGuestId');

            if (!currentUserId) {
                currentUserId = ID.unique();
                localStorage.setItem('appwriteGuestId', currentUserId);
            }

            const cartItem = cartItems.find(item => item.bookId === bookId);

            if (cartItem) {
                if (newQuantity <= 0) {
                    await databases.deleteDocument(
                        DATABASE_ID,
                        CART_ITEMS_COLLECTION_ID,
                        cartItem.$id
                    );
                } else {
                    await databases.deleteDocument(
                        DATABASE_ID,
                        CART_ITEMS_COLLECTION_ID,
                        cartItem.$id
                    );

                    if (book) {
                        await databases.createDocument(
                            DATABASE_ID,
                            CART_ITEMS_COLLECTION_ID,
                            ID.unique(),
                            {
                                userId: currentUserId,
                                bookId: bookId,
                                quantity: newQuantity,
                                priceAtTimeOfAdd: cartItem.priceAtTimeOfAdd || parseFloat(book.price)
                            }
                        );
                    }
                }
            }

            await fetchCartItems();
            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error("Savat miqdorini yangilashda xato:", err);
            }
            toastMessages.cartError();
        }
    }, [cartItems, book, fetchCartItems]);

    const bookQuantityInCart = useMemo(() => {
        if (!book) return 0;
        const cartItem = cartItems.find(item => item.bookId === book.$id);
        return cartItem ? cartItem.quantity : 0;
    }, [cartItems, book]);

    const bookImageUrl = useMemo(() => {
        return book?.imageUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg';
    }, [book?.imageUrl]);

    const structuredData = useMemo(() => {
        if (!book) return null;
        return {
            "@context": "https://schema.org",
            "@type": "Book",
            "name": book.title,
            "author": {
                "@type": "Person",
                "name": book.author?.name || book.authorName || "Noma'lum muallif"
            },
            "genre": book.genres?.map(g => g.name).join(", ") || "",
            "description": book.description || "",
            "image": bookImageUrl,
            "offers": {
                "@type": "Offer",
                "price": parseFloat(book.price),
                "priceCurrency": "UZS",
                "availability": "https://schema.org/InStock"
            }
        };
    }, [book, bookImageUrl]);

    useEffect(() => {
        fetchCartItems();

        const handleCartUpdate = () => {
            fetchCartItems();
        };

        window.addEventListener('cartUpdated', handleCartUpdate);

        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate);
        };
    }, [fetchCartItems]);

    useEffect(() => {
        const fetchBookDetail = async () => {
            setLoading(true);
            setError(null);
            
            if (!bookId && !bookSlug) {
                setError('Kitob ID yoki slug ko\'rsatilmagan');
                setLoading(false);
                return;
            }
            
            try {
                let response;

                if (bookId) {
                    const cleanBookId = bookId.trim();
                    
                    if (!/^[a-zA-Z0-9_]{20,36}$/.test(cleanBookId)) {
                        const books = await databases.listDocuments(
                            DATABASE_ID,
                            BOOKS_COLLECTION_ID,
                            [
                                Query.equal('slug', cleanBookId),
                                Query.limit(1)
                            ]
                        );

                        if (books.documents.length === 0) {
                            throw new Error(`Kitob topilmadi. ID: "${cleanBookId}" (uzunlik: ${cleanBookId.length})`);
                        }

                        response = books.documents[0];
                    } else {
                        response = await databases.getDocument(
                            DATABASE_ID,
                            BOOKS_COLLECTION_ID,
                            cleanBookId
                        );
                    }
                } else if (bookSlug) {
                    const cleanSlug = bookSlug.trim();
                    
                    if (!/^[a-zA-Z0-9\-_]+$/.test(cleanSlug)) {
                        throw new Error(`Noto'g'ri kitob slug formati: "${cleanSlug}"`);
                    }
                    
                    const books = await databases.listDocuments(
                        DATABASE_ID,
                        BOOKS_COLLECTION_ID,
                        [
                            Query.equal('slug', cleanSlug),
                            Query.limit(1)
                        ]
                    );

                    if (books.documents.length === 0) {
                        throw new Error(`Slug bilan kitob topilmadi: "${cleanSlug}"`);
                    }

                    response = books.documents[0];
                }

                if (!response) {
                    throw new Error('Kitob ma\'lumotlari olinmadi');
                }

                setBook(response);
                setLoading(false);
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.error("Kitob ma'lumotlarini yuklashda xato yuz berdi:", err);
                }
                
                let errorMessage = "Kitob ma'lumotlarini yuklashda xato.";
                
                if (err.message.includes('Invalid `documentId`')) {
                    errorMessage = 'Noto\'g\'ri kitob ID. URL\'ni tekshiring.';
                } else if (err.message.includes('Document with the requested ID could not be found')) {
                    errorMessage = 'Kitob topilmadi. Ehtimol o\'chirilgan yoki mavjud emas.';
                } else if (err.message.includes('topilmadi')) {
                    errorMessage = 'Kitob topilmadi.';
                } else if (err.message.includes('format')) {
                    errorMessage = err.message;
                } else {
                    errorMessage = err.message || errorMessage;
                }
                
                setError(errorMessage);
                setLoading(false);
            }
        };

        fetchBookDetail();
    }, [bookId, bookSlug]);

    if (loading) {
        return (
            <div className="book-detail-main">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Kitob yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="book-detail-main">
                <div className="error-container">
                    <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
                    <h2>Xato yuz berdi</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button
                            className="retry-btn"
                            onClick={() => window.location.reload()}
                            aria-label="Sahifani qayta yuklash"
                        >
                            <i className="fas fa-redo" aria-hidden="true"></i>
                            Qayta urinish
                        </button>
                        <a href="/" className="back-home-btn">
                            <i className="fas fa-home" aria-hidden="true"></i>
                            Bosh sahifaga qaytish
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="book-detail-main">
                <div className="not-found-container">
                    <i className="fas fa-book" aria-hidden="true"></i>
                    <h2>Kitob topilmadi</h2>
                    <p>Kechirasiz, siz qidirayotgan kitob mavjud emas.</p>
                    <a href="/" className="back-home-btn">Bosh sahifaga qaytish</a>
                </div>
            </div>
        );
    }

    return (
        <>
            <BookSEO book={book} />

            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}

            <main className="book-detail-main">
                <div className="book-detail-container">
                    <div className="book-detail-image-section">
                        <div className="book-image-wrapper">
                            <ResponsiveImage
                                src={bookImageUrl}
                                alt={`${book.title} kitobining muqovasi - ${book.author?.name || 'Noma\'lum muallif'}`}
                                className="book-detail-image"
                                onClick={() => setIsImageModalOpen(true)}
                                context="book-detail"
                            />
                        </div>
                    </div>

                    <div className="book-detail-content">
                        <header className="book-header">
                            <h1 className="book-title" id="book-title">{book.title}</h1>

                            {(book.author?.name || book.authorName) && (
                                <div className="book-author" role="complementary" aria-labelledby="book-title">
                                    <i className="fas fa-feather-alt" aria-hidden="true"></i>
                                    <span>Muallif: {book.author?.name || book.authorName}</span>
                                </div>
                            )}
                        </header>

                        {book.genres && book.genres.length > 0 && (
                            <div className="book-genres" role="list" aria-label="Kitob janrlari">
                                {book.genres.map((genre, index) => (
                                    <span 
                                        key={genre.$id || index} 
                                        className="genre-badge"
                                        role="listitem"
                                    >
                                        {genre.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <section className="book-purchase-section" aria-labelledby="purchase-heading">
                            <h2 id="purchase-heading" className="sr-only">Kitob narxi va xarid</h2>
                            <div className="book-price" role="text" aria-label={`Kitob narxi ${parseFloat(book.price).toLocaleString()} so'm`}>
                                <span className="price-amount">{parseFloat(book.price).toLocaleString()} <span className="price-currency">so'm</span></span>
                                
                            </div>

                            {bookQuantityInCart === 0 ? (
                                <button
                                    className="add-to-cart-btn"
                                    onClick={() => addToCart(book)}
                                    aria-label={`${book.title} kitobini savatga qo'shish`}
                                >
                                    <i className="fas fa-shopping-cart" aria-hidden="true"></i>
                                    <span>Savatga qo'shish</span>
                                    <i className="fas fa-arrow-right" aria-hidden="true"></i>
                                </button>
                            ) : (
                                <div className="quantity-controls">
                                    <button
                                        className="quantity-btn quantity-decrease"
                                        onClick={() => updateBookQuantityInCart(book.$id, bookQuantityInCart - 1)}
                                        aria-label="Miqdorni kamaytirish"
                                    >
                                        <i className="fas fa-minus" aria-hidden="true"></i>
                                    </button>
                                    <span className="quantity-display" aria-label={`Hozirgi miqdor: ${bookQuantityInCart}`}>
                                        {bookQuantityInCart}
                                    </span>
                                    <button
                                        className="quantity-btn quantity-increase"
                                        onClick={() => updateBookQuantityInCart(book.$id, bookQuantityInCart + 1)}
                                        aria-label="Miqdorni oshirish"
                                    >
                                        <i className="fas fa-plus" aria-hidden="true"></i>
                                    </button>
                                </div>
                            )}
                        </section>

                        {book.description && (
                            <section className="book-description" aria-labelledby="description-heading">
                                <h2 id="description-heading" className="description-title">
                                    <i className="fas fa-book-open" aria-hidden="true"></i>
                                    Tavsif
                                </h2>
                                <div className="description-text">
                                    {linkifyText(book.description)}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>

            <ImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                imageSrc={bookImageUrl}
                imageAlt={`${book.title} kitobining muqovasi - ${book.author?.name || 'Noma\'lum muallif'}`}
            />
        </>
    );
}

export default BookDetailPage;