// useFirebaseAuth Hook - Authentication bilan ishlash uchun
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import firebaseService from '../services/FirebaseService';
import { toastMessages } from '../utils/toastUtils';

const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const mountedRef = useRef(true);

  // Load user profile from Firestore
  const loadUserProfile = useCallback(async (uid) => {
    if (!uid || !mountedRef.current) return;

    try {
      const profile = await firebaseService.getUserById(uid);
      if (mountedRef.current) {
        setUserProfile(profile);
        setIsAdmin(profile?.isAdmin || false);
        
        // Update login stats
        if (profile) {
          firebaseService.updateUserLoginStats(uid);
        }
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      if (mountedRef.current) {
        setUserProfile(null);
        setIsAdmin(false);
      }
    }
  }, []);

  // Sign in with email and password
  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Load user profile
      await loadUserProfile(user.uid);

      toastMessages.loginSuccess();
      return user;
    } catch (err) {
      console.error('Error signing in:', err);
      const errorMessage = getAuthErrorMessage(err.code);
      setError(errorMessage);
      toastMessages.loginError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadUserProfile]);

  // Sign up with email and password
  const signUp = useCallback(async (email, password, userData = {}) => {
    try {
      setLoading(true);
      setError(null);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      if (userData.displayName) {
        await updateProfile(user, {
          displayName: userData.displayName
        });
      }

      // Create user profile in Firestore
      const profileData = {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName || '',
        fullName: userData.fullName || '',
        phone: userData.phone || '',
        address: userData.address || '',
        telegramUsername: userData.telegramUsername || '',
        preferredLanguage: 'uz',
        theme: 'dark',
        notifications: {
          email: true,
          sms: false,
          telegram: false
        }
      };

      await firebaseService.createUser(profileData);
      await loadUserProfile(user.uid);

      toastMessages.registerSuccess();
      return user;
    } catch (err) {
      console.error('Error signing up:', err);
      const errorMessage = getAuthErrorMessage(err.code);
      setError(errorMessage);
      toastMessages.registerError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadUserProfile]);

  // Sign out
  const signOutUser = useCallback(async () => {
    try {
      setLoading(true);
      await signOut(auth);
      
      if (mountedRef.current) {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setError(null);
      }

      // Clear local storage
      localStorage.removeItem('currentUserId');
      
      toastMessages.logoutSuccess();
    } catch (err) {
      console.error('Error signing out:', err);
      const errorMessage = 'Chiqishda xato yuz berdi';
      setError(errorMessage);
      toastMessages.logoutError();
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Send password reset email
  const resetPassword = useCallback(async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      toastMessages.passwordResetSent();
      return true;
    } catch (err) {
      console.error('Error sending password reset:', err);
      const errorMessage = getAuthErrorMessage(err.code);
      setError(errorMessage);
      toastMessages.passwordResetError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Update user profile
  const updateUserProfile = useCallback(async (updates) => {
    if (!user || !mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      // Update Firebase Auth profile if needed
      if (updates.displayName && updates.displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: updates.displayName
        });
      }

      // Update Firestore profile
      const updatedProfile = await firebaseService.updateUser(user.uid, updates);
      
      if (mountedRef.current) {
        setUserProfile(updatedProfile);
      }

      toastMessages.profileUpdateSuccess();
      return updatedProfile;
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = 'Profil yangilashda xato yuz berdi';
      setError(errorMessage);
      toastMessages.profileUpdateError();
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mountedRef.current) return;

      setLoading(true);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        localStorage.setItem('currentUserId', firebaseUser.uid);
        await loadUserProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        localStorage.removeItem('currentUserId');
      }
      
      if (mountedRef.current) {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadUserProfile]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    user,
    userProfile,
    loading,
    error,
    isAdmin,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut: signOutUser,
    resetPassword,
    updateProfile: updateUserProfile,
    clearError: () => setError(null)
  };
};

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Bunday email bilan foydalanuvchi topilmadi';
    case 'auth/wrong-password':
      return 'Noto\'g\'ri parol kiritildi';
    case 'auth/email-already-in-use':
      return 'Bu email allaqachon ro\'yxatdan o\'tgan';
    case 'auth/weak-password':
      return 'Parol juda zaif. Kamida 6 ta belgi kiriting';
    case 'auth/invalid-email':
      return 'Noto\'g\'ri email format';
    case 'auth/too-many-requests':
      return 'Juda ko\'p urinish. Keyinroq qayta urinib ko\'ring';
    case 'auth/network-request-failed':
      return 'Internet aloqasi bilan muammo';
    case 'auth/user-disabled':
      return 'Bu hisob bloklangan';
    default:
      return 'Noma\'lum xato yuz berdi';
  }
};

export default useFirebaseAuth;