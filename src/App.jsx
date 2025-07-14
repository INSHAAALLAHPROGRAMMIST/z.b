// D:\\zamon-books-frontend\\src\\App.jsx
import React, { useState, useEffect } from 'react';
import { databases, ID, Query, account } from './appwriteConfig';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import './index.css'; // Global CSS faylingiz

// Komponentlarni import qilish
import CartPage from './components/CartPage';
import BookDetailPage from './components/BookDetailPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AuthForm from './components/AuthForm';
import ProfilePage from './components/ProfilePage';

// --- Appwrite konsolidan olingan ID'lar ---
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

    const addToCart = async (bookToAdd) => {
        try {
            // Foydalanuvchi ID'sini tekshirish: agar kirgan bo'lsa, uning ID'si, aks holda guest ID
            const currentUser = await account.get().catch(() => null);
            let currentUserId = currentUser ? currentUser.$id : localStorage.getItem('appwriteGuestId');

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
            window.dispatchEvent(new CustomEvent('cartUpdated'));

        }
        catch (err) {
            console.error("Savatga qo'shishda xato yuz berdi:", err);
            alert("Kitobni savatga qo'shishda xato yuz berdi.");
        }
    };

    useEffect(() => {
        const fetchBooksAndGenres = async () => {
            try {
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
                <div className="hero-content">
                    <h1 className="hero-title-small">Kelajak kitoblari Zamon Books'da</h1>
                    <p className="hero-subtitle-small">Dunyo adabiyotining eng sara asarlari, innovatsion texnologiyalar bilan birga.</p>
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

            <section className="container genre-section">
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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [genres, setGenres] = useState([]);
    const [genresLoading, setGenresLoading] = useState(true);
    const [genresError, setGenresError] = useState(null);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const navigate = useNavigate();

    const headerLogoUrl = "https://res.cloudinary.com/dcn4maral/image/upload/c_scale,h_280,f_auto,q_auto/v1752356041/favicon_maovuy.svg";

    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            return newTheme;
        });
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
        if (!isMobileMenuOpen) {
            setShowSearchInput(false);
        }
    };

    const toggleSearchInput = () => {
        setShowSearchInput(!showSearchInput);
        if (!showSearchInput) {
            setIsMobileMenuOpen(false);
        }
    };

    // handleLogout funksiyasi endi faqat ProfilePage da ishlatiladi, headerda emas.
    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
            setIsLoggedIn(false);
            setIsAdmin(false);
            navigate('/auth');
            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (err) {
            console.error("Tizimdan chiqishda xato:", err);
        }
    };

    const updateGlobalCartCount = async () => {
        try {
            const currentUser = await account.get().catch(() => null);
            let userIdToUse = currentUser ? currentUser.$id : localStorage.getItem('appwriteGuestId');

            if (!userIdToUse) {
                userIdToUse = ID.unique();
                localStorage.setItem('appwriteGuestId', userIdToUse);
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [
                    Query.equal('users', userIdToUse)
                ]
            );
            const totalQuantity = response.documents.reduce((sum, item) => sum + item.quantity, 0);
            setCartCount(totalQuantity);
        } catch (err) {
            console.error("Global savat sonini yuklashda xato:", err);
        }
    };

    useEffect(() => {
        document.body.className = theme === 'light' ? 'light-mode' : '';

        const checkLoginStatusAndFetchGenres = async () => {
            try {
                const user = await account.get();
                setIsLoggedIn(true);
                if (user && user.labels && user.labels.includes('admin')) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                setIsLoggedIn(false);
                setIsAdmin(false);
            }

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

        checkLoginStatusAndFetchGenres();
        updateGlobalCartCount();

        window.addEventListener('cartUpdated', updateGlobalCartCount);

        if (isMobileMenuOpen || showSearchInput) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        const handleEscape = (e) => {
            if (e.key === 'Escape' && (isMobileMenuOpen || showSearchInput)) {
                setIsMobileMenuOpen(false);
                setShowSearchInput(false);
            }
        };
        window.addEventListener('keydown', handleEscape);


        return () => {
            window.removeEventListener('cartUpdated', updateGlobalCartCount);
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isMobileMenuOpen, showSearchInput, theme]);


    const toggleDropdown = (e) => {
        e.preventDefault();
        if (!isMobileMenuOpen || window.innerWidth > 768) {
            const dropdownContent = document.getElementById('genre-dropdown');
            if (dropdownContent) {
                dropdownContent.classList.toggle('show');
            }
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
        const handleOutsideClick = (e) => {
            if (window.innerWidth > 768) {
                closeDropdown(e);
            }
        };
        window.addEventListener('click', handleOutsideClick);
        return () => {
            window.removeEventListener('click', handleOutsideClick);
        };
    }, []);


    return (
        <>
            <header className={`glassmorphism-header ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
                <div className="container">
                    <Link to="/" className="logo">
                        <img src={headerLogoUrl} alt="Zamon Books Logo" className="header-logo" />
                        <span style={{ marginLeft: '10px', fontSize: '1.5em', fontWeight: 'bold' }}>Zamon Books</span>
                    </Link>

                    {/* Hamburger ikonkasi va "X" tugmasi */}
                    <div className="hamburger-menu" onClick={toggleMobileMenu}>
                        <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                    </div>

                    {/* Mobil qidiruv ikonka */}
                    <div className="mobile-search-icon" onClick={toggleSearchInput}>
                        <i className="fas fa-search"></i>
                    </div>

                    {/* Tema almashtirish tugmasi */}
                    <div className="theme-toggle-button" onClick={toggleTheme} aria-label="Temani almashtirish">
                        <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                    </div>


                    {/* Qidiruv paneli - faqat desktopda ko'rinadi, mobilda dinamik */}
                    <div className={`search-bar glassmorphism-input ${showSearchInput ? 'active-mobile' : ''}`}>
                        <i className="fas fa-search"></i>
                        <input type="text" id="search-input" name="search" placeholder="Kitob qidirish..." />
                    </div>

                    {/* Navigatsiya elementi */}
                    <nav className={`main-nav ${isMobileMenuOpen ? 'active' : ''}`}>
                        <ul className="glassmorphism-nav-list">
                            <li><Link to="/" className="glassmorphism-button" aria-label="Bosh sahifa" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-home"></i></Link></li>
                            <li className="dropdown">
                                <a href="#" className="glassmorphism-button dropbtn" onClick={toggleDropdown}>Janrlar <i className="fas fa-caret-down"></i></a>
                                <div className="dropdown-content glassmorphism-dropdown" id="genre-dropdown">
                                    {genresLoading && <a href="#">Yuklanmoqda...</a>}
                                    {genresError && <a href="#" style={{ color: 'red' }}>Xato yuklandi!</a>}
                                    {!genresLoading && !genresError && genres.length === 0 && <a href="#">Janrlar topilmadi.</a>}
                                    {!genresLoading && !genresError && genres.map(genre => (
                                        <Link key={genre.$id} to={`/genres/${genre.$id}`} onClick={() => setIsMobileMenuOpen(false)}>
                                            {genre.name === 'Diniy' ? 'Diniy Adabiyotlar' : genre.name}
                                        </Link>
                                    ))}
                                </div>
                            </li>
                            <li><Link to="/authors" className="glassmorphism-button" onClick={() => setIsMobileMenuOpen(false)}>Mualliflar</Link></li>
                            <li><Link to="/news" className="glassmorphism-button" onClick={() => setIsMobileMenuOpen(false)}>Yangiliklar</Link></li>
                            <li><Link to="/contact" className="glassmorphism-button" onClick={() => setIsMobileMenuOpen(false)}>Aloqa</Link></li>

                            {/* Foydalanuvchi amallari - Mobil menyu ichida */}
                            <li className="mobile-user-actions">
                                <Link to="/cart" className="glassmorphism-button" aria-label="Savat" onClick={() => setIsMobileMenuOpen(false)}>
                                    <i className="fas fa-shopping-cart"></i> Savat
                                    <span className="cart-count">{cartCount}</span>
                                </Link>
                                {isLoggedIn ? (
                                    <Link to="/profile" className="glassmorphism-button" aria-label="Profil" onClick={() => setIsMobileMenuOpen(false)}>
                                        <i className="fas fa-user"></i> Profil
                                    </Link>
                                ) : (
                                    <Link to="/auth" className="glassmorphism-button" aria-label="Kirish/Ro'yxatdan o'tish" onClick={() => setIsMobileMenuOpen(false)}>
                                        <i className="fas fa-sign-in-alt"></i> Kirish / Ro'yxatdan O'tish
                                    </Link>
                                )}
                            </li>
                            {/* Admin kirish/panel tugmasi - ALOHIDA QISM */}
                            <li className="admin-mobile-link">
                                {isAdmin ? (
                                    <Link to="/admin-dashboard" className="glassmorphism-button" aria-label="Admin Paneli" onClick={() => setIsMobileMenuOpen(false)}>
                                        <i className="fas fa-user-shield"></i> Admin Paneli
                                    </Link>
                                ) : (
                                    null
                                )}
                            </li>
                        </ul>
                    </nav>

                    {/* Foydalanuvchi amallari - DESKTOP UCHUN */}
                    <div className="user-actions desktop-only">
                        <Link to="/cart" className="glassmorphism-button" aria-label="Savat" onClick={() => setIsMobileMenuOpen(false)}>
                            <i className="fas fa-shopping-cart"></i>
                            <span className="cart-count">{cartCount}</span>
                        </Link>

                        {isLoggedIn ? (
                            <Link to="/profile" className="glassmorphism-button" aria-label="Profil" onClick={() => setIsMobileMenuOpen(false)}>
                                <i className="fas fa-user"></i>
                            </Link>
                        ) : (
                            <Link to="/auth" className="glassmorphism-button" aria-label="Kirish/Ro'yxatdan o'tish" onClick={() => setIsMobileMenuOpen(false)}>
                                <i className="fas fa-sign-in-alt"></i>
                            </Link>
                        )}

                        {/* Admin Kirish/Panel tugmasi - desktopda alohida */}
                        {isAdmin ? (
                            <Link to="/admin-dashboard" className="glassmorphism-button" aria-label="Admin Paneli" onClick={() => setIsMobileMenuOpen(false)}>
                                <i className="fas fa-user-shield"></i>
                            </Link>
                        ) : (
                            null
                        )}
                    </div>

                </div>
            </header>

            {/* Mobil menyu va qidiruv ochilganda overlay */}
            {(isMobileMenuOpen || showSearchInput) && <div className="mobile-menu-overlay" onClick={() => {
                setIsMobileMenuOpen(false);
                setShowSearchInput(false);
            }}></div>}


            {children}

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
                            <li><Link to="/faq">Ko'p Beriladigan Savollar (FAQ)</Link></li>
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
            <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
            <Route path="/book/:bookId" element={<MainLayout><BookDetailPage /></MainLayout>} />
            <Route path="/cart" element={<MainLayout><CartPage /></MainLayout>} />
            <Route path="/auth" element={<MainLayout><AuthForm /></MainLayout>} />
            <Route path="/profile" element={<MainLayout><ProfilePage /></MainLayout>} />
            {/* YANGI: Tasdiqlashdan keyin yo'naltiriladigan sahifalar */}
            <Route path="/verification-success" element={<MainLayout><VerificationStatusPage status="success" /></MainLayout>} />
            <Route path="/verification-failure" element={<MainLayout><VerificationStatusPage status="failure" /></MainLayout>} />
            {/* YANGI: Tasdiqlashdan keyin yo'naltiriladigan sahifalar */}
            <Route path="/authors" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Mualliflar sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/genres/:genreId" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Janr sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/news" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Yangiliklar sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/contact" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>Aloqa sahifasi (tez orada)</div></MainLayout>} />
            <Route path="/faq" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}> Ko'p Beriladigan Savollar sahifasi (tez orada)</div></MainLayout>} />

            <Route path="/admin-login" element={<MainLayout><AdminLogin /></MainLayout>} />
            <Route
                path="/admin-dashboard"
                element={
                    <ProtectedRoute>
                        <MainLayout><AdminDashboard /></MainLayout>
                    </ProtectedRoute>
                }
            />

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

            <Route path="*" element={<MainLayout><div className="container" style={{ padding: '50px', textAlign: 'center', minHeight: 'calc(100vh - 200px)' }}>404 - Sahifa topilmadi</div></MainLayout>} />
        </Routes>
    );
}

// ===============================================
// Verification Status Page Komponenti
// ===============================================
const VerificationStatusPage = ({ status }) => {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const confirmVerification = async () => {
            setIsProcessing(false);
            if (status === 'success') {
                setMessage('Elektron pochtangiz muvaffaqiyatli tasdiqlandi! Endi tizimga kirishingiz mumkin.');
            } else {
                setMessage('Elektron pochtangizni tasdiqlashda xato yuz berdi. Iltimos, qayta urinib ko\'ring yoki qo\'llab-quvvatlash xizmatiga murojaat qiling.');
            }
        };

        confirmVerification();
    }, [status]);

    return (
        <div className="container auth-container glassmorphism-card" style={{ marginTop: '50px', marginBottom: '50px' }}>
            <h2 className="section-title">Elektron Pochta Tasdiqlash Holati</h2>
            {isProcessing ? (
                <p>Tasdiqlash jarayonida...</p>
            ) : (
                <>
                    <p style={{ color: status === 'success' ? 'green' : 'red', fontWeight: 'bold' }}>{message}</p>
                    <button onClick={() => navigate('/auth')} className="glassmorphism-button" style={{ marginTop: '20px' }}>
                        Kirish sahifasiga o'tish
                    </button>
                </>
            )}
        </div>
    );
};


export default App;
