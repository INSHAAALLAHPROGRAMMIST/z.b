// Firebase User Service - User management with Firebase
import { auth, db } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

/**
 * User registration with Firebase Auth and Firestore
 */
export const registerUser = async (userData) => {
  try {
    const { email, password, name, phone } = userData;
    
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user profile
    await updateProfile(user, {
      displayName: name
    });
    
    // Save additional user data to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      name: name,
      phone: phone || '',
      role: 'user', // default role
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false
    });
    
    // Send email verification
    await sendEmailVerification(user);
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: name,
        emailVerified: user.emailVerified
      }
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: error.code,
      message: getFirebaseErrorMessage(error.code)
    };
  }
};

/**
 * User login with Firebase Auth
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.displayName || userData.name,
        emailVerified: user.emailVerified,
        isAdmin: userData.isAdmin || false,
        role: userData.role || 'user'
      }
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.code,
      message: getFirebaseErrorMessage(error.code)
    };
  }
};

/**
 * User logout
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.code };
  }
};

/**
 * Get user data from Firestore
 */
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, user: userDoc.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Get user data error:', error);
    return { success: false, error: error.code };
  }
};

/**
 * Update user data in Firestore
 */
export const updateUserData = async (uid, updateData) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updateData,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Update user data error:', error);
    return { success: false, error: error.code };
  }
};

/**
 * Check if user is admin
 */
export const checkAdminStatus = async (uid) => {
  try {
    const userData = await getUserData(uid);
    if (userData.success) {
      return userData.user.isAdmin || false;
    }
    return false;
  } catch (error) {
    console.error('Check admin status error:', error);
    return false;
  }
};

/**
 * Firebase error messages in Uzbek
 */
const getFirebaseErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/email-already-in-use': 'Bu email allaqachon ishlatilmoqda',
    'auth/weak-password': 'Parol juda zaif (kamida 6 ta belgi)',
    'auth/invalid-email': 'Email manzil noto\'g\'ri',
    'auth/user-not-found': 'Foydalanuvchi topilmadi',
    'auth/wrong-password': 'Parol noto\'g\'ri',
    'auth/too-many-requests': 'Juda ko\'p urinish. Keyinroq qayta urinib ko\'ring',
    'auth/network-request-failed': 'Internet aloqasi yo\'q',
    'auth/invalid-credential': 'Login ma\'lumotlari noto\'g\'ri'
  };
  
  return errorMessages[errorCode] || 'Noma\'lum xato yuz berdi';
};