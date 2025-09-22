// Email Validation Utilities - Firebase
import { auth } from '../firebaseConfig';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

/**
 * Email format tekshirish
 * @param {string} email - Email address
 * @returns {boolean} Valid yoki yo'q
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Email unique ekanligini tekshirish (Firebase)
 * @param {string} email - Email address
 * @returns {Object} Tekshirish natijasi
 */
export const checkEmailAvailability = async (email) => {
    try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        
        return {
            available: signInMethods.length === 0,
            message: signInMethods.length === 0 
                ? 'Email mavjud' 
                : 'Bu email allaqachon ro\'yxatdan o\'tgan'
        };
    } catch (error) {
        console.error('Email tekshirishda xato:', error);
        return {
            available: false,
            message: 'Email tekshirishda xato'
        };
    }
};

/**
 * Register xatolarini tahlil qilish
 * @param {Error} error - Register xatosi
 * @returns {string} Foydalanuvchi uchun xabar
 */
export const parseRegisterError = (error) => {
    if (!error) return 'Noma\'lum xato';
    
    // Email allaqachon mavjud
    if (error.code === 409 || 
        error.message?.includes('user_already_exists') ||
        error.message?.includes('A user with the same email already exists')) {
        return 'Bu email allaqachon ro\'yxatdan o\'tgan. Login qilishni urinib ko\'ring.';
    }
    
    // Email format xatosi
    if (error.message?.includes('Invalid email format') ||
        error.message?.includes('email')) {
        return 'Email format noto\'g\'ri. To\'g\'ri format: example@domain.com';
    }
    
    // Parol xatosi
    if (error.message?.includes('Password') ||
        error.message?.includes('password')) {
        return 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak.';
    }
    
    // Umumiy xato
    return error.message || 'Ro\'yxatdan o\'tishda xato yuz berdi.';
};

/**
 * Login xatolarini tahlil qilish
 * @param {Error} error - Login xatosi
 * @returns {string} Foydalanuvchi uchun xabar
 */
export const parseLoginError = (error) => {
    if (!error) return 'Noma\'lum xato';
    
    // Noto'g'ri credentials
    if (error.code === 401 || 
        error.message?.includes('Invalid credentials') ||
        error.message?.includes('user_invalid_credentials')) {
        return 'Email yoki parol noto\'g\'ri. Qaytadan urinib ko\'ring.';
    }
    
    // User topilmadi
    if (error.message?.includes('User not found') ||
        error.message?.includes('user_not_found')) {
        return 'Bu email bilan hisob topilmadi. Ro\'yxatdan o\'tishni urinib ko\'ring.';
    }
    
    // Umumiy xato
    return error.message || 'Tizimga kirishda xato yuz berdi.';
};