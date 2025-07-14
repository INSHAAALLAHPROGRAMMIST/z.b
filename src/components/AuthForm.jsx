// src/components/AuthForm.jsx

import React, { useState } from 'react';
import { account } from '../appwriteConfig';
import { useNavigate } from 'react-router-dom'; // useNavigate import qilinganiga ishonch hosil qiling

const AuthForm = ({ onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Ro'yxatdan o'tish uchun ism
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate(); // useNavigate hook'ini ishga tushirish

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Tizimga kirish
                await account.createEmailPasswordSession(email, password);
                console.log('Muvaffaqiyatli kirdingiz!');
            } else {
                // Ro'yxatdan o'tish
                await account.create('unique()', email, password, name);
                console.log('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!');
                // Ro'yxatdan o'tgandan so'ng avtomatik kirish
                await account.createEmailPasswordSession(email, password);
            }
            // Agar muvaffaqiyatli bo'lsa, onSuccess callbackini chaqiramiz
            // va foydalanuvchini asosiy sahifaga yo'naltiramiz
            if (onSuccess) {
                onSuccess();
            }
            navigate('/'); // <<< O'ZGARTIRILDI: /dashboard o'rniga asosiy sahifaga yo'naltirish
        } catch (err) {
            console.error('Autentifikatsiya xatosi:', err);
            setError(err.message || 'Autentifikatsiya vaqtida xato yuz berdi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container glassmorphism-card">
            <h2>{isLogin ? 'Tizimga Kirish' : "Ro'yxatdan O'tish"}</h2>
            <form onSubmit={handleSubmit} className="auth-form">
                {!isLogin && (
                    <div className="form-group glassmorphism-input">
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
                )}
                <div className="form-group glassmorphism-input">
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
                <div className="form-group glassmorphism-input">
                    <i className="fas fa-lock"></i>
                    <input
                        type="password"
                        placeholder="Parol"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" className="glassmorphism-button" disabled={loading}>
                    {loading ? (
                        <>
                            <i className="fas fa-spinner fa-spin"></i> Yuklanmoqda...
                        </>
                    ) : (
                        isLogin ? 'Kirish' : "Ro'yxatdan O'tish"
                    )}
                </button>
            </form>
            <p className="toggle-auth">
                {isLogin ? "Hisobingiz yo'qmi?" : "Hisobingiz bormi?"}{' '}
                <span onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "Ro'yxatdan o'tish" : 'Kirish'}
                </span>
            </p>
        </div>
    );
};

export default AuthForm;