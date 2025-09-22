// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase config - .env faylidan olinadi
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase app'ni initialize qilish
const app = initializeApp(firebaseConfig);

// Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Production Firebase - emulator yo'q, to'g'ridan-to'g'ri cloud bilan ishlash
console.log('🔥 Firebase initialized for production use');

// Helper functions
export const timestamp = () => new Date();

// Collection references
export const COLLECTIONS = {
  BOOKS: 'books',
  USERS: 'users',
  ORDERS: 'orders',
  CART: 'cart',
  WISHLIST: 'wishlist',
  GENRES: 'genres',
  AUTHORS: 'authors',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_PREFERENCES: 'notification_preferences'
};

// Global qilish (admin user yaratish uchun)
if (typeof window !== 'undefined') {
  window.auth = auth;
  window.db = db;
  window.firebase = app;
  console.log('🔥 Firebase services exposed globally');
}

export default app;