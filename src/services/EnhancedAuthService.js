// Enhanced Authentication Service
// Provides comprehensive user authentication and profile management

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  linkWithCredential
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '../firebaseConfig';
import cloudinaryService from './CloudinaryService';

class EnhancedAuthService {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.collections = COLLECTIONS;
  }

  /**
   * Enhanced user registration with profile completion
   * Requirements: 8.1, 8.2
   */
  async registerUser(userData) {
    try {
      const { 
        email, 
        password, 
        displayName, 
        fullName, 
        phone, 
        address, 
        telegramUsername,
        profileImage = null,
        preferences = {}
      } = userData;

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName || fullName
      });

      // Handle profile image upload if provided
      let profileImageData = null;
      if (profileImage) {
        try {
          const uploadResult = await cloudinaryService.uploadImage(profileImage, {
            folder: 'zamon-books/profiles',
            tags: ['user-profile', user.uid],
            transformation: {
              width: 300,
              height: 300,
              crop: 'fill',
              gravity: 'face',
              radius: 'max'
            }
          });

          if (uploadResult.success) {
            profileImageData = {
              url: uploadResult.data.url,
              publicId: uploadResult.data.publicId,
              thumbnail: cloudinaryService.getOptimizedUrl(uploadResult.data.publicId, {
                width: 100,
                height: 100,
                crop: 'fill',
                gravity: 'face',
                radius: 'max'
              })
            };
          }
        } catch (imageError) {
          console.error('Profile image upload failed:', imageError);
          // Continue registration without profile image
        }
      }

      // Create comprehensive user profile in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || fullName,
        fullName: fullName || displayName,
        phone: phone || '',
        address: address || '',
        telegramUsername: telegramUsername || '',
        
        // Profile image data
        profileImage: profileImageData,
        
        // User preferences
        preferences: {
          language: 'uz',
          theme: 'dark',
          notifications: {
            email: true,
            telegram: false,
            orderUpdates: true,
            promotions: false
          },
          ...preferences
        },
        
        // User status and role
        isActive: true,
        isVerified: false,
        role: 'user',
        isAdmin: false,
        
        // Activity tracking
        loginCount: 0,
        lastLoginAt: null,
        registrationMethod: 'email',
        
        // Order and purchase history
        totalOrders: 0,
        totalSpent: 0,
        favoriteGenres: [],
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerifiedAt: null
      };

      // Save user profile to Firestore
      await setDoc(doc(this.db, this.collections.USERS, user.uid), userProfile);

      // Send email verification
      await sendEmailVerification(user);

      // Log registration activity
      await this.logUserActivity(user.uid, 'registration', {
        method: 'email',
        hasProfileImage: !!profileImageData
      });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: userProfile.displayName,
          emailVerified: user.emailVerified,
          profile: userProfile
        },
        message: 'Ro\'yxatdan o\'tish muvaffaqiyatli! Email tasdiqlash xabari yuborildi.'
      };

    } catch (error) {
      console.error('Enhanced registration error:', error);
      return {
        success: false,
        error: error.code || 'registration_failed',
        message: this.getAuthErrorMessage(error.code) || error.message
      };
    }
  }

  /**
   * Enhanced user login with activity tracking
   * Requirements: 8.1, 8.2
   */
  async loginUser(email, password) {
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore
      const userProfile = await this.getUserProfile(user.uid);

      // Update login statistics
      await this.updateLoginStats(user.uid);

      // Log login activity
      await this.logUserActivity(user.uid, 'login', {
        method: 'email',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          profile: userProfile
        },
        message: 'Tizimga muvaffaqiyatli kirdingiz!'
      };

    } catch (error) {
      console.error('Enhanced login error:', error);
      
      // Log failed login attempt
      try {
        await this.logFailedLoginAttempt(email, error.code);
      } catch (logError) {
        console.error('Failed to log login attempt:', logError);
      }

      return {
        success: false,
        error: error.code || 'login_failed',
        message: this.getAuthErrorMessage(error.code) || error.message
      };
    }
  }

  /**
   * Enhanced user logout with activity tracking
   * Requirements: 8.1
   */
  async logoutUser() {
    try {
      const currentUser = this.auth.currentUser;
      
      if (currentUser) {
        // Log logout activity
        await this.logUserActivity(currentUser.uid, 'logout', {
          timestamp: new Date().toISOString()
        });
      }

      await signOut(this.auth);

      return {
        success: true,
        message: 'Tizimdan muvaffaqiyatli chiqdingiz!'
      };

    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.code || 'logout_failed',
        message: 'Chiqishda xato yuz berdi'
      };
    }
  }

  /**
   * Send password reset email
   * Requirements: 8.3
   */
  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(this.auth, email);

      // Log password reset request
      try {
        const userQuery = query(
          collection(this.db, this.collections.USERS),
          where('email', '==', email),
          limit(1)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userId = userSnapshot.docs[0].id;
          await this.logUserActivity(userId, 'password_reset_request', {
            email,
            timestamp: new Date().toISOString()
          });
        }
      } catch (logError) {
        console.error('Failed to log password reset:', logError);
      }

      return {
        success: true,
        message: 'Parol tiklash xabari emailingizga yuborildi!'
      };

    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.code || 'password_reset_failed',
        message: this.getAuthErrorMessage(error.code) || 'Parol tiklashda xato yuz berdi'
      };
    }
  }

  /**
   * Update user password
   * Requirements: 8.3
   */
  async updateUserPassword(currentPassword, newPassword) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      // Log password change
      await this.logUserActivity(user.uid, 'password_change', {
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Parol muvaffaqiyatli yangilandi!'
      };

    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: error.code || 'password_update_failed',
        message: this.getAuthErrorMessage(error.code) || 'Parol yangilashda xato yuz berdi'
      };
    }
  }

  /**
   * Enhanced profile management with image upload
   * Requirements: 8.1, 8.2
   */
  async updateUserProfile(userId, updates) {
    try {
      const user = this.auth.currentUser;
      if (!user || user.uid !== userId) {
        throw new Error('Unauthorized profile update');
      }

      let processedUpdates = { ...updates };

      // Handle profile image upload
      if (updates.profileImage && updates.profileImage instanceof File) {
        try {
          // Get current profile to delete old image if exists
          const currentProfile = await this.getUserProfile(userId);
          
          // Upload new profile image
          const uploadResult = await cloudinaryService.uploadImage(updates.profileImage, {
            folder: 'zamon-books/profiles',
            tags: ['user-profile', userId],
            transformation: {
              width: 300,
              height: 300,
              crop: 'fill',
              gravity: 'face',
              radius: 'max'
            }
          });

          if (uploadResult.success) {
            processedUpdates.profileImage = {
              url: uploadResult.data.url,
              publicId: uploadResult.data.publicId,
              thumbnail: cloudinaryService.getOptimizedUrl(uploadResult.data.publicId, {
                width: 100,
                height: 100,
                crop: 'fill',
                gravity: 'face',
                radius: 'max'
              })
            };

            // Delete old profile image if exists
            if (currentProfile?.profileImage?.publicId) {
              try {
                await cloudinaryService.deleteImage(currentProfile.profileImage.publicId);
              } catch (deleteError) {
                console.error('Failed to delete old profile image:', deleteError);
              }
            }
          }
        } catch (imageError) {
          console.error('Profile image upload failed:', imageError);
          // Remove profileImage from updates if upload failed
          delete processedUpdates.profileImage;
        }
      }

      // Update Firebase Auth profile if displayName changed
      if (processedUpdates.displayName && processedUpdates.displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: processedUpdates.displayName
        });
      }

      // Update Firestore profile
      const updateData = {
        ...processedUpdates,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(this.db, this.collections.USERS, userId), updateData);

      // Get updated profile
      const updatedProfile = await this.getUserProfile(userId);

      // Log profile update
      await this.logUserActivity(userId, 'profile_update', {
        updatedFields: Object.keys(processedUpdates),
        hasNewImage: !!(processedUpdates.profileImage?.url)
      });

      return {
        success: true,
        profile: updatedProfile,
        message: 'Profil muvaffaqiyatli yangilandi!'
      };

    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: error.code || 'profile_update_failed',
        message: 'Profil yangilashda xato yuz berdi'
      };
    }
  }

  /**
   * Get user profile with enhanced data
   * Requirements: 8.1, 8.2
   */
  async getUserProfile(userId) {
    try {
      const userDoc = await getDoc(doc(this.db, this.collections.USERS, userId));
      
      if (userDoc.exists()) {
        const profile = userDoc.data();
        
        // Add computed fields
        return {
          ...profile,
          id: userDoc.id,
          isProfileComplete: this.checkProfileCompleteness(profile),
          memberSince: profile.createdAt?.toDate?.() || null,
          lastActive: profile.lastLoginAt?.toDate?.() || null
        };
      } else {
        return null;
      }

    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Foydalanuvchi profili yuklanmadi');
    }
  }

  /**
   * Update user login statistics
   * Requirements: 8.4
   */
  async updateLoginStats(userId) {
    try {
      const userRef = doc(this.db, this.collections.USERS, userId);
      await updateDoc(userRef, {
        loginCount: increment(1),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating login stats:', error);
      // Don't throw error for stats update
    }
  }

  /**
   * Log user activity for tracking and analytics
   * Requirements: 8.4
   */
  async logUserActivity(userId, activityType, metadata = {}) {
    try {
      const activityData = {
        userId,
        activityType,
        metadata,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        ipAddress: null, // Would be set by server-side function
        sessionId: this.getSessionId()
      };

      await setDoc(
        doc(collection(this.db, 'user_activities')), 
        activityData
      );
    } catch (error) {
      console.error('Error logging user activity:', error);
      // Don't throw error for activity logging
    }
  }

  /**
   * Log failed login attempts for security
   * Requirements: 8.4
   */
  async logFailedLoginAttempt(email, errorCode) {
    try {
      const attemptData = {
        email,
        errorCode,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        ipAddress: null, // Would be set by server-side function
        sessionId: this.getSessionId()
      };

      await setDoc(
        doc(collection(this.db, 'failed_login_attempts')), 
        attemptData
      );
    } catch (error) {
      console.error('Error logging failed login attempt:', error);
    }
  }

  /**
   * Get user activity history
   * Requirements: 8.4
   */
  async getUserActivityHistory(userId, options = {}) {
    try {
      const {
        limitCount = 50,
        activityTypes = null,
        startDate = null,
        endDate = null
      } = options;

      let q = query(
        collection(this.db, 'user_activities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      // Add activity type filter if specified
      if (activityTypes && Array.isArray(activityTypes)) {
        q = query(q, where('activityType', 'in', activityTypes));
      }

      const snapshot = await getDocs(q);
      const activities = [];

      snapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || null
        });
      });

      return {
        success: true,
        activities,
        count: activities.length
      };

    } catch (error) {
      console.error('Error getting user activity history:', error);
      return {
        success: false,
        activities: [],
        count: 0,
        error: error.message
      };
    }
  }

  /**
   * Get user login statistics
   * Requirements: 8.4
   */
  async getUserLoginStats(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (!profile) {
        throw new Error('User profile not found');
      }

      // Get recent login activities
      const recentLogins = await this.getUserActivityHistory(userId, {
        activityTypes: ['login'],
        limitCount: 10
      });

      return {
        success: true,
        stats: {
          totalLogins: profile.loginCount || 0,
          lastLoginAt: profile.lastActive,
          memberSince: profile.memberSince,
          recentLogins: recentLogins.activities || []
        }
      };

    } catch (error) {
      console.error('Error getting login stats:', error);
      return {
        success: false,
        stats: null,
        error: error.message
      };
    }
  }

  /**
   * Check if user profile is complete
   * @private
   */
  checkProfileCompleteness(profile) {
    const requiredFields = ['displayName', 'fullName', 'phone', 'address'];
    const optionalFields = ['telegramUsername', 'profileImage'];
    
    let completeness = 0;
    const totalFields = requiredFields.length + optionalFields.length;

    // Check required fields
    requiredFields.forEach(field => {
      if (profile[field] && profile[field].trim()) {
        completeness += 1;
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      if (field === 'profileImage') {
        if (profile[field]?.url) completeness += 1;
      } else if (profile[field] && profile[field].trim()) {
        completeness += 1;
      }
    });

    return {
      percentage: Math.round((completeness / totalFields) * 100),
      missingFields: requiredFields.filter(field => !profile[field] || !profile[field].trim()),
      isComplete: completeness >= requiredFields.length
    };
  }

  /**
   * Get session ID for tracking
   * @private
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('auth_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('auth_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get user-friendly error messages
   * @private
   */
  getAuthErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'Bunday email bilan foydalanuvchi topilmadi',
      'auth/wrong-password': 'Noto\'g\'ri parol kiritildi',
      'auth/email-already-in-use': 'Bu email allaqachon ro\'yxatdan o\'tgan',
      'auth/weak-password': 'Parol juda zaif. Kamida 6 ta belgi kiriting',
      'auth/invalid-email': 'Noto\'g\'ri email format',
      'auth/too-many-requests': 'Juda ko\'p urinish. Keyinroq qayta urinib ko\'ring',
      'auth/network-request-failed': 'Internet aloqasi bilan muammo',
      'auth/user-disabled': 'Bu hisob bloklangan',
      'auth/requires-recent-login': 'Bu amal uchun qaytadan tizimga kirish kerak',
      'auth/invalid-credential': 'Noto\'g\'ri login ma\'lumotlari'
    };
    
    return errorMessages[errorCode] || 'Noma\'lum xato yuz berdi';
  }

  /**
   * Setup auth state listener
   * Requirements: 8.1
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Social login with Google
   * Requirements: 8.1, 8.2
   */
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      // Create or update user profile
      await this.syncSocialUser(user, 'google');

      // Log login activity
      await this.logUserActivity(user.uid, 'login', {
        method: 'google',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        },
        message: 'Google orqali muvaffaqiyatli kirdingiz!'
      };

    } catch (error) {
      console.error('Google login error:', error);
      return {
        success: false,
        error: error.code || 'google_login_failed',
        message: this.getAuthErrorMessage(error.code) || 'Google orqali kirishda xato yuz berdi'
      };
    }
  }

  /**
   * Social login with Facebook
   * Requirements: 8.1, 8.2
   */
  async signInWithFacebook() {
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');

      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      // Create or update user profile
      await this.syncSocialUser(user, 'facebook');

      // Log login activity
      await this.logUserActivity(user.uid, 'login', {
        method: 'facebook',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        },
        message: 'Facebook orqali muvaffaqiyatli kirdingiz!'
      };

    } catch (error) {
      console.error('Facebook login error:', error);
      return {
        success: false,
        error: error.code || 'facebook_login_failed',
        message: this.getAuthErrorMessage(error.code) || 'Facebook orqali kirishda xato yuz berdi'
      };
    }
  }

  /**
   * Link social account to existing account
   * Requirements: 8.1, 8.2
   */
  async linkSocialAccount(provider) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      let authProvider;
      if (provider === 'google') {
        authProvider = new GoogleAuthProvider();
      } else if (provider === 'facebook') {
        authProvider = new FacebookAuthProvider();
      } else {
        throw new Error('Unsupported provider');
      }

      const result = await linkWithCredential(user, authProvider);

      // Log account linking
      await this.logUserActivity(user.uid, 'account_link', {
        provider,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `${provider} hisobi muvaffaqiyatli bog'landi!`
      };

    } catch (error) {
      console.error('Account linking error:', error);
      return {
        success: false,
        error: error.code || 'account_link_failed',
        message: this.getAuthErrorMessage(error.code) || 'Hisobni bog\'lashda xato yuz berdi'
      };
    }
  }

  /**
   * Sync social user data to Firestore
   * @private
   */
  async syncSocialUser(user, provider) {
    try {
      const userRef = doc(this.db, this.collections.USERS, user.uid);
      const userSnap = await getDoc(userRef);

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        updatedAt: serverTimestamp()
      };

      if (userSnap.exists()) {
        // Update existing user
        await updateDoc(userRef, userData);
      } else {
        // Create new user profile
        const newUserData = {
          ...userData,
          fullName: user.displayName || '',
          phone: '',
          address: '',
          telegramUsername: '',
          
          // Profile image from social provider
          profileImage: user.photoURL ? {
            url: user.photoURL,
            publicId: null, // Social provider image
            thumbnail: user.photoURL
          } : null,
          
          // User preferences
          preferences: {
            language: 'uz',
            theme: 'dark',
            notifications: {
              email: true,
              telegram: false,
              orderUpdates: true,
              promotions: false
            }
          },
          
          // User status and role
          isActive: true,
          isVerified: user.emailVerified,
          role: 'user',
          isAdmin: false,
          
          // Activity tracking
          loginCount: 1,
          lastLoginAt: serverTimestamp(),
          registrationMethod: provider,
          
          // Order and purchase history
          totalOrders: 0,
          totalSpent: 0,
          favoriteGenres: [],
          
          // Timestamps
          createdAt: serverTimestamp()
        };

        await setDoc(userRef, newUserData);
      }

      // Update login stats
      await this.updateLoginStats(user.uid);

    } catch (error) {
      console.error('Error syncing social user:', error);
      // Don't throw error for sync issues
    }
  }

  /**
   * Get current user
   * Requirements: 8.1
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Check if user is authenticated
   * Requirements: 8.1
   */
  isAuthenticated() {
    return !!this.auth.currentUser;
  }
}

// Singleton instance
const enhancedAuthService = new EnhancedAuthService();

export default enhancedAuthService;