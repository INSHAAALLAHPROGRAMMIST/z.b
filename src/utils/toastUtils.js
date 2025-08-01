import { showToast, TOAST_TYPES } from '../components/Toast';

// Toast utility functions for easy usage
export const toast = {
    success: (message, duration = 3000) => showToast(message, TOAST_TYPES.SUCCESS, duration),
    error: (message, duration = 4000) => showToast(message, TOAST_TYPES.ERROR, duration),
    warning: (message, duration = 3500) => showToast(message, TOAST_TYPES.WARNING, duration),
    info: (message, duration = 3000) => showToast(message, TOAST_TYPES.INFO, duration)
};

// Specific toast messages for common actions
export const toastMessages = {
    // Cart actions
    addedToCart: (bookTitle) => toast.success(`${bookTitle} savatga qo'shildi!`),
    removedFromCart: () => toast.info("Kitob savatdan o'chirildi!"),
    cartError: () => toast.error("Savatda xato yuz berdi."),
    
    // Order actions
    orderSuccess: () => toast.success("Buyurtmangiz muvaffaqiyatli qabul qilindi! Admin siz bilan bog'lanadi."),
    orderError: () => toast.error("Buyurtma berishda xato yuz berdi. Iltimos, qaytadan urinib ko'ring."),
    
    // Auth actions
    loginRequired: () => toast.warning("Buyurtma berish uchun tizimga kirishingiz kerak!"),
    emptyCart: () => toast.warning("Savatingiz bo'sh!"),
    
    // Profile actions
    profileUpdated: () => toast.success("Ma'lumotlar muvaffaqiyatli yangilandi!"),
    telegramSaved: () => toast.success("Telegram username muvaffaqiyatli saqlandi!"),
    
    // Validation errors
    nameRequired: () => toast.error("Ism kiritish majburiy!"),
    phoneInvalid: () => toast.error("Telefon raqami noto'g'ri formatda! Masalan: +998901234567"),
    telegramRequired: () => toast.error("Telegram username kiriting!"),
    
    // File upload
    fileTypeError: () => toast.error("Faqat rasm fayllarini yuklash mumkin!"),
    fileSizeError: (maxSizeMB) => toast.error(`Fayl hajmi ${maxSizeMB}MB dan oshmasligi kerak!`),
    
    // Admin actions
    testUsersCreated: () => toast.success("Test foydalanuvchilari muvaffaqiyatli yaratildi!"),
    testOrdersCreated: () => toast.success("Test buyurtmalari muvaffaqiyatli yaratildi!"),
    
    // Rate limiting
    rateLimitError: (remainingTime) => toast.warning(`Juda tez buyurtma berayapsiz. Yana ${remainingTime} soniya kuting.`),
    
    // Generic messages
    updateError: () => toast.error("Xato yuz berdi. Iltimos, qaytadan urinib ko'ring."),
    logoutError: () => toast.error("Chiqishda xato yuz berdi. Iltimos, keyinroq urinib ko'ring."),
    uploadError: () => toast.error("Rasm yuklashda xato yuz berdi. Iltimos, qaytadan urinib ko'ring yoki boshqa rasm tanlang.")
};

export default toast;