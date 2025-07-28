// src/components/AuthForm.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { migrateGuestCartToUser } from '../utils/cartMigration';
import { loginAndSync, registerAndSync, logoutUser } from '../utils/userSync';
import { isValidEmail, parseRegisterError, parseLoginError } from '../utils/emailValidation';
import { validateTelegramUsername, createTelegramLinkProps } from '../utils/telegramUtils';
import { account } from '../appwriteConfig';

const AuthForm = ({ onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Ro'yxatdan o'tish uchun ism
    const [phone, setPhone] = useState(''); // Telefon raqami
    const [telegramUsername, setTelegramUsername] = useState(''); // Telegram username
    const [address, setAddress] = useState(''); // Manzil
    const [confirmPassword, setConfirmPassword] = useState(''); // Parol tasdiqlash
    const [showPassword, setShowPassword] = useState(false); // Parol ko'rsatish
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Parol tasdiqlash ko'rsatish
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false); // Parol unutish
    const [currentUser, setCurrentUser] = useState(null); // Joriy user

    const navigate = useNavigate(); // useNavigate hook'ini ishga tushirish

    // Component yuklanganda joriy user'ni tekshirish
    React.useEffect(() => {
        const checkCurrentUser = async () => {
            try {
                const user = await account.get();
                setCurrentUser(user);
            } catch (error) {
                setCurrentUser(null);
            }
        };
        checkCurrentUser();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Email format tekshirish
            if (!isValidEmail(email)) {
                setError('Email format noto\'g\'ri. To\'g\'ri format: example@domain.com');
                return;
            }

            let userId;

            if (isLogin) {
                let loginResult;
                try {
                    // Tizimga kirish va sync
                    loginResult = await loginAndSync(email, password);
                    userId = loginResult.authUser.$id;

                    console.log('Login muvaffaqiyatli:', loginResult.dbUser);
                } catch (loginError) {
                    setError(parseLoginError(loginError));
                    return;
                }
            } else {
                // Validation for register
                if (!name.trim()) {
                    setError('Ism kiritish majburiy!');
                    return;
                }

                if (password.length < 8) {
                    setError('Parol kamida 8 ta belgidan iborat bo\'lishi kerak!');
                    return;
                }

                if (password !== confirmPassword) {
                    setError('Parollar mos kelmaydi!');
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

                const validation = validateTelegramUsername(telegramUsername);
                if (!validation.valid) {
                    setError(validation.message);
                    return;
                }

                if (!address.trim()) {
                    setError('Manzil kiritish majburiy!');
                    return;
                }

                // Email unique tekshirish (Appwrite avtomatik tekshiradi, lekin aniq xabar uchun)
                let registerResult;
                try {
                    // Ro'yxatdan o'tish va sync
                    registerResult = await registerAndSync(email, password, name, {
                        phone: phone,
                        telegram_username: telegramUsername,
                        address: address
                    });
                    userId = registerResult.authUser.$id;
                    console.log('Register muvaffaqiyatli:', registerResult.dbUser);
                } catch (registerError) {
                    setError(parseRegisterError(registerError));
                    return;
                }
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
            // Umumiy xato - aniq xabar berish
            if (isLogin) {
                setError(parseLoginError(err));
            } else {
                setError(parseRegisterError(err));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            setCurrentUser(null);
            window.location.reload(); // Sahifani yangilash
        } catch (error) {
            console.error('Logout xatosi:', error);
        }
    };

    // Agar user allaqachon login qilingan bo'lsa
    if (currentUser) {
        return (
            <div className="container" style={{
                padding: '20px',
                marginTop: '80px',
                marginBottom: '50px',
                maxWidth: '500px'
            }}>
                <div className="auth-container glassmorphism-card" style={{
                    padding: '30px 20px',
                    borderRadius: '15px',
                    textAlign: 'center'
                }}>
                    <h2 style={{
                        fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                        marginBottom: '20px'
                    }}>Siz allaqachon tizimga kirgansiz</h2>

                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        padding: '20px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        border: '1px solid rgba(34, 197, 94, 0.2)'
                    }}>
                        <i className="fas fa-user-circle" style={{
                            fontSize: '3rem',
                            color: '#22c55e',
                            marginBottom: '10px'
                        }}></i>
                        <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                            {currentUser.name || currentUser.email}
                        </p>
                        <p style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                            {currentUser.email}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                        <button
                            onClick={() => navigate('/')}
                            className="glassmorphism-button"
                            style={{
                                padding: '12px',
                                backgroundColor: 'rgba(106, 138, 255, 0.2)',
                                fontSize: '1rem'
                            }}
                        >
                            <i className="fas fa-home"></i> Bosh sahifaga o'tish
                        </button>

                        <button
                            onClick={handleLogout}
                            className="glassmorphism-button"
                            style={{
                                padding: '12px',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                fontSize: '1rem'
                            }}
                        >
                            <i className="fas fa-sign-out-alt"></i> Boshqa hisob bilan kirish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
                        <>
                            <div className="glassmorphism-input">
                                <i className="fas fa-user"></i>
                                <input
                                    type="text"
                                    placeholder="Ismingiz"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                    disabled={loading}
                                />
                            </div>

                            <div className="glassmorphism-input">
                                <i className="fas fa-phone"></i>
                                <input
                                    type="tel"
                                    placeholder="Telefon raqami (+998901234567)"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <div className="glassmorphism-input">
                                <i className="fab fa-telegram"></i>
                                <input
                                    type="text"
                                    placeholder="Telegram username (masalan: john_doe)"
                                    value={telegramUsername}
                                    onChange={(e) => setTelegramUsername(e.target.value)}
                                    required={!isLogin}
                                    disabled={loading}
                                />
                            </div>

                            <div className="glassmorphism-input" style={{ alignItems: 'flex-start' }}>
                                <i className="fas fa-map-marker-alt" style={{ marginTop: '8px' }}></i>
                                <textarea
                                    placeholder="Manzilingiz (kitob yetkazib berish uchun)"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    required={!isLogin}
                                    disabled={loading}
                                    rows="3"
                                    style={{
                                        resize: 'vertical',
                                        minHeight: '60px'
                                    }}
                                />
                            </div>
                        </>
                    )}

                    <div className="glassmorphism-input">
                        <i className="fas fa-envelope"></i>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="glassmorphism-input password-input">
                        <i className="fas fa-lock"></i>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder={isLogin ? "Parol" : "Parol (kamida 8 ta belgi)"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            minLength={isLogin ? undefined : 8}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                        >
                            <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                        </button>
                    </div>

                    {!isLogin && (
                        <div className="glassmorphism-input password-input">
                            <i className="fas fa-lock"></i>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Parolni tasdiqlang"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required={!isLogin}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={loading}
                            >
                                <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                            </button>
                        </div>
                    )}

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

                    {/* Parol unutish modal */}
                    {showForgotPassword && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}>
                            <div className="glassmorphism-card" style={{
                                maxWidth: '400px',
                                width: '90%',
                                padding: '30px',
                                borderRadius: '15px',
                                textAlign: 'center'
                            }}>
                                <h3 style={{ marginBottom: '20px', fontSize: '1.3rem' }}>
                                    <i className="fas fa-key" style={{ marginRight: '10px', color: '#6A8AFF' }}></i>
                                    Parolni Unutdingizmi?
                                </h3>

                                <p style={{
                                    marginBottom: '20px',
                                    lineHeight: '1.5',
                                    opacity: '0.9'
                                }}>
                                    {import.meta.env.VITE_SUPPORT_MESSAGE || 'Agar parolni eslay olmasangiz, admin bilan bog\'laning:'}
                                </p>

                                <div style={{
                                    background: 'rgba(0, 136, 204, 0.1)',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    marginBottom: '20px',
                                    border: '1px solid rgba(0, 136, 204, 0.2)'
                                }}>
                                    <i className="fab fa-telegram" style={{
                                        fontSize: '1.5rem',
                                        color: '#0088cc',
                                        marginRight: '10px'
                                    }}></i>
                                    <a {...createTelegramLinkProps(import.meta.env.VITE_ADMIN_TELEGRAM || '@admin', { fontSize: '1.1rem' })}>
                                        {import.meta.env.VITE_ADMIN_TELEGRAM || '@admin'}
                                    </a>
                                </div>

                                <p style={{
                                    fontSize: '0.9rem',
                                    opacity: '0.7',
                                    marginBottom: '20px'
                                }}>
                                    Admin sizga yangi parol beradi yoki hisobingizni tiklashda yordam beradi.
                                </p>

                                <button
                                    onClick={() => setShowForgotPassword(false)}
                                    className="glassmorphism-button"
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: 'rgba(106, 138, 255, 0.2)'
                                    }}
                                >
                                    <i className="fas fa-times"></i> Yopish
                                </button>
                            </div>
                        </div>
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

                    {/* Parol unutish tugmasi - faqat login holatida */}
                    {isLogin && (
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="glassmorphism-button"
                            style={{
                                padding: '8px 12px',
                                width: '100%',
                                fontSize: '0.9rem',
                                marginTop: '10px',
                                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                border: '1px solid rgba(255, 193, 7, 0.3)'
                            }}
                        >
                            <i className="fas fa-question-circle"></i> Parolni Unutdingizmi?
                        </button>
                    )}
                </form>

                <p className="toggle-auth" style={{
                    textAlign: 'center',
                    marginTop: '25px',
                    fontSize: '0.95rem'
                }}>
                    {isLogin ? "Hisobingiz yo'qmi?" : "Hisobingiz bormi?"}{' '}
                    <span
                        onClick={() => {
                            setIsLogin(!isLogin);
                            // Form'ni tozalash
                            setError('');
                            setName('');
                            setPhone('');
                            setTelegramUsername('');
                            setAddress('');
                            setConfirmPassword('');
                            setPassword('');
                            setEmail('');
                            setShowPassword(false);
                            setShowConfirmPassword(false);
                        }}
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