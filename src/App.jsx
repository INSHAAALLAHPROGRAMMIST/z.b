// D:\\zamon-books-frontend\\src\\App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { databases, ID, Query, account } from './appwriteConfig';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';

// Core components (always needed)
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import ToastContainer from './components/Toast';
// Performance monitoring disabled to reduce console noise
// import PerformanceMonitor from './components/PerformanceMonitor';

// Lazy load pages for better performance
import {
    LazyHomePage,
    LazySearchPage,
    LazyCartPage,
    LazyBookDetailPage,
    LazyUserOrdersPage,
    LazyProfilePage,
    LazyAuthForm,
    LazyAdminLogin,
    LazyComingSoon
} from './pages/LazyPages';

// Lazy load admin components
import {
    LazyAdminDashboard,
    LazyAdminBookManagement,
    LazyAdminAuthorManagement,
    LazyAdminGenreManagement,
    LazyAdminOrderManagement,
    LazyAdminUserManagement,
    LazyAdminSettings
} from './components/admin/LazyAdminComponents';

// --- Appwrite konsolidan olingan ID'lar ---
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;
// USERS_COLLECTION_ID olib tashlandi - Auth ishlatamiz



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

    // Simplified refs for performance
    const aboveFoldRef = useRef(null);
    const belowFoldRef = useRef(null);

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



    const updateGlobalCartCount = useCallback(async () => {
        try {
            // Avoid unnecessary account.get() calls - use cached login state
            let userIdToUse = isLoggedIn ? 
                (localStorage.getItem('currentUserId') || localStorage.getItem('appwriteGuestId')) : 
                localStorage.getItem('appwriteGuestId');

            if (!userIdToUse) {
                userIdToUse = ID.unique();
                localStorage.setItem('appwriteGuestId', userIdToUse);
            }

            const response = await databases.listDocuments(
                DATABASE_ID,
                CART_ITEMS_COLLECTION_ID,
                [
                    Query.equal('userId', userIdToUse),
                    Query.limit(100) // Limit for better performance
                ]
            );
            const totalQuantity = response.documents.reduce((sum, item) => sum + item.quantity, 0);
            setCartCount(totalQuantity);
        } catch (err) {
            setCartCount(0);
        }
    }, []);

    // Separate useEffect for theme
    useEffect(() => {
        document.body.className = theme === 'light' ? 'light-mode' : '';
    }, [theme]);

    // Separate useEffect for initial data loading
    useEffect(() => {
        let mounted = true;

        const checkLoginStatusAndFetchGenres = async () => {
            try {
                const user = await account.get();
                if (mounted) {
                    setIsLoggedIn(true);
                    setIsAdmin(user.labels?.includes('admin') || false);
                    // Cache user ID to avoid future account.get() calls
                    localStorage.setItem('currentUserId', user.$id);
                }
            } catch (error) {
                // Silent fail for 401 - user is not logged in, which is normal
                if (mounted) {
                    setIsLoggedIn(false);
                    setIsAdmin(false);
                    localStorage.removeItem('currentUserId');
                }
            }

            try {
                const genresResponse = await databases.listDocuments(
                    DATABASE_ID,
                    GENRES_COLLECTION_ID,
                    [
                        Query.limit(6), // Further reduced for faster header load
                        Query.orderAsc('name'),
                    ]
                );
                if (mounted) {
                    setGenres(genresResponse.documents);
                    setGenresLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setGenresError(err.message || "Janrlarni yuklashda noma'lum xato.");
                    setGenresLoading(false);
                }
            }
        };

        checkLoginStatusAndFetchGenres();
        updateGlobalCartCount();

        return () => {
            mounted = false;
        };
    }, [updateGlobalCartCount]);

    // Separate useEffect for event listeners
    useEffect(() => {
        const handleCartUpdate = () => updateGlobalCartCount();
        const handleLoginStatusChange = () => {
            // Simplified login status change
            updateGlobalCartCount();
        };

        window.addEventListener('cartUpdated', handleCartUpdate);
        window.addEventListener('loginStatusChanged', handleLoginStatusChange);

        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate);
            window.removeEventListener('loginStatusChanged', handleLoginStatusChange);
        };
    }, [updateGlobalCartCount]);

    // Separate useEffect for UI state
    useEffect(() => {
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
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isMobileMenuOpen, showSearchInput]);


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
            <header
                ref={aboveFoldRef}
                id='main-header'
                className={`glassmorphism-header ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}
            >
                <div className="container">
                    <Link to="/" className="logo">
                        <img src={headerLogoUrl} alt="Zamon Books Logo" className="header-logo" />
                        <span style={{ marginLeft: '10px', fontSize: '1.5em', fontWeight: 'bold' }} title='Bosh sahifa'>Zamon Books</span>
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

                    {/* Navigatsiya elementi */}
                    <nav className={`main-nav ${isMobileMenuOpen ? 'active' : ''}`}>
                        <ul className="glassmorphism-nav-list">
                            {/*<li><Link to="/" className="glassmorphism-button" aria-label="Bosh sahifa" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-home"></i></Link></li>*/}
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
                            {/*<li><Link to="/news" className="glassmorphism-button" onClick={() => setIsMobileMenuOpen(false)}>Yangiliklar</Link></li>*/}
                            {/*<li><Link to="/contact" className="glassmorphism-button" onClick={() => setIsMobileMenuOpen(false)}>Aloqa</Link></li>*/}

                            {/* Foydalanuvchi amallari - Mobil menyu ichida */}
                            <li className="mobile-user-actions">
                                <Link to="/cart" className="glassmorphism-button" aria-label="Savat" onClick={() => setIsMobileMenuOpen(false)}>
                                    <i className="fas fa-shopping-cart"></i> Savat
                                    <span className="cart-count">{cartCount}</span>
                                </Link>
                                {isLoggedIn ? (
                                    <>
                                        <Link to="/orders" className="glassmorphism-button" aria-label="Buyurtmalar" onClick={() => setIsMobileMenuOpen(false)}>
                                            <i className="fas fa-shopping-bag"></i> Buyurtmalar
                                        </Link>
                                        <Link to="/profile" className="glassmorphism-button" aria-label="Profil" onClick={() => setIsMobileMenuOpen(false)}>
                                            <i className="fas fa-user"></i> Profil
                                        </Link>
                                    </>
                                ) : (
                                    <Link to="/auth" className="glassmorphism-button" aria-label="Kirish/Ro'yxatdan o'tish" onClick={() => setIsMobileMenuOpen(false)}>
                                        <i className="fas fa-sign-in-alt"></i> Kirish / Ro'yxatdan O'tish
                                    </Link>
                                )}
                            </li>
                            {/* Admin kirish/panel tugmasi - ALOHIDA QISM */}
                            {/*<li className="admin-mobile-link">
                                {!isAdmin ? (
                                    <Link to="/admin-dashboard" className="glassmorphism-button" aria-label="Admin Paneli" onClick={() => setIsMobileMenuOpen(false)}>
                                        <i className="fas fa-user-shield"></i> Admin Paneli
                                    </Link>
                                ) : (
                                    null
                                )}
                            </li>*/}
                        </ul>
                    </nav>

                    {/* Qidiruv paneli - faqat desktopda ko'rinadi, mobilda dinamik */}
                    <div className={`search-bar glassmorphism-input ${showSearchInput ? 'active-mobile' : ''}`}>
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            id="search-input"
                            name="search"
                            placeholder="Kitob qidirish..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const searchTerm = e.target.value.trim();
                                    if (searchTerm) {
                                        navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* Foydalanuvchi amallari - DESKTOP UCHUN */}
                    <div className="user-actions desktop-only">
                        <Link to="/cart" className="glassmorphism-button" aria-label="Savat" onClick={() => setIsMobileMenuOpen(false)}>
                            <i className="fas fa-shopping-cart"></i>
                            <span className="cart-count">{cartCount}</span>
                        </Link>

                        {isLoggedIn ? (
                            <>
                                <Link to="/orders" className="glassmorphism-button" aria-label="Buyurtmalar" onClick={() => setIsMobileMenuOpen(false)}>
                                    <i className="fas fa-shopping-bag"></i>
                                </Link>
                                <Link to="/profile" className="glassmorphism-button" aria-label="Profil" onClick={() => setIsMobileMenuOpen(false)}>
                                    <i className="fas fa-user"></i>
                                </Link>
                            </>
                        ) : (
                            <Link to="/auth" className="glassmorphism-button" aria-label="Kirish/Ro'yxatdan o'tish" onClick={() => setIsMobileMenuOpen(false)}>
                                <i className="fas fa-sign-in-alt"></i>
                            </Link>
                        )}

                        {/* Admin Kirish/Panel tugmasi - desktopda alohida */}
                        {/*{isAdmin ? (
                            <Link to="/admin-dashboard" className="glassmorphism-button" aria-label="Admin Paneli" onClick={() => setIsMobileMenuOpen(false)}>
                                <i className="fas fa-user-shield"></i>
                            </Link>
                        ) : (
                            null
                        )}*/}
                    </div>

                </div>
            </header>

            {/* Mobil menyu va qidiruv ochilganda overlay */}
            {(isMobileMenuOpen || showSearchInput) && <div className="mobile-menu-overlay" onClick={() => {
                setIsMobileMenuOpen(false);
                setShowSearchInput(false);
            }}></div>}


            <main>
                {children}
            </main>

            <footer ref={belowFoldRef} className="glassmorphism-footer">
                <div className="container">
                    <div className="footer-col">
                        <h3>Zamon Books</h3>
                        <p>Zamon Books – Bilimga intiluvchilar uchun.</p>
                        <div className="social-icons">
                            <a href="https://t.me/ZAMON_BOOKS" title='Telegram-kanal' className="glassmorphism-button" target='_blank'><i className="fab fa-telegram-plane"></i></a>
                            <a href="https://www.instagram.com/zamon_books/" title='Instagram-sahifa' className="glassmorphism-button" target='_blank'><i className="fab fa-instagram"></i></a>
                            {/*<a href="#" className="glassmorphism-button"><i className="fab fa-facebook-f"></i></a>*/}
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
        <>
            {/* <PerformanceMonitor /> */}
            <ToastContainer />
            <Routes>
                <Route path="/" element={<MainLayout><LazyHomePage databases={databases} DATABASE_ID={DATABASE_ID} /></MainLayout>} />
                {/* Existing ID-based route */}
                <Route path="/book/:bookId" element={<MainLayout><LazyBookDetailPage /></MainLayout>} />
                
                {/* New SEO-friendly slug-based route */}
                <Route path="/kitob/:bookSlug" element={<MainLayout><LazyBookDetailPage /></MainLayout>} />
                <Route path="/cart" element={<MainLayout><LazyCartPage /></MainLayout>} />
                <Route path="/orders" element={
                    <ProtectedRoute>
                        <MainLayout><LazyUserOrdersPage /></MainLayout>
                    </ProtectedRoute>
                } />
                <Route path="/auth" element={<MainLayout><LazyAuthForm /></MainLayout>} />
                <Route path="/profile" element={<MainLayout><LazyProfilePage /></MainLayout>} />
                {/* YANGI: Tasdiqlashdan keyin yo'naltiriladigan sahifalar */}
                <Route path="/verification-success" element={<MainLayout><VerificationStatusPage status="success" /></MainLayout>} />
                <Route path="/verification-failure" element={<MainLayout><VerificationStatusPage status="failure" /></MainLayout>} />
                <Route path="/search" element={<MainLayout><LazySearchPage /></MainLayout>} />
                {/* YANGI: Tasdiqlashdan keyin yo'naltiriladigan sahifalar */}
                <Route path="/authors" element={<MainLayout><LazyComingSoon title="Mualliflar" subtitle="Mualliflar sahifasi ishlab chiqilmoqda" description="Sevimli mualliflaringiz haqida to'liq ma'lumot va ularning barcha asarlari bilan tanishish imkoniyati yaqin orada!" /></MainLayout>} />
                <Route path="/genres/:genreId" element={<MainLayout><LazyComingSoon title="Janr Sahifasi" subtitle="Janr bo'yicha kitoblar sahifasi ishlab chiqilmoqda" description="Har bir janr bo'yicha eng yaxshi kitoblarni topish va filtrlash imkoniyati yaqin orada!" /></MainLayout>} />
                <Route path="/news" element={<MainLayout><LazyComingSoon title="Yangiliklar" subtitle="Yangiliklar sahifasi ishlab chiqilmoqda" description="Kitob dunyosidagi eng so'nggi yangiliklar, tadbirlar va chegirmalar haqida ma'lumot yaqin orada!" /></MainLayout>} />
                <Route path="/contact" element={<MainLayout><LazyComingSoon title="Aloqa" subtitle="Aloqa sahifasi ishlab chiqilmoqda" description="Biz bilan bog'lanish, savollar berish va takliflar yuborish imkoniyati yaqin orada!" /></MainLayout>} />
                <Route path="/faq" element={<MainLayout><LazyComingSoon title="Ko'p Beriladigan Savollar" subtitle="FAQ sahifasi ishlab chiqilmoqda" description="Eng ko'p beriladigan savollar va ularning javoblari yaqin orada!" /></MainLayout>} />
                <Route path="/privacy" element={<MainLayout><LazyComingSoon title="Maxfiylik Siyosati" subtitle="Maxfiylik siyosati sahifasi ishlab chiqilmoqda" description="Shaxsiy ma'lumotlaringizning himoyalanishi va ishlatilishi haqida to'liq ma'lumot yaqin orada!" /></MainLayout>} />
                <Route path="/terms" element={<MainLayout><LazyComingSoon title="Foydalanish Shartlari" subtitle="Foydalanish shartlari sahifasi ishlab chiqilmoqda" description="Saytdan foydalanish qoidalari va shartlari haqida to'liq ma'lumot yaqin orada!" /></MainLayout>} />

                <Route path="/admin-login" element={<MainLayout><LazyAdminLogin /></MainLayout>} />

                {/* Admin Panel Routes */}
                <Route
                    path="/admin-dashboard"
                    element={
                        <AdminProtectedRoute>
                            <AdminLayout>
                                <LazyAdminDashboard />
                            </AdminLayout>
                        </AdminProtectedRoute>
                    }
                />
                <Route
                    path="/admin/books"
                    element={
                        <AdminProtectedRoute>
                            <AdminLayout>
                                <LazyAdminBookManagement />
                            </AdminLayout>
                        </AdminProtectedRoute>
                    }
                />
                <Route
                    path="/admin/authors"
                    element={
                        <AdminProtectedRoute>
                            <AdminLayout>
                                <LazyAdminAuthorManagement />
                            </AdminLayout>
                        </AdminProtectedRoute>
                    }
                />
                <Route
                    path="/admin/genres"
                    element={
                        <AdminProtectedRoute>
                            <AdminLayout>
                                <LazyAdminGenreManagement />
                            </AdminLayout>
                        </AdminProtectedRoute>
                    }
                />
                <Route
                    path="/admin/orders"
                    element={
                        <AdminProtectedRoute>
                            <AdminLayout>
                                <LazyAdminOrderManagement />
                            </AdminLayout>
                        </AdminProtectedRoute>
                    }
                />
                <Route
                    path="/admin/users"
                    element={
                        <AdminProtectedRoute>
                            <AdminLayout>
                                <LazyAdminUserManagement />
                            </AdminLayout>
                        </AdminProtectedRoute>
                    }
                />
                <Route
                    path="/admin/settings"
                    element={
                        <AdminProtectedRoute>
                            <AdminLayout>
                                <LazyAdminSettings />
                            </AdminLayout>
                        </AdminProtectedRoute>
                    }
                />

                <Route path="*" element={<MainLayout><LazyComingSoon title="404 - Sahifa Topilmadi" subtitle="Siz qidirayotgan sahifa mavjud emas" description="Kechirasiz, siz qidirayotgan sahifa topilmadi yoki o'chirilgan bo'lishi mumkin. Bosh sahifaga qaytib, boshqa sahifalarni ko'rib chiqing." /></MainLayout>} />
            </Routes>
        </>
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