import React from 'react';
import { Link } from 'react-router-dom';
import ResponsiveImage from './ResponsiveImage';

// Memoized book card component
const OptimizedBookCard = React.memo(({ book, onAddToCart, cartQuantity }) => {
    const bookUrl = book.slug ? `/kitob/${book.slug}` : `/book/${book.$id}`;
    
    const handleAddToCart = React.useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToCart(book);
    }, [book, onAddToCart]);

    const handleQuantityChange = React.useCallback((e, delta) => {
        e.preventDefault();
        e.stopPropagation();
        onAddToCart(book, cartQuantity + delta);
    }, [book, onAddToCart, cartQuantity]);

    return (
        <Link to={bookUrl} className="book-card glassmorphism-card">
            <ResponsiveImage
                src={book.imageUrl}
                alt={book.title}
                className="book-image"
                context="homepage-card"
            />
            <div className="book-info">
                <h3>{book.title}</h3>
                {book.author?.name && <p className="author">{book.author.name}</p>}
                {book.genres?.[0]?.name && <p className="genre">{book.genres[0].name}</p>}
                <p className="price">{parseFloat(book.price).toFixed(2)} so'm</p>

                {cartQuantity === 0 ? (
                    <button
                        className="add-to-cart glassmorphism-button"
                        onClick={handleAddToCart}
                    >
                        <i className="fas fa-cart-plus"></i> Savatga qo'shish
                    </button>
                ) : (
                    <div className="quantity-controls">
                        <button
                            className="glassmorphism-button"
                            onClick={(e) => handleQuantityChange(e, -1)}
                        >
                            -
                        </button>
                        <span className="quantity">{cartQuantity}</span>
                        <button
                            className="glassmorphism-button"
                            onClick={(e) => handleQuantityChange(e, 1)}
                        >
                            +
                        </button>
                    </div>
                )}
            </div>
        </Link>
    );
});

OptimizedBookCard.displayName = 'OptimizedBookCard';

export default OptimizedBookCard;