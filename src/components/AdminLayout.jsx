// D:\zamon-books-frontend\src\components\AdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { account } from '../appwriteConfig'; // Appwrite Account servisni import qilish
import '../index.css'; // Global stillarni import qilish

function AdminLayout() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await account.get();
                setUser(currentUser);
                // Admin rolini tekshirish (Appwrite DBda yoki Teamsda)
                // Bu yerda foydalanuvchining 'role' atributi borligini faraz qilamiz
                // Agar sizda Appwrite Teams bo'lsa, bu yerda foydalanuvchining Admin Team a'zosi ekanligini tekshirishingiz kerak.
                // Misol: if (!currentUser.roles.includes('admin')) { navigate('/admin/login'); }
                // Hozircha soddalashtirilgan.
                if (!currentUser) { // Agar foydalanuvchi kirmagan bo'lsa
                    navigate('/admin/login');
                }
            } catch (err) {
                console.error("Foydalanuvchi sessiyasini tekshirishda xato:", err);
                navigate('/admin/login'); // Foydalanuvchi kirmagan bo'lsa, kirish sahifasiga yo'naltirish
            } finally {
                setLoading(false);
            }
        };
        checkUser();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await account.deleteSession('current'); // Joriy sessiyani tugatish
            setUser(null);
            navigate('/admin/login'); // Kirish sahifasiga qaytish
        } catch (err) {
            console.error("Chiqishda xato:", err);
            alert("Chiqishda xato yuz berdi. Iltimos, keyinroq urinib ko'ring.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <svg className="animate-spin h-10 w-10 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3">Yuklanmoqda...</span>
            </div>
        );
    }

    // Agar foydalanuvchi mavjud bo'lmasa, uni AdminLogin ga yo'naltirganmiz, shuning uchun bu yerda user har doim mavjud bo'ladi
    // yoki loading holati tugagan bo'ladi.
    return (
        <div className="flex min-h-screen bg-gray-800 text-gray-100">
            {/* Sidebar */}
            <aside className="w-64 glassmorphism-card p-4 flex flex-col justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-6 text-white">Admin Panel</h2>
                    <nav>
                        <ul>
                            <li className="mb-2">
                                <Link to="/admin/dashboard" className="block p-2 rounded hover:bg-gray-700 transition-colors">Dashboard</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/admin/books" className="block p-2 rounded hover:bg-gray-700 transition-colors">Kitoblar</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/admin/authors" className="block p-2 rounded hover:bg-gray-700 transition-colors">Mualliflar</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/admin/genres" className="block p-2 rounded hover:bg-gray-700 transition-colors">Janrlar</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/admin/users" className="block p-2 rounded hover:bg-gray-700 transition-colors">Foydalanuvchilar</Link>
                            </li>
                            <li className="mb-2">
                                <Link to="/admin/orders" className="block p-2 rounded hover:bg-gray-700 transition-colors">Buyurtmalar</Link>
                            </li>
                        </ul>
                    </nav>
                </div>
                <div className="mt-auto">
                    {user && (
                        <div className="mb-4 p-2 bg-gray-700 rounded-md text-sm">
                            <p>Kirgan: {user.email}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="glassmorphism-button w-full py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center"
                    >
                        Chiqish
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <Outlet /> {/* Ichki admin sahifalari shu yerda ko'rsatiladi */}
            </main>
        </div>
    );
}

export default AdminLayout;