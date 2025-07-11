// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { account } from '../appwriteConfig'; // account servisni import qilish
import '../index.css';

function AdminDashboard() {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const checkUserSession = async () => {
            try {
                const user = await account.get(); // Foydalanuvchi sessiyasini tekshirish
                setUserName(user.name);
            } catch (error) {
                console.error("Foydalanuvchi sessiyasi topilmadi:", error);
                navigate('/admin-login'); // Agar sessiya bo'lmasa, login sahifasiga yo'naltirish
            }
        };
        checkUserSession();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await account.deleteSession('current'); // Joriy sessiyani o'chirish
            navigate('/'); // Logoutdan so'ng bosh sahifaga yo'naltirish
        } catch (error) {
            console.error("Logoutda xato:", error);
            alert("Logoutda xato yuz berdi.");
        }
    };

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1>Admin Paneli</h1>
                    <nav>
                        <ul>
                            <li><Link to="/" className="glassmorphism-button">Bosh sahifa</Link></li>
                            <li><button onClick={handleLogout} className="glassmorphism-button logout-button">Chiqish</button></li>
                        </ul>
                    </nav>
                </div>
            </header>
            <main className="admin-content container">
                <h2 style={{ color: 'var(--text-color-light)', marginBottom: '25px', fontFamily: 'Montserrat' }}>Xush kelibsiz, {userName || 'Admin'}!</h2>
                <div className="dashboard-widgets">
                    <div className="widget glassmorphism-card">
                        <h3>Kitoblarni boshqarish</h3>
                        <p>Kitoblar ro'yxatini ko'rish, qo'shish, tahrirlash va o'chirish.</p>
                        <Link to="/admin/books" className="button glassmorphism-button">Kitoblarga o'tish</Link>
                    </div>
                    <div className="widget glassmorphism-card">
                        <h3>Buyurtmalarni boshqarish</h3>
                        <p>Foydalanuvchi buyurtmalarini ko'rib chiqish va holatini o'zgartirish.</p>
                        <Link to="/admin/orders" className="button glassmorphism-button">Buyurtmalarga o'tish</Link>
                    </div>
                    <div className="widget glassmorphism-card">
                        <h3>Foydalanuvchilarni boshqarish</h3>
                        <p>Foydalanuvchilar ro'yxatini boshqarish.</p>
                        <Link to="/admin/users" className="button glassmorphism-button">Foydalanuvchilarga o'tish</Link>
                    </div>
                </div>
            </main>
            <footer className="admin-footer">
                <div className="container">
                    <p>&copy; 2025 Zamon Books Admin. Barcha huquqlar himoyalangan.</p>
                </div>
            </footer>
        </div>
    );
}

export default AdminDashboard;