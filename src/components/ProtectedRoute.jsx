// D:\zamon-books-frontend\src\components\ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { account } from '../appwriteConfig'; // account servisni import qilish
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const ProtectedRoute = ({ children }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkUserSession = async () => {
            try {
                // Hozirgi sessiyani tekshirish
                await account.get();
                setIsLoggedIn(true);
            } catch (error) {
                // Sessiya topilmasa yoki xato bo'lsa, login sahifasiga yo'naltirish
                console.error("Sessiya tekshirilmoqda xato:", error);
                setIsLoggedIn(false);
                navigate('/admin/login', { replace: true });
            } finally {
                setLoading(false);
            }
        };

        checkUserSession();
    }, [navigate]);

    if (loading) {
        return <div className="container" style={{ padding: '50px', textAlign: 'center' }}>Yuklanmoqda...</div>;
    }

    if (!isLoggedIn) {
        // Bu holatda navigate() allaqachon chaqirilgan, shuning uchun hech narsa render qilmaymiz
        return null;
    }

    return children;
};

export default ProtectedRoute;