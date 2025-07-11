// src/components/AdminLogin.jsx
import React, { useState } from 'react';
import { account } from '../appwriteConfig'; // account servisni import qilish
import { useNavigate } from 'react-router-dom';
import '../index.css';

function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await account.createEmailPasswordSession(email, password);
            console.log("Admin kirishi muvaffaqiyatli!");
            navigate('/admin-dashboard'); // Muvaffaqiyatli kirishdan so'ng admin paneliga yo'naltirish
        } catch (err) {
            console.error("Admin kirishda xato:", err);
            setError("Login yoki parol noto'g'ri. Iltimos, qayta urinib ko'ring.");
        }
    };

    return (
        <div className="container" style={{ padding: '50px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 150px)' }}>
            <div className="glassmorphism-card" style={{ padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <h2 style={{ color: 'var(--text-color-light)', marginBottom: '25px', fontFamily: 'Montserrat' }}>Admin Kirish</h2>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        type="email"
                        placeholder="Email"
                        className="glassmorphism-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Parol"
                        className="glassmorphism-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && <p style={{ color: '#dc3545', fontSize: '0.9em' }}>{error}</p>}
                    <button type="submit" className="cta-button glassmorphism-button" style={{ marginTop: '15px' }}>Kirish</button>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin;