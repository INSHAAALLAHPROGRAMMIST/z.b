// Enhanced Authentication Hook
// Provides comprehensive authentication state management and operations

import { useState, useEffect, useCallback, useRef } from 'react';
import enhancedAuthService from '../services/EnhancedAuthService';
import { toastMessages } from '../utils/toastUtils';

const useEnhancedAuth = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState(null);

  const mountedRef = useRef(true);
  const authStateListenerRef = useRef(null);

  // Load user profile from Firestore
  const loadUserProfile = useCallback(async (uid) => {
    if (!uid || !mountedRef.current) return;

    try {
      const profile = await enhancedAuthService.getUserProfile(uid);
      if (mountedRef.current && profile) {
        setUserProfile(profile);
        setIsAdmin(profile.isAdmin || false);
        setProfileCompleteness(profile.isProfileComplete || null);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      if (mountedRef.current) {
        setUserProfile(null);
        setIsAdmin(false);
        setProfileCompleteness(null);
      }
    }
  }, []);

  // Enhanced sign up with profile completion
  const signUp = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const result = await enhancedAuthService.registerUser(userData);

      if (result.success) {
        // Profile will be loaded by auth state listener
        toastMessages.registerSuccess();
        return result;
      } else {
        setError(result.message);
        toastMessages.registerError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error signing up:', err);
      const errorMessage = err.message || 'Ro\'yxatdan o\'tishda xato yuz berdi';
      setError(errorMessage);
      toastMessages.registerError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced sign in with activity tracking
  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const result = await enhancedAuthService.loginUser(email, password);

      if (result.success) {
        // Profile will be loaded by auth state listener
        toastMessages.loginSuccess();
        return result;
      } else {
        setError(result.message);
        toastMessages.loginError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error signing in:', err);
      const errorMessage = err.message || 'Tizimga kirishda xato yuz berdi';
      setError(errorMessage);
      toastMessages.loginError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Social login with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await enhancedAuthService.signInWithGoogle();

      if (result.success) {
        // Profile will be loaded by auth state listener
        toastMessages.loginSuccess();
        return result;
      } else {
        setError(result.message);
        toastMessages.loginError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error signing in with Google:', err);
      const errorMessage = err.message || 'Google orqali kirishda xato yuz berdi';
      setError(errorMessage);
      toastMessages.loginError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Social login with Facebook
  const signInWithFacebook = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await enhancedAuthService.signInWithFacebook();

      if (result.success) {
        // Profile will be loaded by auth state listener
        toastMessages.loginSuccess();
        return result;
      } else {
        setError(result.message);
        toastMessages.loginError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error signing in with Facebook:', err);
      const errorMessage = err.message || 'Facebook orqali kirishda xato yuz berdi';
      setError(errorMessage);
      toastMessages.loginError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Link social account
  const linkSocialAccount = useCallback(async (provider) => {
    try {
      setError(null);
      const result = await enhancedAuthService.linkSocialAccount(provider);

      if (result.success) {
        toastMessages.profileUpdateSuccess();
        return result;
      } else {
        setError(result.message);
        toastMessages.profileUpdateError();
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error linking social account:', err);
      const errorMessage = err.message || 'Hisobni bog\'lashda xato yuz berdi';
      setError(errorMessage);
      toastMessages.profileUpdateError();
      throw new Error(errorMessage);
    }
  }, []);

  // Enhanced sign out with activity tracking
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const result = await enhancedAuthService.logoutUser();

      if (result.success) {
        if (mountedRef.current) {
          setUser(null);
          setUserProfile(null);
          setIsAdmin(false);
          setProfileCompleteness(null);
          setError(null);
        }

        // Clear local storage
        localStorage.removeItem('currentUserId');
        sessionStorage.removeItem('auth_session_id');
        
        toastMessages.logoutSuccess();
        return result;
      } else {
        throw new Error(result.message);
      }
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
      const result = await enhancedAuthService.sendPasswordReset(email);

      if (result.success) {
        toastMessages.passwordResetSent();
        return result;
      } else {
        setError(result.message);
        toastMessages.passwordResetError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error sending password reset:', err);
      const errorMessage = err.message || 'Parol tiklashda xato yuz berdi';
      setError(errorMessage);
      toastMessages.passwordResetError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Update user password
  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      setError(null);
      const result = await enhancedAuthService.updateUserPassword(currentPassword, newPassword);

      if (result.success) {
        toastMessages.passwordUpdateSuccess();
        return result;
      } else {
        setError(result.message);
        toastMessages.passwordUpdateError(result.message);
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error updating password:', err);
      const errorMessage = err.message || 'Parol yangilashda xato yuz berdi';
      setError(errorMessage);
      toastMessages.passwordUpdateError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Enhanced profile update with image upload
  const updateProfile = useCallback(async (updates) => {
    if (!user || !mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      const result = await enhancedAuthService.updateUserProfile(user.uid, updates);

      if (result.success) {
        if (mountedRef.current) {
          setUserProfile(result.profile);
          setProfileCompleteness(result.profile.isProfileComplete || null);
        }
        toastMessages.profileUpdateSuccess();
        return result;
      } else {
        setError(result.message);
        toastMessages.profileUpdateError();
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err.message || 'Profil yangilashda xato yuz berdi';
      setError(errorMessage);
      toastMessages.profileUpdateError();
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get user activity history
  const getUserActivityHistory = useCallback(async (options = {}) => {
    if (!user) return { success: false, activities: [] };

    try {
      return await enhancedAuthService.getUserActivityHistory(user.uid, options);
    } catch (err) {
      console.error('Error getting activity history:', err);
      return { success: false, activities: [], error: err.message };
    }
  }, [user]);

  // Get user login statistics
  const getUserLoginStats = useCallback(async () => {
    if (!user) return { success: false, stats: null };

    try {
      return await enhancedAuthService.getUserLoginStats(user.uid);
    } catch (err) {
      console.error('Error getting login stats:', err);
      return { success: false, stats: null, error: err.message };
    }
  }, [user]);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;

    try {
      await loadUserProfile(user.uid);
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  }, [user, loadUserProfile]);

  // Check if profile is complete
  const isProfileComplete = useCallback(() => {
    return profileCompleteness?.isComplete || false;
  }, [profileCompleteness]);

  // Get profile completion percentage
  const getProfileCompletionPercentage = useCallback(() => {
    return profileCompleteness?.percentage || 0;
  }, [profileCompleteness]);

  // Get missing profile fields
  const getMissingProfileFields = useCallback(() => {
    return profileCompleteness?.missingFields || [];
  }, [profileCompleteness]);

  // Auth state listener
  useEffect(() => {
    if (authStateListenerRef.current) {
      authStateListenerRef.current();
    }

    authStateListenerRef.current = enhancedAuthService.onAuthStateChanged(async (firebaseUser) => {
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
        setProfileCompleteness(null);
        localStorage.removeItem('currentUserId');
      }
      
      if (mountedRef.current) {
        setLoading(false);
      }
    });

    return () => {
      if (authStateListenerRef.current) {
        authStateListenerRef.current();
      }
    };
  }, [loadUserProfile]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    // User state
    user,
    userProfile,
    loading,
    error,
    isAdmin,
    isAuthenticated: !!user,
    profileCompleteness,

    // Authentication methods
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithFacebook,
    linkSocialAccount,
    resetPassword,
    updatePassword,

    // Profile management
    updateProfile,
    refreshProfile,
    isProfileComplete,
    getProfileCompletionPercentage,
    getMissingProfileFields,

    // Activity tracking
    getUserActivityHistory,
    getUserLoginStats,

    // Utility methods
    clearError: () => setError(null),
    getCurrentUser: () => enhancedAuthService.getCurrentUser(),
    isUserAuthenticated: () => enhancedAuthService.isAuthenticated()
  };
};

export default useEnhancedAuth;