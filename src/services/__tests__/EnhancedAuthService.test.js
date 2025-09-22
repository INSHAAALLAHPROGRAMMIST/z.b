// Enhanced Authentication Service Test Suite
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
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
import enhancedAuthService from '../EnhancedAuthService';
import cloudinaryService from '../CloudinaryService';

// Mock Firebase modules
vi.mock('firebase/auth');
vi.mock('firebase/firestore');
vi.mock('../CloudinaryService');
const mockAuth = { currentUser: null };
const mockDb = {};

vi.mock('../firebaseConfig', () => ({
  auth: mockAuth,
  db: mockDb,
  COLLECTIONS: {
    USERS: 'users'
  }
}));

describe('EnhancedAuthService', () => {
  let mockUser;
  let mockUserCredential;
  let mockUserProfile;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: false
    };

    mockUserCredential = {
      user: mockUser
    };

    mockUserProfile = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      fullName: 'Test User Full',
      phone: '+998901234567',
      address: 'Test Address',
      telegramUsername: 'testuser',
      isActive: true,
      isVerified: false,
      role: 'user',
      isAdmin: false,
      loginCount: 0,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock Firestore functions
    serverTimestamp.mockReturnValue(new Date());
    increment.mockImplementation((value) => ({ increment: value }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('should register user successfully with complete profile', async () => {
      // Mock Firebase Auth
      createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      updateProfile.mockResolvedValue();
      sendEmailVerification.mockResolvedValue();

      // Mock Firestore
      setDoc.mockResolvedValue();

      // Mock Cloudinary (no image upload)
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        fullName: 'Test User Full',
        phone: '+998901234567',
        address: 'Test Address',
        telegramUsername: 'testuser'
      };

      const result = await enhancedAuthService.registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.user.uid).toBe('test-user-id');
      expect(result.user.email).toBe('test@example.com');
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        enhancedAuthService.auth,
        'test@example.com',
        'password123'
      );
      expect(updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'Test User'
      });
      expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
      expect(setDoc).toHaveBeenCalled();
    });

    it('should register user with profile image upload', async () => {
      // Mock Firebase Auth
      createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      updateProfile.mockResolvedValue();
      sendEmailVerification.mockResolvedValue();
      setDoc.mockResolvedValue();

      // Mock Cloudinary image upload
      const mockFile = new File(['test'], 'profile.jpg', { type: 'image/jpeg' });
      cloudinaryService.uploadImage.mockResolvedValue({
        success: true,
        data: {
          url: 'https://cloudinary.com/profile.jpg',
          publicId: 'profile-123'
        }
      });
      cloudinaryService.getOptimizedUrl.mockReturnValue('https://cloudinary.com/profile-thumb.jpg');

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        fullName: 'Test User Full',
        phone: '+998901234567',
        address: 'Test Address',
        telegramUsername: 'testuser',
        profileImage: mockFile
      };

      const result = await enhancedAuthService.registerUser(userData);

      expect(result.success).toBe(true);
      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          folder: 'zamon-books/profiles',
          tags: ['user-profile', 'test-user-id']
        })
      );
    });

    it('should handle registration errors', async () => {
      const authError = new Error('Email already in use');
      authError.code = 'auth/email-already-in-use';
      
      createUserWithEmailAndPassword.mockRejectedValue(authError);

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        fullName: 'Test User Full'
      };

      const result = await enhancedAuthService.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('auth/email-already-in-use');
      expect(result.message).toContain('allaqachon');
    });
  });

  describe('loginUser', () => {
    it('should login user successfully', async () => {
      // Mock Firebase Auth
      signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      // Mock getUserProfile
      const mockGetDoc = vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => mockUserProfile,
        id: 'test-user-id'
      });
      getDoc.mockImplementation(mockGetDoc);

      // Mock updateLoginStats
      updateDoc.mockResolvedValue();

      const result = await enhancedAuthService.loginUser('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user.uid).toBe('test-user-id');
      expect(result.user.email).toBe('test@example.com');
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        enhancedAuthService.auth,
        'test@example.com',
        'password123'
      );
    });

    it('should handle login errors', async () => {
      const authError = new Error('Wrong password');
      authError.code = 'auth/wrong-password';
      
      signInWithEmailAndPassword.mockRejectedValue(authError);

      const result = await enhancedAuthService.loginUser('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('auth/wrong-password');
      expect(result.message).toContain('parol');
    });
  });

  describe('logoutUser', () => {
    it('should logout user successfully', async () => {
      // Mock current user
      mockAuth.currentUser = mockUser;
      
      signOut.mockResolvedValue();
      setDoc.mockResolvedValue(); // For activity logging

      const result = await enhancedAuthService.logoutUser();

      expect(result.success).toBe(true);
      expect(signOut).toHaveBeenCalledWith(mockAuth);
    });

    it('should handle logout errors', async () => {
      const logoutError = new Error('Logout failed');
      signOut.mockRejectedValue(logoutError);

      const result = await enhancedAuthService.logoutUser();

      expect(result.success).toBe(false);
      expect(result.error).toBe('logout_failed');
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email successfully', async () => {
      sendPasswordResetEmail.mockResolvedValue();
      
      // Mock user query for logging
      const mockQuerySnapshot = {
        empty: false,
        docs: [{ id: 'test-user-id' }]
      };
      getDocs.mockResolvedValue(mockQuerySnapshot);
      setDoc.mockResolvedValue(); // For activity logging

      const result = await enhancedAuthService.sendPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        enhancedAuthService.auth,
        'test@example.com'
      );
    });

    it('should handle password reset errors', async () => {
      const resetError = new Error('User not found');
      resetError.code = 'auth/user-not-found';
      
      sendPasswordResetEmail.mockRejectedValue(resetError);

      const result = await enhancedAuthService.sendPasswordReset('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('auth/user-not-found');
    });
  });

  describe('updateUserPassword', () => {
    it('should update password successfully', async () => {
      // Mock current user
      mockAuth.currentUser = mockUser;
      
      reauthenticateWithCredential.mockResolvedValue();
      updatePassword.mockResolvedValue();
      setDoc.mockResolvedValue(); // For activity logging

      const result = await enhancedAuthService.updateUserPassword('oldpassword', 'newpassword123');

      expect(result.success).toBe(true);
      expect(reauthenticateWithCredential).toHaveBeenCalled();
      expect(updatePassword).toHaveBeenCalledWith(mockUser, 'newpassword123');
    });

    it('should handle password update errors', async () => {
      mockAuth.currentUser = mockUser;
      
      const authError = new Error('Wrong password');
      authError.code = 'auth/wrong-password';
      
      reauthenticateWithCredential.mockRejectedValue(authError);

      const result = await enhancedAuthService.updateUserPassword('wrongpassword', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('auth/wrong-password');
    });
  });

  describe('updateUserProfile', () => {
    it('should update profile successfully', async () => {
      // Mock current user
      mockAuth.currentUser = mockUser;
      
      // Mock getUserProfile
      const mockGetDoc = vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => mockUserProfile,
        id: 'test-user-id'
      });
      getDoc.mockImplementation(mockGetDoc);

      updateProfile.mockResolvedValue();
      updateDoc.mockResolvedValue();
      setDoc.mockResolvedValue(); // For activity logging

      const updates = {
        displayName: 'Updated Name',
        phone: '+998901234568'
      };

      const result = await enhancedAuthService.updateUserProfile('test-user-id', updates);

      expect(result.success).toBe(true);
      expect(updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'Updated Name'
      });
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should update profile with new image', async () => {
      mockAuth.currentUser = mockUser;
      
      // Mock getUserProfile
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockUserProfile,
        id: 'test-user-id'
      });

      // Mock Cloudinary upload
      const mockFile = new File(['test'], 'new-profile.jpg', { type: 'image/jpeg' });
      cloudinaryService.uploadImage.mockResolvedValue({
        success: true,
        data: {
          url: 'https://cloudinary.com/new-profile.jpg',
          publicId: 'new-profile-123'
        }
      });
      cloudinaryService.getOptimizedUrl.mockReturnValue('https://cloudinary.com/new-profile-thumb.jpg');
      cloudinaryService.deleteImage.mockResolvedValue();

      updateDoc.mockResolvedValue();
      setDoc.mockResolvedValue();

      const updates = {
        displayName: 'Updated Name',
        profileImage: mockFile
      };

      const result = await enhancedAuthService.updateUserProfile('test-user-id', updates);

      expect(result.success).toBe(true);
      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          folder: 'zamon-books/profiles'
        })
      );
    });

    it('should handle unauthorized profile update', async () => {
      // Mock different user
      mockAuth.currentUser = { uid: 'different-user-id' };

      const result = await enhancedAuthService.updateUserProfile('test-user-id', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('profile_update_failed');
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const mockGetDoc = vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => mockUserProfile,
        id: 'test-user-id'
      });
      getDoc.mockImplementation(mockGetDoc);

      const result = await enhancedAuthService.getUserProfile('test-user-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-user-id');
      expect(result.email).toBe('test@example.com');
      expect(result.isProfileComplete).toBeDefined();
    });

    it('should return null for non-existent user', async () => {
      const mockGetDoc = vi.fn().mockResolvedValue({
        exists: () => false
      });
      getDoc.mockImplementation(mockGetDoc);

      const result = await enhancedAuthService.getUserProfile('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('getUserActivityHistory', () => {
    it('should get user activity history successfully', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          userId: 'test-user-id',
          activityType: 'login',
          timestamp: { toDate: () => new Date() },
          metadata: { method: 'email' }
        },
        {
          id: 'activity-2',
          userId: 'test-user-id',
          activityType: 'profile_update',
          timestamp: { toDate: () => new Date() },
          metadata: { updatedFields: ['displayName'] }
        }
      ];

      const mockQuerySnapshot = {
        forEach: (callback) => {
          mockActivities.forEach((activity) => {
            callback({
              id: activity.id,
              data: () => activity
            });
          });
        }
      };

      getDocs.mockResolvedValue(mockQuerySnapshot);

      const result = await enhancedAuthService.getUserActivityHistory('test-user-id');

      expect(result.success).toBe(true);
      expect(result.activities).toHaveLength(2);
      expect(result.activities[0].activityType).toBe('login');
    });

    it('should handle activity history errors', async () => {
      getDocs.mockRejectedValue(new Error('Database error'));

      const result = await enhancedAuthService.getUserActivityHistory('test-user-id');

      expect(result.success).toBe(false);
      expect(result.activities).toHaveLength(0);
    });
  });

  describe('getUserLoginStats', () => {
    it('should get user login stats successfully', async () => {
      // Mock getUserProfile
      const mockGetDoc = vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...mockUserProfile,
          loginCount: 5,
          lastLoginAt: { toDate: () => new Date() },
          createdAt: { toDate: () => new Date() }
        }),
        id: 'test-user-id'
      });
      getDoc.mockImplementation(mockGetDoc);

      // Mock getUserActivityHistory
      const mockActivityHistory = {
        success: true,
        activities: [
          { activityType: 'login', timestamp: new Date() }
        ]
      };

      // Temporarily mock the method
      const originalMethod = enhancedAuthService.getUserActivityHistory;
      enhancedAuthService.getUserActivityHistory = vi.fn().mockResolvedValue(mockActivityHistory);

      const result = await enhancedAuthService.getUserLoginStats('test-user-id');

      expect(result.success).toBe(true);
      expect(result.stats.totalLogins).toBe(5);
      expect(result.stats.recentLogins).toHaveLength(1);

      // Restore original method
      enhancedAuthService.getUserActivityHistory = originalMethod;
    });
  });

  describe('checkProfileCompleteness', () => {
    it('should check complete profile', () => {
      const completeProfile = {
        displayName: 'Test User',
        fullName: 'Test User Full',
        phone: '+998901234567',
        address: 'Test Address',
        telegramUsername: 'testuser',
        profileImage: { url: 'https://example.com/image.jpg' }
      };

      const result = enhancedAuthService.checkProfileCompleteness(completeProfile);

      expect(result.percentage).toBe(100);
      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should check incomplete profile', () => {
      const incompleteProfile = {
        displayName: 'Test User',
        fullName: '',
        phone: '',
        address: 'Test Address'
      };

      const result = enhancedAuthService.checkProfileCompleteness(incompleteProfile);

      expect(result.percentage).toBeLessThan(100);
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('fullName');
      expect(result.missingFields).toContain('phone');
    });
  });

  describe('getAuthErrorMessage', () => {
    it('should return correct error messages', () => {
      expect(enhancedAuthService.getAuthErrorMessage('auth/user-not-found'))
        .toContain('topilmadi');
      expect(enhancedAuthService.getAuthErrorMessage('auth/wrong-password'))
        .toContain('parol');
      expect(enhancedAuthService.getAuthErrorMessage('auth/email-already-in-use'))
        .toContain('allaqachon');
      expect(enhancedAuthService.getAuthErrorMessage('unknown-error'))
        .toContain('Noma\'lum xato');
    });
  });
});