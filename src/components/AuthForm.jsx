// src/components/AuthForm.jsx

import React, { useState } from 'react';
import { account, databases, ID } from '../appwriteConfig';
import { useNavigate } from 'react-router-dom';
import { migrateGuestCartToUser } from '../utils/cartMigration';
import { loginAndSync, registerAndSync } from '../utils/userSync';

// Environment variables
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;

const AuthForm = ({ onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Ro'yxatdan o'tish uchun ism
    const [phone, setPhone] = useState(''); // Telefon raqami
    const [telegramUsername, setTelegramUsername] = useState(''); // Telegram username
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate(); // useNavigate hook'ini ishga tushirish

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let userId;
            
            if (isLogin) {
                // Tizimga kirish va sync
                const loginResult = await loginAndSync(email, password);
                userId = loginResult.authUser.$id;
                
                console.log('Login muvaffaqiyatli:', loginResult.dbUser);
            } else {
                // Validation for register
                if (!name.trim()) {
                    setError('Ism kiritish majburiy!');
                    return;
                }
                
                if (phone && !/^\+998[0-9]{9}$/.test(phone)) {
                    setError('Telefon raqami noto\'g\'ri formatda! Masalan: +998901234567');
                    return;
                }
                
                if (!telegramUsername.trim()) {
                    setError('Telegram username kiritish majburiy!');
                    return;
                }
                
                const telegramRegex = /^[a-zA-Z0-9_]{5,32}$/;
                if (!telegramRegex.test(telegramUsername)) {
                    setError('Telegram username noto\'g\'ri formatda! Faqat harflar, raqamlar va _ ishlatish mumkin (5-32 ta belgi).');
                    return;
                }
                
                // Ro'yxatdan o'tish va sync
                const registerResult = await registerAndSync(email, password, name, {
                    phone: phone,
                    telegram_username: telegramUsername
                });
                userId = registerResult.authUser.$id;
                
                console.log('Register muvaffaqiyatli:', registerResult.dbUser);
            }
            
            // Mehmon savatini foydalanuvchi savatiga ko'chirish
            await migrateGuestCartToUser(userId);
            // Agar muvaffaqiyatli bo'lsa, onSuccess callbackini chaqiramiz
            if (onSuccess) {
                onSuccess();
            }
            
            // Bosh sahifaga yo'naltirish
            setTimeout(() => {
                navigate('/');
                window.location.reload(); // Header state yangilanishi uchun
            }, 500); // 500ms kutib, bosh sahifaga o'tish
        } catch (err) {
            console.error('Autentifikatsiya xatosi:', err);
            setError(err.message || 'Autentifikatsiya vaqtida xato yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ 
            padding: '20px',
            marginTop: '80px',
            marginBottom: '50px',
            maxWidth: '500px'
        }}>
            <div className="auth-container glassmorphism-card" style={{ 
                padding: '30px 20px',
                borderRadius: '15px'
            }}>
                <h2 style={{ 
                    fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                    textAlign: 'center',
                    marginBottom: '30px'
                }}>{isLogin ? 'Tizimga Kirish' : "Ro'yxatdan O'tish"}</h2>
                
                <form onSubmit={handleSubmit} className="auth-form" style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    width: '100%',
                    maxWidth: '400px',
                    margin: '0 auto'
                }}>
                    {!isLogin && (
                        <div className="form-group glassmorphism-input" style={{ 
                            padding: '12px 15px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <i className="fas fa-user" style={{ fontSize: '1.2rem', opacity: '0.7' }}></i>
                            <input
                                type="text"
                                placeholder="Ismingiz"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                disabled={loading}
                                style={{ 
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-color)',
                                    width: '100%',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    )}
                    
                    <div className="form-group glassmorphism-input" style={{ 
                        padding: '12px 15px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <i className="fas fa-envelope" style={{ fontSize: '1.2rem', opacity: '0.7' }}></i>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            style={{ 
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-color)',
                                width: '100%',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    
                    <div className="form-group glassmorphism-input" style={{ 
                        padding: '12px 15px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <i className="fas fa-lock" style={{ fontSize: '1.2rem', opacity: '0.7' }}></i>
                        <input
                            type="password"
                            placeholder="Parol"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            style={{ 
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-color)',
                                width: '100%',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    
                    {error && (
                        <p className="error-message" style={{ 
                            color: '#ff5252',
                            textAlign: 'center',
                            padding: '10px',
                            backgroundColor: 'rgba(255, 82, 82, 0.1)',
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                        }}>{error}</p>
                    )}
                    
                    <button 
                        type="submit" 
                        className="glassmorphism-button" 
                        disabled={loading}
                        style={{ 
                            padding: '12px',
                            width: '100%',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            marginTop: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            backgroundColor: loading ? 'rgba(106, 138, 255, 0.05)' : 'rgba(106, 138, 255, 0.2)'
                        }}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Yuklanmoqda...
                            </>
                        ) : (
                            isLogin ? 'Kirish' : "Ro'yxatdan O'tish"
                        )}
                    </button>
                </form>
                
                <p className="toggle-auth" style={{ 
                    textAlign: 'center',
                    marginTop: '25px',
                    fontSize: '0.95rem'
                }}>
                    {isLogin ? "Hisobingiz yo'qmi?" : "Hisobingiz bormi?"}{' '}
                    <span 
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ 
                            color: 'var(--primary-color)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        {isLogin ? "Ro'yxatdan o'tish" : 'Kirish'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default AuthForm;