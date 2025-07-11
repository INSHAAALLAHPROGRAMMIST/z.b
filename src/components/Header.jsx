// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { databases, Query, ID } from '../appwriteConfig';
import '../index.css';

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = '686ee1900027589a0708';
const CART_ITEMS_COLLECTION_ID = 'cartItems';
const GENRES_COLLECTION_ID = 'genres'; // Janrlarni yuklash uchun kerak bo'ladi

function Header() {
    const [cartCount, setCartCount] = useState(0);
    const [genres, setGenres] = useState([]);

    // Savatdagi elementlar sonini yuklash
    const fetchCartCount = async () => {
        try {
            let currentUserId = localStorage.getItem('appwriteGuestId');
            if (!currentUserId) {
                currentUserId = ID.unique();
                localStorage.setItem('appwriteGuestId', currentUserId);
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [
                    Query.equal('users', currentUserId)
                ]
            );
            const totalQuantity = response.documents.reduce((sum, item) => sum + item.quantity, 0);
            setCartCount(totalQuantity);
        } catch (err) {
            console.error("Savat sonini yuklashda xato:", err);
        }
    };

    // Janrlarni yuklash
    const fetchGenres = async () => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                GENRES_COLLECTION_ID
            );
            setGenres(response.documents);
        } catch (error) {
            console.error("Janrlarni yuklashda xato:", error);
        }
    };

    useEffect(() => {
        fetchCartCount();
        fetchGenres();
    }, []);

    return (
        <header className="glassmorphism-header">
            <div className="container">
                <Link to="/" className="logo">Zamon Books</Link>
                <div className="search-bar glassmorphism-input">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Kitob qidirish..." />
                </div>
                <nav className="main-nav">
                    <ul className="glassmorphism-nav-list">
                        <li><Link to="/" className="glassmorphism-button">Barcha Kitoblar</Link></li>
                        <li className="dropdown">
                            <a href="#" className="glassmorphism-button dropbtn" onClick={(e) => { e.preventDefault(); document.getElementById('genre-dropdown-header').classList.toggle('show'); }}>Janrlar <i className="fas fa-caret-down"></i></a>
                            <div className="dropdown-content glassmorphism-dropdown" id="genre-dropdown-header">
                                {genres.map(genre => (
                                    <Link key={genre.$id} to={`/genres/${genre.$id}`}>{genre.name}</Link>
                                ))}
                            </div>
                        </li>
                        <li><Link to="/authors" className="glassmorphism-button">Mualliflar</Link></li>
                        <li><Link to="/news" className="glassmorphism-button">Yangiliklar</Link></li>
                        <li><Link to="/contact" className="glassmorphism-button">Aloqa</Link></li>
                    </ul>
                </nav>
                <div className="user-actions">
                    <Link to="/cart" className="glassmorphism-button">
                        <i className="fas fa-shopping-cart"></i>
                        <span className="cart-count">{cartCount}</span>
                    </Link>
                    <Link to="/profile" className="glassmorphism-button"><i className="fas fa-user"></i></Link>
                </div>
            </div>
        </header>
    );
}

export default Header;