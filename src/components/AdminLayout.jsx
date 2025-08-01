import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { account, databases, Query } from '../appwriteConfig';
import { prepareSearchText } from '../utils/transliteration';
import { highlightText } from '../utils/highlightText.jsx';
import { toastMessages } from '../utils/toastUtils';
import '../index.css';
import '../styles/admin.css';
import '../styles/header-fix.css';

function AdminLayout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const navigate = useNavigate();
    const location = useLocation();

    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            return newTheme;
        });
    };

    useEffect(() => {
        // Theme'ni body'ga qo'llash
        document.body.className = theme === 'light' ? 'light-mode' : '';
        
        const checkUser = async () => {
            try {
                const currentUser = await account.get();
                setUser(currentUser);
                // Admin rolini tekshirish
                if (!currentUser) {
                    navigate('/admin-login');
                }
            } catch (err) {
                console.error("Foydalanuvchi sessiyasini tekshirishda xato:", err);
                navigate('/admin-login');
            } finally {
                setLoading(false);
            }
        };
        checkUser();
    }, [navigate, theme]);

    // Mobile menu effect
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
            // Admin chiqgandan keyin bosh sahifaga yo'naltirish
            navigate('/');
            // Sahifani yangilash (header state yangilanishi uchun)
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (err) {
            console.error("Chiqishda xato:", err);
            toastMessages.logoutError();
        }
    };

    const toggleSidebar = () => {
        // Sidebar'ni ochish/yopish
        const newCollapsedState = !sidebarCollapsed;
        setSidebarCollapsed(newCollapsedState);
        
        // Mobil rejimda overlay qo'shish/olib tashlash
        if (window.innerWidth <= 768) {
            if (newCollapsedState) {
                // Sidebar ochilganda overlay qo'shish
                const overlay = document.createElement('div');
                overlay.className = 'admin-sidebar-overlay active';
                overlay.id = 'admin-sidebar-overlay';
                overlay.onclick = () => {
                    setSidebarCollapsed(false);
                    document.body.removeChild(overlay);
                };
                document.body.appendChild(overlay);
                
                // Scroll'ni bloklash
                document.body.style.overflow = 'hidden';
            } else {
                // Sidebar yopilganda overlay'ni olib tashlash
                const overlay = document.getElementById('admin-sidebar-overlay');
                if (overlay) {
                    document.body.removeChild(overlay);
                }
                
                // Scroll'ni qayta yoqish
                document.body.style.overflow = 'auto';
            }
        }
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    // Global qidiruv funksiyasi
    const handleGlobalSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setSearchLoading(true);
        setShowSearchResults(true);
        
        try {
            // Qidiruv so'rovini lotin va kiril alifbolarida tayyorlash
            const [searchTermLower, searchTermAlternate, searchTermXToH, searchTermHToX] = prepareSearchText(searchQuery);
            
            // Barcha kolleksiyalardan qidirish
            const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
            const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;
            const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;
            const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;
            
            // Parallel qidiruvlar
            const [booksResponse, authorsResponse, genresResponse, usersResponse] = await Promise.all([
                // Kitoblar qidirish
                databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [Query.limit(5)]),
                // Mualliflar qidirish
                databases.listDocuments(DATABASE_ID, AUTHORS_COLLECTION_ID, [Query.limit(5)]),
                // Janrlar qidirish
                databases.listDocuments(DATABASE_ID, GENRES_COLLECTION_ID, [Query.limit(5)]),
                // Foydalanuvchilar qidirish
                databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.limit(5)])
            ]);
            
            // Client-side filtering
            const filteredBooks = booksResponse.documents.filter(book => 
                (book.title && (
                    book.title.toLowerCase().includes(searchTermLower) || 
                    book.title.toLowerCase().includes(searchTermAlternate) ||
                    book.title.toLowerCase().includes(searchTermXToH) ||
                    book.title.toLowerCase().includes(searchTermHToX)
                )) || 
                (book.description && (
                    book.description.toLowerCase().includes(searchTermLower) ||
                    book.description.toLowerCase().includes(searchTermAlternate) ||
                    book.description.toLowerCase().includes(searchTermXToH) ||
                    book.description.toLowerCase().includes(searchTermHToX)
                ))
            ).map(book => ({
                id: book.$id,
                title: book.title,
                type: 'Kitob',
                icon: 'fa-book',
                link: book.slug ? `/kitob/${book.slug}` : `/book/${book.$id}`
            }));
            
            const filteredAuthors = authorsResponse.documents.filter(author => 
                author.name && (
                    author.name.toLowerCase().includes(searchTermLower) || 
                    author.name.toLowerCase().includes(searchTermAlternate) ||
                    author.name.toLowerCase().includes(searchTermXToH) ||
                    author.name.toLowerCase().includes(searchTermHToX)
                )
            ).map(author => ({
                id: author.$id,
                title: author.name,
                type: 'Muallif',
                icon: 'fa-user-edit',
                link: `/admin/authors?id=${author.$id}`
            }));
            
            const filteredGenres = genresResponse.documents.filter(genre => 
                genre.name && (
                    genre.name.toLowerCase().includes(searchTermLower) || 
                    genre.name.toLowerCase().includes(searchTermAlternate) ||
                    genre.name.toLowerCase().includes(searchTermXToH) ||
                    genre.name.toLowerCase().includes(searchTermHToX)
                )
            ).map(genre => ({
                id: genre.$id,
                title: genre.name,
                type: 'Janr',
                icon: 'fa-tags',
                link: `/admin/genres?id=${genre.$id}`
            }));
            
            const filteredUsers = usersResponse.documents.filter(user => 
                (user.fullName && (
                    user.fullName.toLowerCase().includes(searchTermLower) || 
                    user.fullName.toLowerCase().includes(searchTermAlternate) ||
                    user.fullName.toLowerCase().includes(searchTermXToH) ||
                    user.fullName.toLowerCase().includes(searchTermHToX)
                )) || 
                (user.email && (
                    user.email.toLowerCase().includes(searchTermLower) ||
                    user.email.toLowerCase().includes(searchTermAlternate)
                ))
            ).map(user => ({
                id: user.$id,
                title: user.fullName || user.email,
                type: 'Foydalanuvchi',
                icon: 'fa-user',
                link: `/admin/users?id=${user.$id}`
            }));
            
            // Barcha natijalarni birlashtirish
            const allResults = [...filteredBooks, ...filteredAuthors, ...filteredGenres, ...filteredUsers];
            
            setSearchResults(allResults);
            setSearchLoading(false);
            
        } catch (error) {
            console.error("Qidiruv xatosi:", error);
            setSearchResults([]);
            setSearchLoading(false);
        }
    };

    // Active menu item ni aniqlash
    const isActive = (path) => {
        return location.pathname.startsWith(path);
    };

    if (loading) {
        return (
            <div className="admin-loading-screen">
                <div className="admin-loading-spinner"></div>
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            {/* Mobile Overlay */}
            {mobileMenuOpen && <div className="mobile-overlay active" onClick={toggleMobileMenu}></div>}
            
            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="admin-sidebar-header">
                    <div className="admin-logo">
                        <img src="https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg" alt="Zamon Books Logo" />
                        {!sidebarCollapsed && <span>Zamon Books</span>}
                    </div>
                    <button className="sidebar-toggle" onClick={toggleSidebar}>
                        <i className={`fas ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
                    </button>
                </div>
                
                <nav className="admin-nav">
                    <ul>
                        <li className={isActive('/admin-dashboard') ? 'active' : ''}>
                            <Link to="/admin-dashboard">
                                <i className="fas fa-tachometer-alt"></i>
                                {!sidebarCollapsed && <span>Dashboard</span>}
                            </Link>
                        </li>
                        <li className={isActive('/admin/books') ? 'active' : ''}>
                            <Link to="/admin/books">
                                <i className="fas fa-book"></i>
                                {!sidebarCollapsed && <span>Kitoblar</span>}
                            </Link>
                        </li>
                        <li className={isActive('/admin/authors') ? 'active' : ''}>
                            <Link to="/admin/authors">
                                <i className="fas fa-user-edit"></i>
                                {!sidebarCollapsed && <span>Mualliflar</span>}
                            </Link>
                        </li>
                        <li className={isActive('/admin/genres') ? 'active' : ''}>
                            <Link to="/admin/genres">
                                <i className="fas fa-tags"></i>
                                {!sidebarCollapsed && <span>Janrlar</span>}
                            </Link>
                        </li>
                        <li className={isActive('/admin/orders') ? 'active' : ''}>
                            <Link to="/admin/orders">
                                <i className="fas fa-shopping-cart"></i>
                                {!sidebarCollapsed && <span>Buyurtmalar</span>}
                            </Link>
                        </li>
                        <li className={isActive('/admin/users') ? 'active' : ''}>
                            <Link to="/admin/users">
                                <i className="fas fa-users"></i>
                                {!sidebarCollapsed && <span>Foydalanuvchilar</span>}
                            </Link>
                        </li>
                        <li className={isActive('/admin/settings') ? 'active' : ''}>
                            <Link to="/admin/settings">
                                <i className="fas fa-cog"></i>
                                {!sidebarCollapsed && <span>Sozlamalar</span>}
                            </Link>
                        </li>
                    </ul>
                </nav>
                
                <div className="admin-sidebar-footer">
                    {user && (
                        <div className={`admin-user-info ${sidebarCollapsed ? 'collapsed' : ''}`}>
                            <div className="admin-avatar" title={sidebarCollapsed ? user.name || 'Admin' : ''}>
                                <i className="fas fa-user-circle"></i>
                            </div>
                            {!sidebarCollapsed && (
                                <div className="admin-user-details">
                                    <p className="admin-user-name">{user.name || 'Admin'}</p>
                                    <p className="admin-user-email">{user.email}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <button 
                        onClick={handleLogout} 
                        className={`admin-logout-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
                        title={sidebarCollapsed ? 'Chiqish' : ''}
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        {!sidebarCollapsed && <span>Chiqish</span>}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="admin-main">
                <header className="admin-header">
                    <div className="admin-header-left">
                        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                            <i className="fas fa-bars"></i>
                        </button>
                        <h1 className="admin-page-title">
                            {location.pathname === '/admin-dashboard' && 'Dashboard'}
                            {location.pathname === '/admin/books' && 'Kitoblar'}
                            {location.pathname === '/admin/authors' && 'Mualliflar'}
                            {location.pathname === '/admin/genres' && 'Janrlar'}
                            {location.pathname === '/admin/orders' && 'Buyurtmalar'}
                            {location.pathname === '/admin/users' && 'Foydalanuvchilar'}
                            {location.pathname === '/admin/settings' && 'Sozlamalar'}
                        </h1>
                    </div>
                    <div className="admin-header-right">
                        <div className="admin-search">
                            <i className="fas fa-search"></i>
                            <input 
                                type="text" 
                                placeholder="Qidirish..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        handleGlobalSearch();
                                    }
                                }}
                            />
                            {showSearchResults && searchResults.length > 0 && (
                                <div className="global-search-results">
                                    <div className="search-results-header">
                                        <h3>Qidiruv natijalari</h3>
                                        <button onClick={() => setShowSearchResults(false)}>
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                    <div className="search-results-content">
                                        {searchResults.map((result) => (
                                            <div key={result.id} className="search-result-item" onClick={() => {
                                                // Kitoblar uchun yangi oynada ochish
                                                if (result.type === 'Kitob') {
                                                    window.open(result.link, '_blank');
                                                } else {
                                                    navigate(result.link);
                                                }
                                                setShowSearchResults(false);
                                            }}>
                                                <div className="search-result-icon">
                                                    <i className={`fas ${result.icon}`}></i>
                                                </div>
                                                <div className="search-result-info">
                                                    <h4>{highlightText(result.title, searchQuery)}</h4>
                                                    <p>{result.type}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="admin-theme-toggle" onClick={toggleTheme} title="Temani almashtirish">
                            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
                        </div>
                        <div className="admin-notifications">
                            <i className="fas fa-bell"></i>
                            <span className="notification-badge">3</span>
                        </div>

                    </div>
                </header>
                
                <main className="admin-content" style={{ paddingTop: '0' }}>
                    {/* Children komponentlarni render qilish */}
                    {children || <Outlet />}
                </main>
                
                <footer className="admin-footer">
                    <div className="admin-footer-content">
                        <div className="admin-footer-left">
                            <p>&copy; {new Date().getFullYear()} Zamon Books Admin Panel</p>
                            <span className="admin-footer-version">v2.0.1</span>
                        </div>
                        <div className="admin-footer-right">
                            <span className="admin-footer-status">
                                <i className="fas fa-circle" style={{ color: '#10b981', fontSize: '8px' }}></i>
                                Tizim faol
                            </span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default AdminLayout;