// Inventory Management Utilities

export const STOCK_STATUS = {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock', 
    OUT_OF_STOCK: 'out_of_stock',
    DISCONTINUED: 'discontinued',
    PRE_ORDER: 'pre_order',
    COMING_SOON: 'coming_soon'
};

export const BOOK_VISIBILITY = {
    VISIBLE: 'visible',
    HIDDEN: 'hidden',
    ADMIN_ONLY: 'admin_only'
};

export const SORT_OPTIONS = [
    { value: 'recommended', label: 'Tavsiya etilgan', icon: 'fas fa-star' },
    { value: 'admin_priority', label: 'Admin tartibi', icon: 'fas fa-crown' },
    { value: 'newest', label: 'Eng yangi', icon: 'fas fa-clock' },
    { value: 'oldest', label: 'Eng eski', icon: 'fas fa-history' },
    { value: 'price_low', label: 'Arzon narx', icon: 'fas fa-sort-amount-down' },
    { value: 'price_high', label: 'Qimmat narx', icon: 'fas fa-sort-amount-up' },
    { value: 'popular', label: 'Mashhur', icon: 'fas fa-fire' },
    { value: 'alphabetical', label: 'Alifbo tartibida', icon: 'fas fa-sort-alpha-down' },
    { value: 'stock_high', label: 'Ko\'p mavjud', icon: 'fas fa-boxes' },
    { value: 'stock_low', label: 'Kam qolgan', icon: 'fas fa-exclamation-triangle' }
];

// Stock status'ni aniqlash
export const getStockStatus = (stock, minStockLevel = 2) => {
    if (stock <= 0) return STOCK_STATUS.OUT_OF_STOCK;
    if (stock <= minStockLevel) return STOCK_STATUS.LOW_STOCK;
    return STOCK_STATUS.IN_STOCK;
};

// Stock status'ga qarab rang olish
export const getStockStatusColor = (status) => {
    switch (status) {
        case STOCK_STATUS.IN_STOCK:
            return '#10b981'; // Green
        case STOCK_STATUS.LOW_STOCK:
            return '#f59e0b'; // Yellow
        case STOCK_STATUS.OUT_OF_STOCK:
            return '#ef4444'; // Red
        case STOCK_STATUS.DISCONTINUED:
            return '#6b7280'; // Gray
        case STOCK_STATUS.PRE_ORDER:
            return '#3b82f6'; // Blue
        case STOCK_STATUS.COMING_SOON:
            return '#8b5cf6'; // Purple
        default:
            return '#6b7280';
    }
};

// Stock status'ga qarab matn olish
export const getStockStatusText = (status, stock = 0) => {
    switch (status) {
        case STOCK_STATUS.IN_STOCK:
            return `Mavjud (${stock} dona)`;
        case STOCK_STATUS.LOW_STOCK:
            return `Kam qoldi! (${stock} dona)`;
        case STOCK_STATUS.OUT_OF_STOCK:
            return 'Tugagan';
        case STOCK_STATUS.DISCONTINUED:
            return 'Ishlab chiqarilmaydi';
        case STOCK_STATUS.PRE_ORDER:
            return 'Oldindan buyurtma';
        case STOCK_STATUS.COMING_SOON:
            return 'Tez orada keladi';
        default:
            return 'Noma\'lum';
    }
};

// Kitoblarni saralash
export const sortBooks = (books, sortBy) => {
    const sortedBooks = [...books];
    
    switch (sortBy) {
        case 'recommended':
            return sortedBooks.sort((a, b) => {
                // Priority: Admin Priority > Featured > New > Popular > In Stock > Low Stock > Out of Stock
                const getPriority = (book) => {
                    if (book.adminPriority > 0) return 10 + book.adminPriority;
                    if (book.isFeatured) return 6;
                    if (book.isNewArrival) return 5;
                    if ((book.salesCount || 0) > 10) return 4;
                    if (book.stockStatus === STOCK_STATUS.IN_STOCK) return 3;
                    if (book.stockStatus === STOCK_STATUS.LOW_STOCK) return 2;
                    if (book.stockStatus === STOCK_STATUS.PRE_ORDER) return 1;
                    return 0;
                };
                return getPriority(b) - getPriority(a);
            });
            
        case 'admin_priority':
            return sortByAdminPriority(sortedBooks);
            
        case 'newest':
            return sortedBooks.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
            
        case 'oldest':
            return sortedBooks.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt));
            
        case 'price_low':
            return sortedBooks.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));
            
        case 'price_high':
            return sortedBooks.sort((a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0));
            
        case 'popular':
            return sortedBooks.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
            
        case 'alphabetical':
            return sortedBooks.sort((a, b) => a.title.localeCompare(b.title, 'uz'));
            
        case 'stock_high':
            return sortedBooks.sort((a, b) => (b.stock || 0) - (a.stock || 0));
            
        case 'stock_low':
            return sortedBooks.sort((a, b) => (a.stock || 0) - (b.stock || 0));
            
        default:
            return sortedBooks;
    }
};

// Stock'ni yangilash
export const updateStock = async (databases, bookId, newStock, reason = '') => {
    try {
        const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
        
        // Hozirgi kitob ma'lumotlarini olish
        const book = await databases.getDocument(DATABASE_ID, BOOKS_COLLECTION_ID, bookId);
        
        // Yangi stock status'ni aniqlash
        const newStatus = getStockStatus(newStock, book.minStockLevel);
        
        // Kitobni yangilash
        const updatedBook = await databases.updateDocument(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            bookId,
            {
                stock: newStock,
                stockStatus: newStatus,
                isAvailable: newStock > 0 && newStatus !== STOCK_STATUS.DISCONTINUED,
                lastRestocked: newStock > book.stock ? new Date().toISOString() : book.lastRestocked
            }
        );
        
        // Stock history'ga yozish (agar kerak bo'lsa)
        console.log(`📦 Stock yangilandi: ${book.title} - ${book.stock} → ${newStock} (${reason})`);
        
        return updatedBook;
        
    } catch (error) {
        console.error('Stock yangilashda xato:', error);
        throw error;
    }
};

// Bulk stock update
export const bulkUpdateStock = async (databases, updates) => {
    const results = [];
    
    for (const update of updates) {
        try {
            const result = await updateStock(
                databases, 
                update.bookId, 
                update.stock, 
                update.reason || 'Bulk update'
            );
            results.push({ success: true, bookId: update.bookId, result });
        } catch (error) {
            results.push({ success: false, bookId: update.bookId, error: error.message });
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
};

// Low stock alert'larini olish
export const getLowStockAlerts = (books) => {
    return books.filter(book => 
        book.stockStatus === STOCK_STATUS.LOW_STOCK || 
        book.stockStatus === STOCK_STATUS.OUT_OF_STOCK
    ).sort((a, b) => (a.stock || 0) - (b.stock || 0));
};

// Book visibility'ni tekshirish
export const isBookVisible = (book, isAdmin = false) => {
    // Admin har doim barcha kitoblarni ko'radi
    if (isAdmin) return true;
    
    // Visibility field bo'lmasa, default visible
    const visibility = book.visibility || BOOK_VISIBILITY.VISIBLE;
    
    // Hidden kitoblar ko'rinmaydi
    if (visibility === BOOK_VISIBILITY.HIDDEN) return false;
    
    // Admin only kitoblar faqat admin ko'radi
    if (visibility === BOOK_VISIBILITY.ADMIN_ONLY) return false;
    
    // Discontinued kitoblar ko'rinmaydi (agar admin sozlamagan bo'lsa)
    if (book.stockStatus === STOCK_STATUS.DISCONTINUED && !book.showWhenDiscontinued) {
        return false;
    }
    
    return true;
};

// Kitoblarni visibility bo'yicha filter qilish
export const filterVisibleBooks = (books, isAdmin = false) => {
    return books.filter(book => isBookVisible(book, isAdmin));
};

// Pre-order/Waitlist funksiyalari
export const canPreOrder = (book) => {
    return book.stockStatus === STOCK_STATUS.PRE_ORDER || 
           book.stockStatus === STOCK_STATUS.COMING_SOON ||
           (book.stockStatus === STOCK_STATUS.OUT_OF_STOCK && book.allowPreOrder);
};

export const canJoinWaitlist = (book) => {
    return book.stockStatus === STOCK_STATUS.OUT_OF_STOCK && 
           book.enableWaitlist !== false;
};

// Expected restock date'ni format qilish
export const formatRestockDate = (date) => {
    if (!date) return null;
    
    const restockDate = new Date(date);
    const now = new Date();
    const diffTime = restockDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Kechikmoqda';
    if (diffDays === 0) return 'Bugun';
    if (diffDays === 1) return 'Ertaga';
    if (diffDays <= 7) return `${diffDays} kun ichida`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} hafta ichida`;
    
    return restockDate.toLocaleDateString('uz-UZ');
};

// Admin priority sorting
export const sortByAdminPriority = (books) => {
    return [...books].sort((a, b) => {
        const priorityA = a.adminPriority || 0;
        const priorityB = b.adminPriority || 0;
        
        // Yuqori priority birinchi
        if (priorityA !== priorityB) {
            return priorityB - priorityA;
        }
        
        // Priority bir xil bo'lsa, yangi qo'shilganlar birinchi
        return new Date(b.$createdAt) - new Date(a.$createdAt);
    });
};

// Inventory statistics
export const getInventoryStats = (books) => {
    const stats = {
        total: books.length,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        discontinued: 0,
        preOrder: 0,
        comingSoon: 0,
        hidden: 0,
        totalValue: 0,
        totalStock: 0,
        waitlistTotal: 0,
        preOrderTotal: 0
    };
    
    books.forEach(book => {
        const stock = book.stock || 0;
        const price = parseFloat(book.price || 0);
        
        stats.totalStock += stock;
        stats.totalValue += stock * price;
        stats.waitlistTotal += book.waitlistCount || 0;
        stats.preOrderTotal += book.preOrderCount || 0;
        
        // Visibility stats
        if (!isBookVisible(book, false)) {
            stats.hidden++;
        }
        
        switch (book.stockStatus) {
            case STOCK_STATUS.IN_STOCK:
                stats.inStock++;
                break;
            case STOCK_STATUS.LOW_STOCK:
                stats.lowStock++;
                break;
            case STOCK_STATUS.OUT_OF_STOCK:
                stats.outOfStock++;
                break;
            case STOCK_STATUS.DISCONTINUED:
                stats.discontinued++;
                break;
            case STOCK_STATUS.PRE_ORDER:
                stats.preOrder++;
                break;
            case STOCK_STATUS.COMING_SOON:
                stats.comingSoon++;
                break;
        }
    });
    
    return stats;
};