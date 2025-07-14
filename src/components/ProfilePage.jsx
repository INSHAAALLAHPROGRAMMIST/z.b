// src/components/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import { account } from '../appwriteConfig'; // Appwrite account obyektini import qilish
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const loggedInUser = await account.get(); // Joriy foydalanuvchi ma'lumotlarini olish
                setUser(loggedInUser);
            } catch (err) {
                console.error("Foydalanuvchi ma'lumotlarini yuklashda xato:", err);
                setError("Foydalanuvchi ma'lumotlarini yuklashda xato yuz berdi. Iltimos, qayta kiring.");
                navigate('/auth'); // Agar foydalanuvchi topilmasa, kirish sahifasiga yo'naltirish
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await account.deleteSession('current'); // Joriy sessiyani o'chirish
            console.log("Muvaffaqiyatli tizimdan chiqdingiz!");
            navigate('/auth'); // Kirish sahifasiga yo'naltirish
            // Savat hisobini yangilash uchun global event yuborish
            window.dispatchEvent(new CustomEvent('cartUpdated')); 
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

    if (!user) {
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
        <div className="container auth-container glassmorphism-card" style={{ marginTop: '50px', marginBottom: '50px' }}>
            <h2 className="section-title">Profil Ma'lumotlari</h2>
            <div style={{ textAlign: 'left', maxWidth: '300px', margin: '0 auto' }}>
                <p><strong>ID:</strong> {user.$id}</p>
                <p><strong>Ism:</strong> {user.name || 'Mavjud emas'}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Email tasdiqlangan:</strong> {user.emailVerification ? 'Ha' : 'Yo\'q'}</p>
                <p><strong>Yaratilgan sana:</strong> {new Date(user.$createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={handleLogout} className="glassmorphism-button" style={{ marginTop: '30px' }}>
                <i className="fas fa-sign-out-alt"></i> Tizimdan Chiqish
            </button>
        </div>
    );
};

export default ProfilePage;