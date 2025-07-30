// Order Service - Orders collection bilan ishlash
import { databases, account, ID, Query } from '../appwriteConfig';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const ORDERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ORDERS_ID;
const CART_ITEMS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_CART_ITEMS_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID;

/**
 * Cart itemlarni orderga aylantirish
 * @param {Array} cartItems - Cart items array
 * @param {string} notes - Admin eslatmalari (ixtiyoriy)
 * @returns {Array} Yaratilgan orderlar
 */
export const createOrdersFromCart = async (cartItems, notes = '') => {
    try {
        const currentUser = await account.get();
        const createdOrders = [];

        for (const item of cartItems) {
            // Cart item strukturasini tekshirish
            const bookId = item.bookId || (typeof item.books === 'object' ? item.books.$id : item.books);
            const bookPrice = item.priceAtTimeOfAdd || item.book?.price || (typeof item.books === 'object' ? item.books.price : 0);
            
            console.log('Cart item:', item);
            console.log('Book ID:', bookId);
            console.log('Book price:', bookPrice);
            
            if (!bookId) {
                console.error('Book ID topilmadi:', item);
                throw new Error(`Book ID topilmadi: ${JSON.stringify(item)}`);
            }
            
            const orderData = {
                orderId: ID.unique(),
                userId: currentUser.$id, // Auth user ID (user jadvaliga reference)
                bookId: bookId,
                quantity: item.quantity || 1, // Default 1
                priceAtTimeOfOrder: parseFloat(bookPrice) || 0,
                orderDate: new Date().toISOString(),
                status: 'pending', // Required field, har doim pending
                notes: notes || '' // Optional field
            };

            // Order yaratish
            const order = await databases.createDocument(
                DATABASE_ID,
                ORDERS_COLLECTION_ID,
                ID.unique(),
                orderData
            );

            createdOrders.push(order);

            // Cart itemni o'chirish
            try {
                await databases.deleteDocument(
                    DATABASE_ID,
                    CART_ITEMS_COLLECTION_ID,
                    item.$id
                );
                console.log('Cart item o\'chirildi:', item.$id);
            } catch (deleteError) {
                console.error('Cart item o\'chirishda xato:', deleteError);
                // Cart item o'chirilmasa ham order yaratilgan bo'ladi
            }
        }

        return createdOrders;
    } catch (error) {
        console.error('Orders yaratishda xato:', error);
        throw error;
    }
};

/**
 * User orderlarini olish
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Array} Orders with book details
 */
export const getUserOrders = async (userId, options = {}) => {
    try {
        const queries = [
            Query.equal('userId', userId),
            Query.orderDesc('orderDate')
        ];

        if (options.limit) {
            queries.push(Query.limit(options.limit));
        }

        if (options.status) {
            queries.push(Query.equal('status', options.status));
        }

        const ordersResponse = await databases.listDocuments(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            queries
        );

        // Har bir order uchun book ma'lumotlarini olish
        const ordersWithBookDetails = await Promise.all(
            ordersResponse.documents.map(async (order) => {
                try {
                    const book = await databases.getDocument(
                        DATABASE_ID,
                        BOOKS_COLLECTION_ID,
                        order.bookId
                    );
                    return { ...order, book };
                } catch (err) {
                    console.error('Kitob ma\'lumotlarini yuklashda xato:', err);
                    return {
                        ...order,
                        book: {
                            title: 'Noma\'lum kitob',
                            imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg',
                            price: order.priceAtTimeOfOrder || 0
                        }
                    };
                }
            })
        );

        return ordersWithBookDetails;
    } catch (error) {
        console.error('User orderlarini olishda xato:', error);
        throw error;
    }
};

/**
 * Barcha orderlarni olish (Admin uchun)
 * @param {Object} options - Query options
 * @returns {Array} Orders with user and book details
 */
export const getAllOrders = async (options = {}) => {
    try {
        const queries = [Query.orderDesc('orderDate')];

        if (options.limit) {
            queries.push(Query.limit(options.limit));
        }

        if (options.offset) {
            queries.push(Query.offset(options.offset));
        }

        if (options.status) {
            queries.push(Query.equal('status', options.status));
        }

        const ordersResponse = await databases.listDocuments(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            queries
        );

        // Har bir order uchun user va book ma'lumotlarini olish
        const ordersWithDetails = await Promise.all(
            ordersResponse.documents.map(async (order) => {
                const [userResult, bookResult] = await Promise.all([
                    // User ma'lumotlarini database'dan olish
                    databases.listDocuments(
                        DATABASE_ID,
                        USERS_COLLECTION_ID,
                        [
                            Query.equal('userId', order.userId),
                            Query.limit(1)
                        ]
                    ).catch(() => ({ documents: [] })),

                    // Book ma'lumotlarini olish
                    databases.getDocument(
                        DATABASE_ID,
                        BOOKS_COLLECTION_ID,
                        order.bookId
                    ).catch(() => ({
                        title: 'Noma\'lum kitob',
                        imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg',
                        price: order.priceAtTimeOfOrder || 0
                    }))
                ]);

                const user = userResult.documents.length > 0 ? userResult.documents[0] : null;

                return {
                    ...order,
                    user: user ? {
                        fullName: user.fullName || user.name || 'Noma\'lum',
                        email: user.email || 'Noma\'lum',
                        phone: user.phone || '',
                        address: user.address || '',
                        telegram_username: user.telegram_username || ''
                    } : {
                        fullName: 'Noma\'lum foydalanuvchi',
                        email: 'Noma\'lum',
                        phone: '',
                        address: '',
                        telegram_username: ''
                    },
                    book: bookResult
                };
            })
        );

        return {
            documents: ordersWithDetails,
            total: ordersResponse.total
        };
    } catch (error) {
        console.error('Barcha orderlarni olishda xato:', error);
        throw error;
    }
};

/**
 * Order statusini yangilash
 * @param {string} orderId - Order document ID
 * @param {string} newStatus - Yangi status
 * @returns {Object} Yangilangan order
 */
export const updateOrderStatus = async (orderId, newStatus) => {
    try {
        // Valid status'larni tekshirish
        const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}. Valid statuses: ${validStatuses.join(', ')}`);
        }

        const updatedOrder = await databases.updateDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId,
            {
                status: newStatus
            }
        );

        return updatedOrder;
    } catch (error) {
        console.error('Order statusini yangilashda xato:', error);
        throw error;
    }
};

/**
 * Order statistikasini olish
 * @returns {Object} Order statistics
 */
export const getOrderStatistics = async () => {
    try {
        const [allOrders, pendingOrders, processingOrders, completedOrders] = await Promise.all([
            databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.limit(1000)]),
            databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.equal('status', 'pending')]),
            databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.equal('status', 'processing')]),
            databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION_ID, [Query.equal('status', 'completed')])
        ]);

        const totalRevenue = allOrders.documents.reduce((sum, order) => {
            return sum + (order.priceAtTimeOfOrder * order.quantity);
        }, 0);

        return {
            totalOrders: allOrders.total,
            pendingOrders: pendingOrders.total,
            processingOrders: processingOrders.total,
            completedOrders: completedOrders.total,
            totalRevenue
        };
    } catch (error) {
        console.error('Order statistikasini olishda xato:', error);
        throw error;
    }
};

/**
 * Sample orders yaratish
 * @returns {number} Yaratilgan orderlar soni
 */
export const createSampleOrders = async () => {
    try {
        // Users va books'ni olish
        const [usersResponse, booksResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.limit(10)]),
            databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [Query.limit(10)])
        ]);

        if (usersResponse.documents.length === 0 || booksResponse.documents.length === 0) {
            throw new Error('Users yoki books mavjud emas');
        }

        const users = usersResponse.documents;
        const books = booksResponse.documents;

        const sampleOrders = [
            {
                userId: users[0]?.userId || users[0]?.$id, // Auth user ID
                bookId: books[0]?.$id,
                quantity: 2,
                priceAtTimeOfOrder: parseFloat(books[0]?.price || 50000),
                status: 'pending',
                notes: 'Test buyurtma 1'
            },
            {
                userId: users[0]?.userId || users[0]?.$id,
                bookId: books[1]?.$id || books[0]?.$id,
                quantity: 1,
                priceAtTimeOfOrder: parseFloat(books[1]?.price || books[0]?.price || 75000),
                status: 'processing',
                notes: 'Test buyurtma 2 - jarayonda'
            },
            {
                userId: users[1]?.userId || users[0]?.userId || users[0]?.$id,
                bookId: books[2]?.$id || books[0]?.$id,
                quantity: 1,
                priceAtTimeOfOrder: parseFloat(books[2]?.price || books[0]?.price || 60000),
                status: 'completed',
                notes: 'Test buyurtma 3 - yakunlangan'
            }
        ];

        for (const orderData of sampleOrders) {
            await databases.createDocument(
                DATABASE_ID,
                ORDERS_COLLECTION_ID,
                ID.unique(),
                {
                    orderId: ID.unique(),
                    userId: orderData.userId,
                    bookId: orderData.bookId,
                    quantity: orderData.quantity || 1, // Default 1
                    priceAtTimeOfOrder: orderData.priceAtTimeOfOrder || 0,
                    orderDate: new Date().toISOString(),
                    status: orderData.status || 'pending', // Default pending
                    notes: orderData.notes || '' // Default empty string
                }
            );
        }

        return sampleOrders.length;
    } catch (error) {
        console.error('Sample orders yaratishda xato:', error);
        throw error;
    }
};