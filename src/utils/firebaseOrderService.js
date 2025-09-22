// Firebase Order Service - Order management with Firebase Firestore
import { db } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Create new order
 */
export const createOrder = async (orderData) => {
  try {
    const order = {
      ...orderData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'orders'), order);
    
    return {
      success: true,
      orderId: docRef.id,
      order: { id: docRef.id, ...order }
    };
    
  } catch (error) {
    console.error('Create order error:', error);
    return {
      success: false,
      error: error.code,
      message: 'Buyurtma yaratishda xato'
    };
  }
};

/**
 * Get user orders
 */
export const getUserOrders = async (userId) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      orders: orders
    };
    
  } catch (error) {
    console.error('Get user orders error:', error);
    return {
      success: false,
      error: error.code,
      message: 'Buyurtmalarni olishda xato'
    };
  }
};

/**
 * Get all orders (admin)
 */
export const getAllOrders = async (limitCount = 50) => {
  try {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      orders: orders
    };
    
  } catch (error) {
    console.error('Get all orders error:', error);
    return {
      success: false,
      error: error.code,
      message: 'Barcha buyurtmalarni olishda xato'
    };
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (orderId, status, adminNotes = '') => {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: status,
      adminNotes: adminNotes,
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Buyurtma holati yangilandi'
    };
    
  } catch (error) {
    console.error('Update order status error:', error);
    return {
      success: false,
      error: error.code,
      message: 'Buyurtma holatini yangilashda xato'
    };
  }
};

/**
 * Get order by ID
 */
export const getOrderById = async (orderId) => {
  try {
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        success: true,
        order: {
          id: docSnap.id,
          ...docSnap.data()
        }
      };
    } else {
      return {
        success: false,
        error: 'not-found',
        message: 'Buyurtma topilmadi'
      };
    }
    
  } catch (error) {
    console.error('Get order by ID error:', error);
    return {
      success: false,
      error: error.code,
      message: 'Buyurtmani olishda xato'
    };
  }
};

/**
 * Delete order (admin only)
 */
export const deleteOrder = async (orderId) => {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
    
    return {
      success: true,
      message: 'Buyurtma o\'chirildi'
    };
    
  } catch (error) {
    console.error('Delete order error:', error);
    return {
      success: false,
      error: error.code,
      message: 'Buyurtmani o\'chirishda xato'
    };
  }
};

/**
 * Get orders by status
 */
export const getOrdersByStatus = async (status) => {
  try {
    const q = query(
      collection(db, 'orders'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const orders = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      orders: orders
    };
    
  } catch (error) {
    console.error('Get orders by status error:', error);
    return {
      success: false,
      error: error.code,
      message: 'Buyurtmalarni olishda xato'
    };
  }
};

/**
 * Order status constants
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

/**
 * Get order status text in Uzbek
 */
export const getOrderStatusText = (status) => {
  const statusTexts = {
    [ORDER_STATUS.PENDING]: 'Kutilmoqda',
    [ORDER_STATUS.CONFIRMED]: 'Tasdiqlandi',
    [ORDER_STATUS.PROCESSING]: 'Tayyorlanmoqda',
    [ORDER_STATUS.SHIPPED]: 'Yuborildi',
    [ORDER_STATUS.DELIVERED]: 'Yetkazildi',
    [ORDER_STATUS.CANCELLED]: 'Bekor qilindi'
  };
  
  return statusTexts[status] || 'Noma\'lum';
};