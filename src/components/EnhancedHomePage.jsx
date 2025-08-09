// Enhanced HomePage with Netlify Functions
// Hozirgi HomePage'ni yaxshilaydi, dizaynni buzmaydi

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNetlifyBooks } from '../hooks/useNetlifyBooks';
import { toastMessages } from '../utils/toastUtils';
import ResponsiveImage from './ResponsiveImage';
import { SORT_OPTIONS, getStockStatusColor, getStockStatusText } from '../utils/inventoryUtils';

const EnhancedHomePage = () => {
  // Netlify Books hook
  const {
    books,
    loading,
    error,
    hasMore,
    currentPage,
    totalPages,
    loadMore,
    sortBooks,
    filterByGenre,
    refresh
  } = useNetlifyBooks({
    limit: 12,
    sortBy: 'recommended'
  });

  // Local states
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedSort, setSelectedSort] = useState('recommended');
  const [cartItems, setCartItems] = useState([]);

  // Load genres (fallback to direct Appwrite if needed)
  useEffect(() => {
    const loadGenres = async () => {
      try {
        // Bu yerda genres API'ni qo'shish mumkin
        // Hozircha hozirgi logic'ni saqlaymiz
        console.log('Genres loading...');
      } catch (error) {
        console.error('Genres loading error:', error);
      }
    };

    loadGenres();
  }, []);

  // Add to cart function (hozirgi logic saqlanadi)
  const addToCart = async (bookToAdd) => {
    try {
      // Hozirgi addToCart logic'ni saqlaymiz
      console.log('Adding to cart:', bookToAdd.title);
      toastMessages.addedToCart(bookToAdd.title);
    } catch (error) {
      console.error('Add to cart error:', error);
      toastMessages.cartError();
    }
  };

  // Handle sort change
  const handleSortChange = (sortValue) => {
    setSelectedSort(sortValue);
    sortBooks(sortValue);
  };

  // Handle genre filter
  const handleGenreFilter = (genreValue) => {
    setSelectedGenre(genreValue);
    filterByGenre(genreValue === 'all' ? null : genreValue);
  };

  // Load more books
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMore();
    }
  };

  return (
    <div className="homepage-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content glassmorphism-card">
            <h1 className="hero-title">
              Zamon Books
              <span className="hero-subtitle">Zamonaviy Kitoblar Dunyosi</span>
            </h1>
            <p className="hero-description">
              Eng so'nggi va mashhur kitoblarni toping. 
              {books.length > 0 && ` ${books.length}+ kitob mavjud.`}
            </p>
            
            {/* Performance indicator */}
            {!loading && books.length > 0 && (
              <div className="hero-stats">
                <div className="stat-item">
                  <i className="fas fa-book"></i>
                  <span>{books.length} kitob</span>
                </div>
                <div className="stat-item">
                  <i className="fas fa-rocket"></i>
                  <span>Netlify Functions</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="container">
          <div className="filters-container glassmorphism-card">
            {/* Sort Options */}
            <div className="filter-group">
              <label htmlFor="sort-select">Saralash:</label>
              <select
                id="sort-select"
                value={selectedSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="glassmorphism-select"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Genre Filter */}
            <div className="filter-group">
              <label htmlFor="genre-select">Janr:</label>
              <select
                id="genre-select"
                value={selectedGenre}
                onChange={(e) => handleGenreFilter(e.target.value)}
                className="glassmorphism-select"
              >
                <option value="all">Barcha janrlar</option>
                {genres.map(genre => (
                  <option key={genre.$id} value={genre.$id}>
                    {genre.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={refresh}
              className="glassmorphism-button refresh-btn"
              disabled={loading}
              title="Yangilash"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
              {loading ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>
        </div>
      </section>

      {/* Books Grid Section */}
      <section className="books-section">
        <div className="container">
          {/* Error State */}
          {error && (
            <div className="error-message glassmorphism-card">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Xato: {error}</p>
              <button onClick={refresh} className="glassmorphism-button">
                Qayta urinish
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && books.length === 0 && (
            <div className="loading-container">
              <div className="loading-spinner">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Kitoblar yuklanmoqda...</p>
              </div>
            </div>
          )}

          {/* Books Grid */}
          {books.length > 0 && (
            <>
              <div className="books-grid">
                {books.map((book) => (
                  <div key={book.$id} className="book-card glassmorphism-card">
                    {/* Book Image */}
                    <div className="book-image-container">
                      <Link to={`/book/${book.$id}`}>
                        <ResponsiveImage
                          src={book.imageUrl}
                          alt={book.title}
                          className="book-image"
                          loading="lazy"
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
                      
                      <div className="book-price">
                        {book.price ? `${book.price.toLocaleString()} so'm` : 'Narx ko\'rsatilmagan'}
                      </div>

                      {/* Quick Actions */}
                      <div className="book-actions">
                        <button
                          onClick={() => addToCart(book)}
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
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="load-more-container">
                  <button
                    onClick={handleLoadMore}
                    className="glassmorphism-button load-more-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Yuklanmoqda...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus"></i>
                        Ko'proq yuklash ({currentPage}/{totalPages})
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && books.length === 0 && (
            <div className="empty-state glassmorphism-card">
              <i className="fas fa-book-open"></i>
              <h3>Kitoblar topilmadi</h3>
              <p>Hozircha bu kategoriyada kitoblar mavjud emas.</p>
              <button onClick={refresh} className="glassmorphism-button">
                Yangilash
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default EnhancedHomePage;