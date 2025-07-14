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

import HomePage from './pages/HomePage';

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;



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

        // window.addEventListener('cartUpdated', updateGlobalCartCount);

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
            <header id='bluruchun' className={`glassmorphism-header ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
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
                                <div className="dropdown-content glassmorphism-dropdown" id="genre-dropdown bluruchun">
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
            <Route path="/" element={<MainLayout><HomePage databases={databases} DATABASE_ID={DATABASE_ID} /></MainLayout>} />
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

export default App;
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