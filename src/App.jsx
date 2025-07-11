// D:\\zamon-books-frontend\\src\\App.jsx
import React, { useState, useEffect } from 'react';
import { databases, ID, Query, account } from './appwriteConfig'; // 'account' servisni ham import qilish
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import './index.css'; // Global stillar

// Komponentlarni import qilish
import CartPage from './components/CartPage';
import BookDetailPage from './components/BookDetailPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute'; // ProtectedRoute ni import qilish

// --- Appwrite konsolidan olingan ID'lar ---
// Bu ID'lar .env faylidan o'qiladi, shuning uchun bu yerda import.meta.env dan foydalanamiz
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID; 

// ===============================================
// Bosh Sahifa Komponenti
// ===============================================
function HomePage() {
    const [books, setBooks] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [genresLoading, setGenresLoading] = useState(true);
    const [genresError, setGenresError] = useState(null);


    // addToCart funksiyasi HomePage ichida bo'lishi kerak, chunki u kitob kartochkalari bilan bog'liq
    const addToCart = async (bookToAdd) => {
        try {
            let currentUserId = localStorage.getItem('appwriteGuestId');
            if (!currentUserId) {
                currentUserId = ID.unique();
                localStorage.setItem('appwriteGuestId', currentUserId);
            }

            const existingCartItems = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [
                    Query.equal('users', currentUserId),
                    Query.equal('books', bookToAdd.$id)
                ]
            );

            if (existingCartItems.documents.length > 0) {
                const cartItem = existingCartItems.documents[0];
                const newQuantity = cartItem.quantity + 1;
                await databases.updateDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    cartItem.$id,
                    {
                        quantity: newQuantity
                    }
                );
                console.log(`Kitob miqdori oshirildi: ${bookToAdd.title}, Yangi miqdor: ${newQuantity}`);
            } else {
                await databases.createDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    ID.unique(),
                    {
                        users: currentUserId,
                        books: bookToAdd.$id,
                        quantity: 1,
                        priceAtTimeOfAdd: parseFloat(bookToAdd.price)
                    }
                );
                console.log(`Kitob savatga qo'shildi: ${bookToAdd.title}`);
            }
            alert(`${bookToAdd.title} savatga qo'shildi!`);
            // Savat sonini global ravishda yangilash uchun custom event yuborish
            window.dispatchEvent(new CustomEvent('cartUpdated'));

        } catch (err) {
            console.error("Savatga qo'shishda xato yuz berdi:", err);
            alert("Kitobni savatga qo'shishda xato yuz berdi.");
        }
    };


    useEffect(() => {
        const fetchBooksAndGenres = async () => {
            try {
                // Kitoblarni muallif va janr ma'lumotlari bilan birga yuklash
                const booksResponse = await databases.listDocuments(
                    DATABASE_ID,
                    BOOKS_COLLECTION_ID,
                    [Query.limit(8), Query.select(['*', 'author', 'genres'])]
                );
                setBooks(booksResponse.documents);

                const genresResponse = await databases.listDocuments(
                    DATABASE_ID,
                    GENRES_COLLECTION_ID,
                    [Query.limit(6)]
                );
                setGenres(genresResponse.documents);

                setLoading(false);
            } catch (err) {
                console.error("Ma'lumotlarni yuklashda xato:", err);
                setError(err.message || "Ma'lumotlarni yuklashda noma'lum xato.");
                setLoading(false);
            }
        };

        fetchBooksAndGenres();
    }, []);

    if (loading) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>Yuklanmoqda...</div>;
    }

    if (error) {
        return <div className="container" style={{ textAlign: 'center', padding: '50px', color: 'red', minHeight: 'calc(100vh - 200px)' }}>Xato: {error}</div>;
    }

    return (
        <main>
            <section className="hero-banner">
                <div className="hero-content"> {/* hero-card o'rniga hero-content ishlatildi */}
                    {/* Yozuvlar kichraytirilib, teparoqqa joylashtiriladi. Yangi stil classlari ishlatildi */}
                    <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                    <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari, innovatsion texnologiyalar bilan birga.</p>
                    {/* "Kitoblarni Ko'rish" tugmasi butunlay olib tashlandi */}
                </div>
            </section>

            <section className="container">
                <h2 className="section-title">Eng So'nggi Kitoblar</h2>
                <div className="book-grid">
                    {books.map(book => (
                        <Link to={`/book/${book.$id}`} key={book.$id} className="book-card glassmorphism-card">
                            <img src={book.imageUrl} alt={book.title} />
                            <div className="book-info">
                                <h3>{book.title}</h3>
                                {book.author && book.author.name && <p className="author">{book.author.name}</p>}
                                {book.genres && book.genres.length > 0 && <p className="genre">{book.genres[0].name}</p>}
                                <p className="price">{parseFloat(book.price).toFixed(2)} so'm</p>
                                <button
                                    className="add-to-cart glassmorphism-button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        addToCart(book);
                                    }}
                                >
                                    <i className="fas fa-shopping-cart"></i> Savatga qo'shish
                                </button>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="container">
                <h2 className="section-title">Janrlar Boʻyicha Keng Tanlov</h2>
                <div className="genre-grid">
                    {genres.map(genre => (
                        <Link to={`/genres/${genre.$id}`} key={genre.$id} className="genre-card glassmorphism-card">
                            <div className="genre-bg" style={{ backgroundImage: `url(${genre.imageUrl || 'https://source.unsplash.com/random/400x250/?books,abstract'})` }}></div>
                            <h3 className="genre-name">{genre.name}</h3>
                        </Link>
                    ))}
                </div>
            </section>
        </main>
    );
}

// ===============================================
// Asosiy Layout Komponenti (Header va Footer ni o'z ichiga oladi)
// ===============================================
function MainLayout({ children }) {
    const [cartCount, setCartCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false); // Foydalanuvchi login holati

    // Savatdagi elementlar sonini yuklash
    const updateGlobalCartCount = async () => {
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
            console.error("Global savat sonini yuklashda xato:", err);
        }
    };

    // Foydalanuvchi login holatini tekshirish
    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                await account.get(); // Sessiya mavjudligini tekshirish
                setIsLoggedIn(true);
            } catch (error) {
                setIsLoggedIn(false);
            }
        };
        checkLoginStatus();

        // Custom event listener for cart updates
        window.addEventListener('cartUpdated', updateGlobalCartCount);
        return () => {
            window.removeEventListener('cartUpdated', updateGlobalCartCount);
        };
    }, []);

    // Janr dropdown funksiyalari (Headerda foydalanish uchun MainLayout ichiga ko'chirildi)
    const toggleDropdown = (e) => {
        e.preventDefault();
        const dropdownContent = document.getElementById('genre-dropdown');
        if (dropdownContent) {
            dropdownContent.classList.toggle('show');
        }
    };

    const closeDropdown = (e) => {
        if (!e.target.matches('.dropbtn') && !e.target.closest('.dropdown-content')) {
            const dropdownContent = document.getElementById('genre-dropdown');
            if (dropdownContent && dropdownContent.classList.contains('show')) {
                dropdownContent.classList.remove('show');
            }
        }
    };

    useEffect(() => {
        window.addEventListener('click', closeDropdown);
        return () => {
            window.removeEventListener('click', closeDropdown);
        };
    }, []);

    // Genres data for header dropdown (simple fetch here, can be optimized)
    const [genres, setGenres] = useState([]);
    const [genresLoading, setGenresLoading] = useState(true);
    const [genresError, setGenresError] = useState(null);

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const genresResponse = await databases.listDocuments(
                    DATABASE_ID,
                    GENRES_COLLECTION_ID,
                    [
                        Query.limit(20),
                        Query.orderAsc('name'),
                    ]
                );
                setGenres(genresResponse.documents);
                setGenresLoading(false);
            } catch (err) {
                console.error("Janrlarni yuklashda xato:", err);
                setGenresError(err.message || "Janrlarni yuklashda noma'lum xato.");
                setGenresLoading(false);
            }
        };
        fetchGenres();
    }, []);


      return (
        <>
            {/* Global Header / Navbar */}
            <header className="glassmorphism-header">
                <div className="container">
                    {/* Logo ham / ga olib boradi */}
                    <Link to="/" className="logo">Zamon Books</Link>
                    
                    <div className="search-bar glassmorphism-input">
                        <i className="fas fa-search"></i>
                        <input type="text" id="search-input" name="search" placeholder="Kitob qidirish..." />
                    </div>
                    <nav className="main-nav">
                        <ul className="glassmorphism-nav-list">
                            <li><Link to="/" className="glassmorphism-button" aria-label="Bosh sahifa"><i className="fas fa-home"></i></Link></li>
                            <li className="dropdown">
                                <a href="#" className="glassmorphism-button dropbtn" onClick={toggleDropdown}>Janrlar <i className="fas fa-caret-down"></i></a>
                                <div className="dropdown-content glassmorphism-dropdown" id="genre-dropdown">
                                    {genresLoading && <a href="#">Yuklanmoqda...</a>}
                                    {genresError && <a href="#" style={{ color: 'red' }}>Xato yuklandi!</a>}
                                    {!genresLoading && !genresError && genres.length === 0 && <a href="#">Janrlar topilmadi.</a>}
                                    {!genresLoading && !genresError && genres.map(genre => (
                                        <Link key={genre.$id} to={`/genres/${genre.$id}`}>
                                            {genre.name === 'Diniy' ? 'Diniy Adabiyotlar' : genre.name}
                                        </Link>
                                    ))}
                                </div>
                            </li>
                            <li><Link to="/authors" className="glassmorphism-button">Mualliflar</Link></li>
                            <li><Link to="/news" className="glassmorphism-button">Yangiliklar</Link></li>
                            <li><Link to="/contact" className="glassmorphism-button">Aloqa</Link></li>
                        </ul>
                    </nav>
                    <div className="user-actions">
                        <Link to="/cart" className="glassmorphism-button" aria-label="Savat">
                            <i className="fas fa-shopping-cart"></i>
                            <span className="cart-count">{cartCount}</span>
                        </Link>
                        
                        {/* Admin linkini ikonka shaklida, profil tugmasi yonida */}
                        {isLoggedIn ? (
                            <Link to="/admin-dashboard" className="glassmorphism-button" aria-label="Admin Paneli">
                                <i className="fas fa-user-shield"></i> {/* Admin paneli ikonkasi */}
                            </Link>
                        ) : (
                            <Link to="/admin-login" className="glassmorphism-button" aria-label="Admin Kirish">
                                <i className="fas fa-user-lock"></i> {/* Admin kirish ikonkasi */}
                            </Link>
                        )}
                        
                        <Link to="/profile" className="glassmorphism-button" aria-label="Profil">
                            <i className="fas fa-user"></i>
                        </Link>
                    </div>
                </div>
            </header>

            {children} {/* Bu yerda ichki sahifalar render qilinadi */}

            {/* Global Footer */}
            <footer className="glassmorphism-footer">
                <div className="container">
                    <div className="footer-col">
                        <h3>Zamon Books</h3>
                        <p>Zamon Books – Bilimga intiluvchilar uchun.</p>
                        <div className="social-icons">
                            <a href="#" className="glassmorphism-button"><i className="fab fa-telegram-plane"></i></a>
                            <a href="#" className="glassmorphism-button"><i className="fab fa-instagram"></i></a>
                            <a href="#" className="glassmorphism-button"><i className="fab fa-facebook-f"></i></a>
                        </div>
                    </div>
                    <div className="footer-col">
                        <h3>Tezkor Havolalar</h3>
                        <ul>
                            <li><Link to="/">Barcha Kitoblar</Link></li>
                            <li><Link to="/news">Yangiliklar</Link></li>
                            <li><Link to="/contact">Aloqa</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h3>Yordam</h3>
                        <ul>
                            <li><Link to="/faq">Ko'p Beriladigan Savollar</Link></li>
                            <li><Link to="/privacy">Maxfiylik Siyosati</Link></li>
                            <li><Link to="/terms">Foydalanish Shartlari</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="copyright">
                    <p>&copy; 2025 Zamon Books. Barcha huquqlar himoyalangan.</p>
                </div>
            </footer>
        </>
    );
}

// ===============================================
// Asosiy App Komponenti (Routingni boshqaradi)
// ===============================================
function App() {
    return (
        <Routes>
            {/* Har bir Route elementini MainLayout ichiga o'rab chiqamiz */}
            <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
            <Route path="/book/:bookId" element={<MainLayout><BookDetailPage /></MainLayout>} />
            <Route path="/cart" element={<MainLayout><CartPage /></MainLayout>} />
            <Route path="/authors" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Mualliflar sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/genres/:genreId" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Janr sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/news" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Yangiliklar sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/contact" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Aloqa sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/profile" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Profil sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/faq" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}> Ko'p Beriladigan Savollar sahifasi (tez orada)</div></MainLayout>} />

            {/* Admin yo'llari */}
            <Route path="/admin-login" element={<MainLayout><AdminLogin /></MainLayout>} /> {/* Admin kirish sahifasi */}
            <Route
                path="/admin-dashboard"
                element={
                    <ProtectedRoute>
                        <MainLayout><AdminDashboard /></MainLayout>
                    </ProtectedRoute>
                }
            />

            {/* Admin paneli ichidagi yo'llar (ProtectedRoute ichida bo'lishi kerak) */}
            <Route
                path="/admin/books"
                element={
                    <ProtectedRoute>
                        <MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Kitoblarni boshqarish sahifasi (Admin)</div></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/orders"
                element={
                    <ProtectedRoute>
                        <MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Buyurtmalarni boshqarish sahifasi (Admin)</div></MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users"
                element={
                    <ProtectedRoute>
                        <MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Foydalanuvchilarni boshqarish sahifasi (Admin)</div></MainLayout>
                    </ProtectedRoute>
                }
            />

            {/* Topilmagan sahifalar uchun (ixtiyoriy) */}
            <Route path="*" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>404 - Sahifa topilmadi</div></MainLayout>} />
        </Routes>
    );
}

export default App;