import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { account } from '../appwriteConfig';
import { loginAndSync } from '../utils/userSync';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/login.css';

function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is already logged in
        const checkUser = async () => {
            try {
                const currentUser = await account.get();
                if (currentUser) {
                    navigate('/admin-dashboard');
                }
            } catch (err) {
                // User is not logged in, stay on login page
                console.log("Foydalanuvchi tizimga kirmagan");
            }
        };

        checkUser();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Login va sync
            const loginResult = await loginAndSync(email, password);

            // Admin role tekshirish
            if (loginResult.dbUser.role === 'admin' || loginResult.dbUser.role === 'editor') {
                console.log('Admin login muvaffaqiyatli:', loginResult.dbUser);
                navigate('/admin-dashboard');
            } else {
                setError("Sizda admin huquqlari yo'q. Iltimos, administrator bilan bog'laning.");
                // Logout qilish
                await account.deleteSession('current');
            }

        } catch (err) {
            console.error("Tizimga kirishda xato:", err);
            setError("Email yoki parol noto'g'ri. Iltimos, qayta urinib ko'ring.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-container">
            <div className="admin-login-card">
                <div className="admin-login-header">
                    <img
                        src="https://res.cloudinary.com/dcn4maral/image/upload/v1752356041/favicon_maovuy.svg"
                        alt="Zamon Books Logo"
                        className="admin-login-logo"
                    />
                    <h1>Zamon Books Admin</h1>
                </div>

                {error && (
                    <div className="admin-error">
                        <i className="fas fa-exclamation-circle"></i> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="admin-login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Email manzilingizni kiriting"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Parol</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Parolingizni kiriting"
                        />
                    </div>

                    <button
                        type="submit"
                        className="admin-login-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Kirish...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt"></i> Tizimga kirish
                            </>
                        )}
                    </button>
                </form>

                <div className="admin-login-footer">
                    <p>&copy; {new Date().getFullYear()} Zamon Books. Barcha huquqlar himoyalangan.</p>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;