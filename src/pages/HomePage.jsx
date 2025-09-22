import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom';
import { toastMessages } from '../utils/toastUtils';
import OptimizedImage from '../components/OptimizedImage';
import LazyBookGrid from '../components/LazyBookGrid';
import WishlistButton from '../components/WishlistButton';
import { SORT_OPTIONS, sortBooks, getStockStatusColor, getStockStatusText } from '../utils/inventoryUtils';

// Optimized Firebase imports
import optimizedFirebaseService from '../services/OptimizedFirebaseService';
import useFirebaseBooks from '../hooks/useFirebaseBooks';
import useFirebaseCart from '../hooks/useFirebaseCart';

// Lazy load SlugUpdater for better initial performance
const SlugUpdater = React.lazy(() => import('../components/SlugUpdater'));
import '../index.css';
import '../styles/responsive-images.css';

const HomePage = () => {
    const [genres, setGenres] = useState([]);
    const [genresLoading, setGenresLoading] = useState(true);
    const [genresError, setGenresError] = useState(null);
    const [sortBy, setSortBy] = useState('recommended'); // Sorting state

    // Firebase hooks
    const { 
        books, 
        loading, 
        error, 
        hasMore, 
        loadMore, 
        refresh 
    } = useFirebaseBooks({
        limitCount: 50,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        filters: { isAvailable: true },
        autoLoad: true
    });

    const { 
        cartItems, 
        addToCart, 
        updateQuantity, 
        getBookQuantity
    } = useFirebaseCart();

    // Add to cart handler
    const handleAddToCart = async (book) => {
        try {
            await addToCart(book.id || book.$id, 1);
            toastMessages.addedToCart(book.title);
        } catch (err) {
            console.error("Savatga qo'shishda xato:", err);
            toastMessages.cartError();
        }
    };

    // Update cart quantity handler
    const handleUpdateQuantity = async (bookId, newQuantity) => {
        try {
            const cartItem = cartItems.find(item => item.bookId === bookId);
            if (cartItem) {
                await updateQuantity(cartItem.id, newQuantity);
            }
        } catch (err) {
            console.error("Savat miqdorini yangilashda xato:", err);
            toastMessages.cartError();
        }
    };

    // Optimized add to cart handler with caching
    const handleAddToCart = useCallback(async (book) => {
        try {
            await addToCart(book.id || book.$id, 1);
            toastMessages.addedToCart(book.title);
            
            // Invalidate cart cache
            optimizedFirebaseService.invalidateCache('cart');
        } catch (err) {
            console.error("Savatga qo'shishda xato:", err);
            toastMessages.cartError();
        }
    }, [addToCart]);

    // Optimized add to wishlist handler
    const handleAddToWishlist = useCallback(async (book) => {
        try {
            // Add to wishlist logic here
            toastMessages.addedToWishlist(book.title);
        } catch (err) {
            console.error("Sevimlilarga qo'shishda xato:", err);
            toastMessages.wishlistError();
        }
    }, []);

    // Memoized sorted books
    const sortedBooks = useMemo(() => {
        return sortBooks(books, sortBy);
    }, [books, sortBy]);

    // Load genres with caching
    useEffect(() => {
        let mounted = true;

        const loadGenres = async () => {
            try {
                setGenresLoading(true);
                setGenresError(null);

                // Use optimized service with caching
                const result = await optimizedFirebaseService.getGenres(true);
                
                if (mounted) {
                    setGenres(result.documents);
                    if (import.meta.env.DEV) {
                        console.log('🏷️ Genres loaded from cache:', result.documents.length);
                    }
                }
            } catch (err) {
                if (mounted) {
                    console.error("Janrlarni yuklashda xato:", err);
                    setGenresError(err.message || "Janrlarni yuklashda noma'lum xato.");
                }
            } finally {
                if (mounted) {
                    setGenresLoading(false);
                }
            }
        };

        loadGenres();

        return () => {
            mounted = false;
        };
    }, []);

    // Below-the-fold animation
    useEffect(() => {
        const timer = setTimeout(() => {
            const belowFoldElements = document.querySelectorAll('.below-fold');
            belowFoldElements.forEach((element, index) => {
                setTimeout(() => {
                    element.classList.add('loaded');
                }, index * 100); // Faster stagger animation
            });
        }, 200); // Much faster initial delay

        return () => clearTimeout(timer);
    }, [loading]);

    if (loading) {
        return (
            <main>
                <section className="hero-banner">
                    <div className="hero-content">
                        <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                        <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari siz azizlar uchun.</p>
                    </div>
                </section>
                <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
                    <div className="loading-spinner" style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid rgba(106, 138, 255, 0.2)',
                        borderTop: '3px solid var(--primary-color)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    Kitoblar yuklanmoqda...
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main>
                <section className="hero-banner">
                    <div className="hero-content">
                        <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                        <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari siz azizlar uchun.</p>
                    </div>
                </section>
                <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
                    <div style={{ color: 'var(--error-color)', marginBottom: '20px' }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginRight: '10px' }}></i>
                        Xato: {error}
                    </div>
                    <button 
                        onClick={refresh} 
                        className="glassmorphism-button"
                        style={{ marginTop: '10px' }}
                    >
                        <i className="fas fa-redo" style={{ marginRight: '8px' }}></i>
                        Qayta yuklash
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main>
            {/* Above-the-fold content - loads immediately */}
            <section className="hero-banner">
                <div className="hero-content">
                    <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                    <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari siz azizlar uchun.</p>
                </div>
            </section>

            {/* Below-the-fold content - loads after initial render */}
            <section className="container below-fold">
                <div className="books-section-header">
                    <h2 className="section-title">Kitoblar</h2>
                    <div className="sort-controls">
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="sort-select glassmorphism-button"
                        >
                            {SORT_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Optimized Book Grid with Lazy Loading */}
                <LazyBookGrid
                    books={sortedBooks}
                    loading={loading}
                    onAddToCart={handleAddToCart}
                    onAddToWishlist={handleAddToWishlist}
                    itemsPerPage={20}
                    enableVirtualization={true}
                />

                {/* Loading more books */}
                {hasMore && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '20px' 
                    }}>
                        <button 
                            onClick={loadMore}
                            className="glassmorphism-button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="loading-spinner" style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid rgba(106, 138, 255, 0.2)',
                                        borderTop: '2px solid var(--primary-color)',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        marginRight: '8px'
                                    }}></div>
                                    Yuklanmoqda...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                                    Ko'proq kitoblar yuklash
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Show total count */}
                {books.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{
                            color: 'var(--light-text-color)',
                            fontSize: '0.9rem',
                            background: 'rgba(106, 138, 255, 0.1)',
                            padding: '10px 20px',
                            borderRadius: '20px',
                            display: 'inline-block'
                        }}>
                            <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
                            Jami {books.length} ta kitob ko'rsatildi
                            {hasMore && ' (ko\'proq mavjud)'}
                        </p>
                    </div>
                )}
            </section>

            <section className="container genre-section below-fold">
                <h2 className="section-title">Janrlar Bo'yicha Keng Tanlov</h2>
                
                {genresLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="loading-spinner" style={{
                            width: '30px',
                            height: '30px',
                            border: '2px solid rgba(106, 138, 255, 0.2)',
                            borderTop: '2px solid var(--primary-color)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 15px'
                        }}></div>
                        <p style={{ color: 'var(--light-text-color)' }}>Janrlar yuklanmoqda...</p>
                    </div>
                ) : genresError ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ color: 'var(--error-color)', marginBottom: '15px' }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                            Janrlarni yuklashda xato: {genresError}
                        </div>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="glassmorphism-button"
                        >
                            <i className="fas fa-redo" style={{ marginRight: '8px' }}></i>
                            Qayta yuklash
                        </button>
                    </div>
                ) : (
                    <div className="genre-grid">
                        {genres.map(genre => (
                            <Link 
                                to={`/genres/${genre.id || genre.$id}`} 
                                key={genre.id || genre.$id} 
                                className="genre-card glassmorphism-card"
                            >
                                <div className="genre-bg" style={{ 
                                    backgroundImage: `url(${genre.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiM2MzY2ZjEiIHN0b3Atb3BhY2l0eT0iMC44Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMzRkMzk5IiBzdG9wLW9wYWNpdHk9IjAuNiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjRkZGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+S2l0b2JsYXI8L3RleHQ+PC9zdmc='})` 
                                }}></div>
                                <h3 className="genre-name">{genre.name}</h3>
                                {genre.description && (
                                    <p className="genre-description" style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--light-text-color)',
                                        marginTop: '8px',
                                        lineHeight: '1.4'
                                    }}>
                                        {genre.description}
                                    </p>
                                )}
                                {genre.bookCount > 0 && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--primary-color)',
                                        marginTop: '8px',
                                        fontWeight: '600'
                                    }}>
                                        {genre.bookCount} ta kitob
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Development Tools - Only in development */}
            {import.meta.env.DEV && (
                <React.Suspense fallback={null}>
                    <SlugUpdater />
                </React.Suspense>
            )}
        </main>
    );
}

export default HomePage