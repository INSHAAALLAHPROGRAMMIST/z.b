// src/components/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import { account } from '../appwriteConfig';
import { useNavigate, Link } from 'react-router-dom';
import { createTelegramLinkProps, validateTelegramUsername } from '../utils/telegramUtils';
import { toast, toastMessages } from '../utils/toastUtils';

const ProfilePage = () => {
    const [authUser, setAuthUser] = useState(null);
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showTelegramModal, setShowTelegramModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [updating, setUpdating] = useState(false);
    
    // Form states
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
        telegram_username: ''
    });
    
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Auth user ma'lumotlarini olish
                const loggedInUser = await account.get();
                setAuthUser(loggedInUser);
                
                // Auth preferences'dan ma'lumotlarni olish
                const prefs = loggedInUser.prefs || {};
                
                // Fake dbUser object yaratamiz (eski kod bilan mos kelishi uchun)
                const fakeDbUser = {
                    fullName: loggedInUser.name || prefs.fullName || '',
                    email: loggedInUser.email || '',
                    phone: prefs.phone || '',
                    address: prefs.address || '',
                    telegram_username: prefs.telegram_username || '',
                    isActive: prefs.isActive !== false,
                    registeredAt: prefs.registeredAt || loggedInUser.$createdAt,
                    lastLoginAt: prefs.lastLoginAt || new Date().toISOString()
                };
                
                setDbUser(fakeDbUser);
                
                // Form data'ni to'ldirish
                setFormData({
                    fullName: fakeDbUser.fullName,
                    phone: fakeDbUser.phone,
                    address: fakeDbUser.address,
                    telegram_username: fakeDbUser.telegram_username
                });
                
                // Admin ekanligini tekshirish - faqat Auth labels
                const adminStatus = loggedInUser.labels?.includes('admin') || false;
                
                console.log('Auth labels:', loggedInUser.labels);
                console.log('Admin status:', adminStatus);
                
                setIsAdmin(adminStatus);
                
                // Telegram username yo'q bo'lsa, modal ko'rsatish
                if (!fakeDbUser.telegram_username) {
                    setShowTelegramModal(true);
                }
            } catch (err) {
                console.error("Foydalanuvchi ma'lumotlarini yuklashda xato:", err);
                setError("Foydalanuvchi ma'lumotlarini yuklashda xato yuz berdi. Iltimos, qayta kiring.");
                navigate('/auth');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [navigate]);

    // Form input handler
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Profile update function (Auth preferences orqali)
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.fullName.trim()) {
            toastMessages.nameRequired();
            return;
        }

        if (formData.phone && !/^\+998[0-9]{9}$/.test(formData.phone)) {
            toastMessages.phoneInvalid();
            return;
        }

        if (formData.telegram_username) {
            const validation = validateTelegramUsername(formData.telegram_username);
            if (!validation.valid) {
                toast.error(validation.message);
                return;
            }
        }

        setUpdating(true);
        try {
            // Current preferences'ni olamiz
            const currentPrefs = authUser.prefs || {};
            
            // Yangi preferences'ni yaratamiz
            const updatedPrefs = {
                ...currentPrefs,
                fullName: formData.fullName,
                phone: formData.phone,
                address: formData.address,
                telegram_username: formData.telegram_username,
                updatedAt: new Date().toISOString()
            };
            
            // Auth preferences'ni yangilaymiz
            await account.updatePrefs(updatedPrefs);
            
            // User name'ni ham yangilaymiz (agar o'zgargan bo'lsa)
            if (formData.fullName !== authUser.name) {
                await account.updateName(formData.fullName);
            }
            
            // Local state'ni yangilash
            const updatedDbUser = {
                ...dbUser,
                ...formData
            };
            setDbUser(updatedDbUser);
            
            // Auth user'ni ham yangilaymiz
            const updatedAuthUser = await account.get();
            setAuthUser(updatedAuthUser);

            setEditMode(false);
            toastMessages.profileUpdated();
        } catch (err) {
            console.error('Ma\'lumotlarni yangilashda xato:', err);
            toastMessages.updateError();
        } finally {
            setUpdating(false);
        }
    };

    // Telegram username update function (modal uchun, Auth preferences orqali)
    const handleTelegramUpdate = async (e) => {
        e.preventDefault();
        
        if (!formData.telegram_username.trim()) {
            toastMessages.telegramRequired();
            return;
        }

        // Username validation
        const validation = validateTelegramUsername(formData.telegram_username);
        if (!validation.valid) {
            toast.error(validation.message);
            return;
        }

        setUpdating(true);
        try {
            // Current preferences'ni olamiz
            const currentPrefs = authUser.prefs || {};
            
            // Telegram username'ni yangilaymiz
            const updatedPrefs = {
                ...currentPrefs,
                telegram_username: formData.telegram_username,
                updatedAt: new Date().toISOString()
            };
            
            await account.updatePrefs(updatedPrefs);

            // Local state'ni yangilash
            setDbUser(prev => ({
                ...prev,
                telegram_username: formData.telegram_username
            }));
            
            // Auth user'ni ham yangilaymiz
            const updatedAuthUser = await account.get();
            setAuthUser(updatedAuthUser);

            setShowTelegramModal(false);
            toastMessages.telegramSaved();
        } catch (err) {
            console.error('Telegram username saqlashda xato:', err);
            toastMessages.updateError();
        } finally {
            setUpdating(false);
        }
    };

    const handleLogout = async () => {
        try {
            await account.deleteSession('current'); // Joriy sessiyani o'chirish
            console.log("Muvaffaqiyatli tizimdan chiqdingiz!");
            // Sahifani qayta yuklash
            window.location.href = '/'; // navigate() o'rniga window.location.href ishlatamiz
        } catch (err) {
            console.error("Tizimdan chiqishda xato:", err);
            setError("Tizimdan chiqishda xato yuz berdi.");
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>
                Yuklanmoqda...
            </div>
        );
    }

    if (error) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '50px', color: 'red', minHeight: 'calc(100vh - 200px)' }}>
                Xato: {error}
                <button onClick={() => navigate('/auth')} className="glassmorphism-button" style={{ marginTop: '20px' }}>
                    Kirish sahifasiga o'tish
                </button>
            </div>
        );
    }

    if (!authUser || !dbUser) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '50px', minHeight: 'calc(100vh - 200px)' }}>
                <p>Siz tizimga kirmagansiz.</p>
                <button onClick={() => navigate('/auth')} className="glassmorphism-button" style={{ marginTop: '20px' }}>
                    Kirish / Ro'yxatdan o'tish
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ 
            padding: '20px',
            marginTop: '80px',
            marginBottom: '50px',
            maxWidth: '600px'
        }}>
            <div className="glassmorphism-card" style={{ 
                padding: '30px 20px',
                borderRadius: '15px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 className="section-title" style={{ 
                        fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                        margin: 0
                    }}>Profil Ma'lumotlari</h2>
                    
                    <button 
                        onClick={() => setEditMode(!editMode)}
                        className="glassmorphism-button"
                        style={{ 
                            padding: '8px 16px',
                            fontSize: '0.9rem',
                            backgroundColor: editMode ? 'rgba(255, 59, 59, 0.1)' : 'rgba(106, 138, 255, 0.1)'
                        }}
                        disabled={updating}
                    >
                        {editMode ? (
                            <>
                                <i className="fas fa-times"></i> Bekor qilish
                            </>
                        ) : (
                            <>
                                <i className="fas fa-edit"></i> Tahrirlash
                            </>
                        )}
                    </button>
                </div>
                
                {editMode ? (
                    // Edit Mode - Form
                    <form onSubmit={handleProfileUpdate} style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        maxWidth: '100%',
                        margin: '0 auto 30px auto',
                        padding: '0 10px'
                    }}>
                        <div className="form-group glassmorphism-card" style={{ 
                            padding: '20px',
                            borderRadius: '10px'
                        }}>
                            <label style={{ 
                                display: 'block',
                                fontSize: '0.9rem', 
                                opacity: '0.7',
                                marginBottom: '8px'
                            }}>
                                Ism va Familiya <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid rgba(106, 138, 255, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    backgroundColor: 'rgba(106, 138, 255, 0.05)'
                                }}
                                placeholder="Ismingiz va familiyangizni kiriting"
                            />
                        </div>

                        <div className="form-group glassmorphism-card" style={{ 
                            padding: '20px',
                            borderRadius: '10px'
                        }}>
                            <label style={{ 
                                display: 'block',
                                fontSize: '0.9rem', 
                                opacity: '0.7',
                                marginBottom: '8px'
                            }}>
                                Telefon raqami
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    backgroundColor: 'rgba(34, 197, 94, 0.05)'
                                }}
                                placeholder="+998901234567"
                            />
                            <small style={{ color: 'var(--light-text-color)', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                                <i className="fas fa-info-circle"></i> Telefon raqami admin bilan bog'lanish uchun foydali bo'ladi
                            </small>
                        </div>

                        <div className="form-group glassmorphism-card" style={{ 
                            padding: '20px',
                            borderRadius: '10px'
                        }}>
                            <label style={{ 
                                display: 'block',
                                fontSize: '0.9rem', 
                                opacity: '0.7',
                                marginBottom: '8px'
                            }}>
                                Telegram Username <span style={{ color: 'red' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute',
                                    left: '15px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#0088cc',
                                    fontWeight: 'bold'
                                }}>@</span>
                                <input
                                    type="text"
                                    name="telegram_username"
                                    value={formData.telegram_username}
                                    onChange={handleInputChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 15px 12px 35px',
                                        border: '1px solid rgba(0, 136, 204, 0.3)',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        backgroundColor: 'rgba(0, 136, 204, 0.05)'
                                    }}
                                    placeholder="username"
                                />
                            </div>
                            <div style={{ 
                                marginTop: '10px', 
                                padding: '10px', 
                                backgroundColor: 'rgba(0, 136, 204, 0.1)', 
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                lineHeight: '1.4'
                            }}>
                                <strong style={{ color: '#0088cc' }}>
                                    <i className="fab fa-telegram-plane"></i> Nima uchun Telegram kerak?
                                </strong>
                                <br />
                                • Buyurtmangiz haqida tezkor xabar olish uchun
                                <br />
                                • Admin siz bilan to'g'ridan-to'g'ri bog'lanishi uchun
                            </div>
                        </div>

                        <div className="form-group glassmorphism-card" style={{ 
                            padding: '20px',
                            borderRadius: '10px'
                        }}>
                            <label style={{ 
                                display: 'block',
                                fontSize: '0.9rem', 
                                opacity: '0.7',
                                marginBottom: '8px'
                            }}>
                                Manzil
                            </label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                rows="3"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    backgroundColor: 'rgba(168, 85, 247, 0.05)',
                                    resize: 'vertical'
                                }}
                                placeholder="Manzilingizni kiriting (kitob yetkazib berish uchun)"
                            />
                        </div>

                        <div className="form-actions" style={{ 
                            display: 'flex', 
                            gap: '15px', 
                            justifyContent: 'center',
                            marginTop: '20px'
                        }}>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setEditMode(false);
                                    // Form'ni reset qilish
                                    setFormData({
                                        fullName: dbUser.fullName || '',
                                        phone: dbUser.phone || '',
                                        address: dbUser.address || '',
                                        telegram_username: dbUser.telegram_username || ''
                                    });
                                }}
                                className="glassmorphism-button"
                                style={{ 
                                    padding: '12px 24px',
                                    backgroundColor: 'rgba(255, 59, 59, 0.1)',
                                    minWidth: '120px'
                                }}
                                disabled={updating}
                            >
                                <i className="fas fa-times"></i> Bekor qilish
                            </button>
                            <button 
                                type="submit" 
                                className="glassmorphism-button"
                                style={{ 
                                    padding: '12px 24px',
                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                    minWidth: '120px'
                                }}
                                disabled={updating}
                            >
                                {updating ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save"></i> Saqlash
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    // View Mode - Display
                    <div style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        maxWidth: '100%',
                        margin: '0 auto 30px auto',
                        padding: '0 10px'
                    }}>
                        <div className="profile-field glassmorphism-card" style={{ 
                            padding: '15px',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}>
                            <label style={{ fontSize: '0.9rem', opacity: '0.7' }}>Foydalanuvchi ID</label>
                            <p style={{ 
                                fontSize: '1rem',
                                wordBreak: 'break-all'
                            }}>{authUser.$id}</p>
                        </div>
                        
                        {/* Auth Labels ko'rsatish */}
                        {authUser.labels && authUser.labels.length > 0 && (
                            <div className="profile-field glassmorphism-card" style={{ 
                                padding: '15px',
                                borderRadius: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px'
                            }}>
                                <label style={{ fontSize: '0.9rem', opacity: '0.7' }}>Auth Labels</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {authUser.labels.map((label, index) => (
                                        <span key={index} style={{
                                            background: label.includes('admin') ? 'rgba(106, 138, 255, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                                            color: label.includes('admin') ? '#6A8AFF' : '#A855F7',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="profile-field glassmorphism-card" style={{ 
                            padding: '15px',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}>
                            <label style={{ fontSize: '0.9rem', opacity: '0.7' }}>Ism va Familiya</label>
                            <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{dbUser.fullName || 'Kiritilmagan'}</p>
                        </div>
                        
                        <div className="profile-field glassmorphism-card" style={{ 
                            padding: '15px',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}>
                            <label style={{ fontSize: '0.9rem', opacity: '0.7' }}>Email</label>
                            <p style={{ fontSize: '1rem' }}>{dbUser.email || 'Kiritilmagan'}</p>
                        </div>
                        
                        <div className="profile-field glassmorphism-card" style={{ 
                            padding: '15px',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}>
                            <label style={{ fontSize: '0.9rem', opacity: '0.7' }}>Telegram Username</label>
                            <p style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {dbUser.telegram_username ? (
                                    <>
                                        <i className="fab fa-telegram-plane" style={{ color: '#0088cc' }}></i>
                                        <a {...createTelegramLinkProps(dbUser.telegram_username)}>
                                            @{dbUser.telegram_username}
                                        </a>
                                    </>
                                ) : (
                                    <span style={{ color: 'var(--light-text-color)', fontStyle: 'italic' }}>
                                        Kiritilmagan
                                    </span>
                                )}
                            </p>
                        </div>
                        
                        <div className="profile-field glassmorphism-card" style={{ 
                            padding: '15px',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}>
                            <label style={{ fontSize: '0.9rem', opacity: '0.7' }}>Telefon raqami</label>
                            <p style={{ fontSize: '1rem' }}>{dbUser.phone || 'Kiritilmagan'}</p>
                        </div>
                        
                        <div className="profile-field glassmorphism-card" style={{ 
                            padding: '15px',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}>
                            <label style={{ fontSize: '0.9rem', opacity: '0.7' }}>Manzil</label>
                            <p style={{ fontSize: '1rem' }}>{dbUser.address || 'Kiritilmagan'}</p>
                        </div>
                        

                        
                        <div className="profile-field glassmorphism-card" style={{ 
                            padding: '15px',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}>
                            <label style={{ fontSize: '0.9rem', opacity: '0.7' }}>Ro'yxatdan o'tgan sana</label>
                            <p style={{ fontSize: '1rem' }}>{new Date(authUser.$createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}
                
                <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    alignItems: 'center',
                    marginTop: '20px'
                }}>
                    {/* Buyurtmalar tugmasi */}
                    <Link to="/orders" className="glassmorphism-button" style={{ 
                        padding: '12px 20px',
                        width: '100%',
                        maxWidth: '300px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '1.1rem',
                        backgroundColor: 'rgba(104, 214, 57, 0.1)'
                    }}>
                        <i className="fas fa-shopping-bag"></i> Mening Buyurtmalarim
                    </Link>

                    {/* Admin panel tugmasi - faqat adminlar uchun */}
                    {isAdmin && (
                        <Link to="/admin-dashboard" className="glassmorphism-button" style={{ 
                            padding: '12px 20px',
                            width: '100%',
                            maxWidth: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            fontSize: '1.1rem',
                            backgroundColor: 'rgba(106, 138, 255, 0.1)'
                        }}>
                            <i className="fas fa-user-shield"></i> Admin Paneli
                        </Link>
                    )}


                    
                    <button onClick={handleLogout} className="glassmorphism-button" style={{ 
                        padding: '12px 20px',
                        width: '100%',
                        maxWidth: '300px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontSize: '1.1rem',
                        backgroundColor: 'rgba(255, 59, 59, 0.1)'
                    }}>
                        <i className="fas fa-sign-out-alt"></i> Tizimdan Chiqish
                    </button>
                </div>
            </div>

            {/* Telegram Username Modal */}
            {showTelegramModal && (
                <div className="admin-modal" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="admin-modal-content glassmorphism-card" style={{
                        maxWidth: '500px',
                        width: '90%',
                        padding: '30px',
                        borderRadius: '15px'
                    }}>
                        <div className="admin-modal-header" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>
                                <i className="fab fa-telegram-plane" style={{ color: '#0088cc', marginRight: '10px' }}></i>
                                Telegram Username
                            </h3>
                        </div>
                        
                        <div className="admin-modal-body">
                            <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'rgba(0, 136, 204, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 136, 204, 0.2)' }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#0088cc', fontSize: '1.1rem' }}>
                                    <i className="fab fa-telegram-plane"></i> Telegram Username nima uchun kerak?
                                </h4>
                                <div style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-color)' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <strong style={{ color: '#0088cc' }}>🚀 Tezkor aloqa:</strong>
                                        <br />
                                        Buyurtmangiz haqida darhol xabar olasiz va admin bilan to'g'ridan-to'g'ri suhbatlashishingiz mumkin.
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <strong style={{ color: '#0088cc' }}>📦 Buyurtma holati:</strong>
                                        <br />
                                        Buyurtmangiz tayyorlanganda, jo'natilganda va yetib borganda xabar olasiz.
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <strong style={{ color: '#0088cc' }}>💬 Qo'llab-quvvatlash:</strong>
                                        <br />
                                        Savollaringiz bo'lsa, admin bilan Telegram orqali tezda bog'lanishingiz mumkin: {' '}
                                        <a {...createTelegramLinkProps(import.meta.env.VITE_ADMIN_TELEGRAM || '@admin')}>
                                            {import.meta.env.VITE_ADMIN_TELEGRAM || '@admin'}
                                        </a>
                                    </div>
                                    <div style={{ padding: '10px', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: '6px', marginTop: '15px' }}>
                                        <strong style={{ color: '#b8860b' }}>
                                            <i className="fas fa-exclamation-triangle"></i> Muhim:
                                        </strong> Telegram username kiritish majburiy, chunki bu O'zbekistonda eng qulay aloqa usuli.
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleTelegramUpdate}>
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                        Telegram Username (@ belgisisiz)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{
                                            position: 'absolute',
                                            left: '15px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: '#0088cc',
                                            fontWeight: 'bold'
                                        }}>@</span>
                                        <input
                                            type="text"
                                            name="telegram_username"
                                            value={formData.telegram_username}
                                            onChange={handleInputChange}
                                            placeholder="username"
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '12px 15px 12px 35px',
                                                border: '1px solid rgba(0, 136, 204, 0.3)',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                backgroundColor: 'rgba(0, 136, 204, 0.05)'
                                            }}
                                        />
                                    </div>
                                    <small style={{ color: 'var(--light-text-color)', fontSize: '0.85rem' }}>
                                        Masalan: john_doe (5-32 ta belgi, faqat harflar, raqamlar va _)
                                    </small>
                                </div>
                                
                                <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowTelegramModal(false)}
                                        className="glassmorphism-button"
                                        style={{ 
                                            padding: '10px 20px',
                                            backgroundColor: 'rgba(255, 59, 59, 0.1)'
                                        }}
                                        disabled={updating}
                                    >
                                        Bekor qilish
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="glassmorphism-button"
                                        style={{ 
                                            padding: '10px 20px',
                                            backgroundColor: 'rgba(0, 136, 204, 0.2)'
                                        }}
                                        disabled={updating}
                                    >
                                        {updating ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i> Saqlanmoqda...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-save"></i> Saqlash
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;