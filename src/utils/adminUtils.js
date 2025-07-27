// Admin Utilities
import { account } from '../appwriteConfig';

/**
 * ESLATMA: Admin role faqat Appwrite Console orqali beriladi!
 * Bu funksiya ishlamaydi - faqat xatolik ko'rsatish uchun.
 */
export const grantAdminRole = async () => {
    throw new Error(
        '❌ Admin role kod orqali berilmaydi!\n\n' +
        '✅ To\'g\'ri usul:\n' +
        '1. Appwrite Console > Auth > Users\n' +
        '2. User\'ni tanlang\n' +
        '3. Labels qismiga "admin" qo\'shing'
    );
};

/**
 * Admin ekanligini tekshirish (faqat Auth Labels orqali)
 * @returns {boolean} Admin yoki yo'q
 */
export const checkAdminStatus = async () => {
    try {
        const currentUser = await account.get();

        // Faqat Auth labels tekshirish (xavfsiz usul)
        return currentUser.labels?.includes('admin') || false;
    } catch (error) {
        return false;
    }
};

/**
 * Barcha adminlarni olish
 * DIQQAT: Bu funksiya faqat Auth Preferences'dan admin'larni topadi.
 * Auth Labels orqali admin bo'lgan user'lar bu ro'yxatda ko'rinmaydi.
 * Production'da bu funksiya to'liq ishlamaydi.
 * @returns {Array} Admin userlar ro'yxati (faqat preferences orqali)
 */
export const getAllAdmins = async () => {
    try {
        console.warn('⚠️  getAllAdmins: Faqat preferences orqali adminlar qaytariladi!');
        console.warn('⚠️  Auth Labels orqali adminlar bu ro\'yxatda ko\'rinmaydi!');

        // Bu funksiya haqiqatan ham ishlamaydi, chunki biz database ishlatmayapmiz
        // Va Auth API orqali barcha user'larni olish imkoni yo'q

        console.error('❌ getAllAdmins: Database ishlatilmaydi, funksiya ishlamaydi!');
        return [];
    } catch (error) {
        console.error('Adminlarni olishda xato:', error);
        return [];
    }
};