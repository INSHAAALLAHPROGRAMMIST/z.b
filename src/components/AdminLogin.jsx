import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminAuth } from '../utils/adminAuth';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/login.css';

function AdminLogin() {
    const [email, setEmail] = useState('admin@zamonbooks.uz');
    const [password, setPassword] = useState('admin123');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if admin is already logged in
        const currentUser = AdminAuth.getCurrentUser();
        if (currentUser && AdminAuth.isAdmin()) {
            navigate('/admin-dashboard');
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Test admin login
            const user = await AdminAuth.login(email, password);
            console.log('Admin login successful:', user);
            navigate('/admin-dashboard');
        } catch (err) {
            console.error("Tizimga kirishda xato:", err);
            setError('Login failed: ' + err.message);
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