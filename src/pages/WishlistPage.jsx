// Wishlist Page - Saqlangan kitoblar sahifasi
// Foydalanuvchi o'z sevimli kitoblarini ko'radi

import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import WishlistButton from '../components/WishlistButton';

const WishlistPage = () => {
  const { wishlistItems, wishlistCount, loading } = useWishlist();

  if (loading) {
    return (
      <div className="container" style={{ marginTop: '100px', textAlign: 'center' }}>
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          <p style={{ marginTop: '1rem' }}>Sevimlilar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ marginTop: '100px', marginBottom: '50px' }}>
      {/* Header */}
      <div className="wishlist-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">
          <i className="fas fa-heart" style={{ color: '#ff6b6b', marginRight: '0.5rem' }}></i>
          Sevimli Kitoblar
        </h1>
        <p className="page-subtitle">
          {wishlistCount > 0 
            ? `${wishlistCount} ta kitob saqlangan`
            : 'Hali sevimli kitoblar yo\'q'
          }
        </p>
      </div>

      {/* Empty State */}
      {wishlistCount === 0 && (
        <div className="empty-wishlist">
          <div className="empty-icon">
            <i className="fas fa-heart-broken" style={{ fontSize: '4rem', color: '#ccc' }}></i>
          </div>
          <h2>Sevimli kitoblar yo'q</h2>
          <p>Yoqgan kitoblaringizni saqlash uchun yurakcha tugmasini bosing</p>
          <Link to="/" className="glassmorphism-button" style={{ marginTop: '1rem' }}>
            <i className="fas fa-home"></i>
            Bosh sahifaga qaytish
          </Link>
        </div>
      )}

      {/* Wishlist Grid */}
      {wishlistCount > 0 && (
        <div className="wishlist-grid">
          {wishlistItems.map((item) => (
            <div key={item.bookId} className="wishlist-card glassmorphism-card">
              <div className="wishlist-card-header">
                <Link to={`/book/${item.bookId}`} className="book-link">
                  <img
                    src={item.bookImage || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'}
                    alt={item.bookTitle}
                    className="wishlist-book-image"
                    style={{
                      width: '100px',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg';
                    }}
                  />
                </Link>
                <div className="wishlist-remove">
                  <WishlistButton 
                    book={{
                      $id: item.bookId,
                      title: item.bookTitle,
                      authorName: item.bookAuthor,
                      imageUrl: item.bookImage,
                      price: item.bookPrice
                    }}
                    size="small"
                  />
                </div>
              </div>
              
              <div className="wishlist-card-content">
                <h3 className="book-title">
                  <Link to={`/book/${item.bookId}`}>
                    {item.bookTitle}
                  </Link>
                </h3>
                
                {item.bookAuthor && (
                  <p className="book-author">
                    <i className="fas fa-user"></i>
                    {item.bookAuthor}
                  </p>
                )}
                
                {item.bookPrice && (
                  <p className="book-price">
                    <i className="fas fa-tag"></i>
                    {parseFloat(item.bookPrice).toLocaleString()} so'm
                  </p>
                )}
                
                <p className="added-date">
                  <i className="fas fa-calendar"></i>
                  {new Date(item.addedAt).toLocaleDateString('uz-UZ')}
                </p>
                
                <div className="wishlist-actions">
                  <Link 
                    to={`/book/${item.bookId}`}
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
      )}

      <style jsx>{`
        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-subtitle {
          font-size: 1.1rem;
          opacity: 0.8;
          margin-bottom: 0;
        }

        .empty-wishlist {
          text-align: center;
          padding: 4rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .empty-wishlist h2 {
          font-size: 1.8rem;
          margin: 1rem 0;
          opacity: 0.8;
        }

        .empty-wishlist p {
          font-size: 1.1rem;
          opacity: 0.7;
          margin-bottom: 2rem;
        }

        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.2rem;
          justify-content: center;
          align-items: start;
        }

        .wishlist-card {
          padding: 1rem;
          transition: all 0.3s ease;
          width: 100%;
          min-height: 350px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .wishlist-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .wishlist-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s ease;
        }

        .wishlist-card:hover::before {
          left: 100%;
        }

        .wishlist-card-header {
          position: relative;
          margin-bottom: 0.8rem;
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 120px;
        }

        .wishlist-book-image {
          border-radius: 8px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
          transition: transform 0.3s ease;
          display: block;
          max-width: 100%;
          height: auto;
          width: 80px;
          height: 120px;
          object-fit: cover;
        }

        .book-link:hover .wishlist-book-image {
          transform: scale(1.05);
        }

        .wishlist-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          z-index: 10;
        }

        .wishlist-card-content {
          text-align: center;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .book-title {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
          line-height: 1.3;
          min-height: 2.4rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .book-title a {
          color: inherit;
          text-decoration: none;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, transparent 0%, #ff6b6b 50%, transparent 100%);
          background-size: 200% 100%;
          background-position: 100% 0;
          -webkit-background-clip: text;
          background-clip: text;
        }

        .book-title a:hover {
          background-position: 0% 0;
          -webkit-text-fill-color: transparent;
        }

        .book-author,
        .book-price,
        .added-date {
          font-size: 0.8rem;
          opacity: 0.8;
          margin-bottom: 0.3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          transition: opacity 0.3s ease;
        }

        .wishlist-card:hover .book-author,
        .wishlist-card:hover .book-price,
        .wishlist-card:hover .added-date {
          opacity: 1;
        }

        .book-price {
          color: #10b981;
          font-weight: 600;
          font-size: 0.9rem;
          background: linear-gradient(135deg, #10b981, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .book-author i,
        .book-price i,
        .added-date i {
          opacity: 0.7;
          transition: transform 0.3s ease;
        }

        .wishlist-card:hover .book-author i,
        .wishlist-card:hover .book-price i,
        .wishlist-card:hover .added-date i {
          transform: scale(1.1);
        }

        .wishlist-actions {
          margin-top: 1rem;
        }

        .view-btn {
          width: 100%;
          justify-content: center;
          padding: 0.7rem 1.2rem;
          font-weight: 600;
          font-size: 0.85rem;
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
          transition: all 0.3s ease;
        }

        .view-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1));
        }

        .view-btn i {
          margin-right: 0.5rem;
          transition: transform 0.3s ease;
        }

        .view-btn:hover i {
          transform: scale(1.1);
        }

        /* Light mode */
        body.light-mode .page-title {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        body.light-mode .empty-wishlist {
          background: rgba(0, 0, 0, 0.02);
          border-color: rgba(0, 0, 0, 0.1);
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .wishlist-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
          }
          
          .page-title {
            font-size: 2rem;
          }
          
          .wishlist-card {
            padding: 1rem;
            max-width: none;
            min-height: 320px;
          }

          .book-title {
            font-size: 0.9rem;
          }

          .wishlist-book-image {
            width: 70px;
            height: 105px;
          }
        }

        @media (max-width: 480px) {
          .wishlist-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 0.8rem;
            padding: 0 0.5rem;
          }

          .wishlist-card {
            padding: 0.8rem;
            min-height: 300px;
          }

          .page-title {
            font-size: 1.75rem;
          }

          .book-title {
            font-size: 0.85rem;
          }

          .view-btn {
            padding: 0.6rem 1rem;
            font-size: 0.8rem;
          }

          .wishlist-book-image {
            width: 60px;
            height: 90px;
          }
        }
      `}</style>
    </div>
  );
};

export default WishlistPage;