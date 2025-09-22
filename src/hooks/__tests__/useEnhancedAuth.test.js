// Enhanced Authentication Hook Test Suite
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useEnhancedAuth from '../useEnhancedAuth';
import enhancedAuthService from '../../services/EnhancedAuthService';
import { toastMessages } from '../../utils/toastUtils';

// Mock dependencies
vi.mock('../../services/EnhancedAuthService');
vi.mock('../../utils/toastUtils', () => ({
  toastMessages: {
    loginSuccess: vi.fn(),
    loginError: vi.fn(),
    registerSuccess: vi.fn(),
    registerError: vi.fn(),
    logoutSuccess: vi.fn(),
    logoutError: vi.fn(),
    passwordResetSent: vi.fn(),
    passwordResetError: vi.fn(),
    passwordUpdateSuccess: vi.fn(),
    passwordUpdateError: vi.fn(),
    profileUpdateSuccess: vi.fn(),
    profileUpdateError: vi.fn()
  }
}));

describe('useEnhancedAuth', () => {
  let mockUser;
  let mockUserProfile;
  let mockAuthStateCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUser = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      emailVerified: false
    };

    mockUserProfile = {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      fullName: 'Test User Full',
      phone: '+998901234567',
      address: 'Test Address',
      telegramUsername: 'testuser',
      isAdmin: false,
      isProfileComplete: {
        percentage: 100,
        isComplete: true,
        missingFields: []
      },
      memberSince: new Date(),
      lastActive: new Date()
    };

    // Mock auth state listener
    enhancedAuthService.onAuthStateChanged.mockImplementation((callback) => {
      mockAuthStateCallback = callback;
      return vi.fn(); // unsubscribe function
    });

    // Mock other service methods
    enhancedAuthService.getUserProfile.mockResolvedValue(mockUserProfile);
    enhancedAuthService.getCurrentUser.mockReturnValue(null);
    enhancedAuthService.isAuthenticated.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.userProfile).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.profileCompleteness).toBeNull();
    });
  });

  describe('Auth State Changes', () => {
    it('should update state when user logs in', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      // Simulate user login
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userProfile).toEqual(mockUserProfile);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.loading).toBe(false);
      });

      expect(enhancedAuthService.getUserProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should update state when user logs out', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      // First login
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      // Then logout
      await act(async () => {
        mockAuthStateCallback(null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.userProfile).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.profileCompleteness).toBeNull();
      });
    });

    it('should handle admin user', async () => {
      const adminProfile = { ...mockUserProfile, isAdmin: true };
      enhancedAuthService.getUserProfile.mockResolvedValue(adminProfile);

      const { result } = renderHook(() => useEnhancedAuth());

      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.isAdmin).toBe(true);
      });
    });
  });

  describe('signUp', () => {
    it('should register user successfully', async () => {
      enhancedAuthService.registerUser.mockResolvedValue({
        success: true,
        user: mockUser,
        message: 'Registration successful'
      });

      const { result } = renderHook(() => useEnhancedAuth());

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        fullName: 'Test User Full'
      };

      let registrationResult;
      await act(async () => {
        registrationResult = await result.current.signUp(userData);
      });

      expect(registrationResult.success).toBe(true);
      expect(enhancedAuthService.registerUser).toHaveBeenCalledWith(userData);
      expect(toastMessages.registerSuccess).toHaveBeenCalled();
    });

    it('should handle registration errors', async () => {
      const errorMessage = 'Email already in use';
      enhancedAuthService.registerUser.mockResolvedValue({
        success: false,
        message: errorMessage
      });

      const { result } = renderHook(() => useEnhancedAuth());

      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await act(async () => {
        try {
          await result.current.signUp(userData);
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(toastMessages.registerError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('signIn', () => {
    it('should login user successfully', async () => {
      enhancedAuthService.loginUser.mockResolvedValue({
        success: true,
        user: mockUser,
        message: 'Login successful'
      });

      const { result } = renderHook(() => useEnhancedAuth());

      let loginResult;
      await act(async () => {
        loginResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(loginResult.success).toBe(true);
      expect(enhancedAuthService.loginUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(toastMessages.loginSuccess).toHaveBeenCalled();
    });

    it('should handle login errors', async () => {
      const errorMessage = 'Wrong password';
      enhancedAuthService.loginUser.mockResolvedValue({
        success: false,
        message: errorMessage
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await act(async () => {
        try {
          await result.current.signIn('test@example.com', 'wrongpassword');
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(toastMessages.loginError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('signOut', () => {
    it('should logout user successfully', async () => {
      enhancedAuthService.logoutUser.mockResolvedValue({
        success: true,
        message: 'Logout successful'
      });

      const { result } = renderHook(() => useEnhancedAuth());

      // First set user as logged in
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      // Then logout
      let logoutResult;
      await act(async () => {
        logoutResult = await result.current.signOut();
      });

      expect(logoutResult.success).toBe(true);
      expect(enhancedAuthService.logoutUser).toHaveBeenCalled();
      expect(toastMessages.logoutSuccess).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      const errorMessage = 'Logout failed';
      enhancedAuthService.logoutUser.mockResolvedValue({
        success: false,
        message: errorMessage
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await act(async () => {
        try {
          await result.current.signOut();
        } catch (error) {
          expect(error.message).toBe('Chiqishda xato yuz berdi');
        }
      });

      expect(toastMessages.logoutError).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      enhancedAuthService.sendPasswordReset.mockResolvedValue({
        success: true,
        message: 'Password reset email sent'
      });

      const { result } = renderHook(() => useEnhancedAuth());

      let resetResult;
      await act(async () => {
        resetResult = await result.current.resetPassword('test@example.com');
      });

      expect(resetResult.success).toBe(true);
      expect(enhancedAuthService.sendPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(toastMessages.passwordResetSent).toHaveBeenCalled();
    });

    it('should handle password reset errors', async () => {
      const errorMessage = 'User not found';
      enhancedAuthService.sendPasswordReset.mockResolvedValue({
        success: false,
        message: errorMessage
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await act(async () => {
        try {
          await result.current.resetPassword('test@example.com');
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(toastMessages.passwordResetError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      enhancedAuthService.updateUserPassword.mockResolvedValue({
        success: true,
        message: 'Password updated'
      });

      const { result } = renderHook(() => useEnhancedAuth());

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updatePassword('oldpassword', 'newpassword123');
      });

      expect(updateResult.success).toBe(true);
      expect(enhancedAuthService.updateUserPassword).toHaveBeenCalledWith('oldpassword', 'newpassword123');
      expect(toastMessages.passwordUpdateSuccess).toHaveBeenCalled();
    });

    it('should handle password update errors', async () => {
      const errorMessage = 'Wrong current password';
      enhancedAuthService.updateUserPassword.mockResolvedValue({
        success: false,
        message: errorMessage
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await act(async () => {
        try {
          await result.current.updatePassword('wrongpassword', 'newpassword123');
        } catch (error) {
          expect(error.message).toBe(errorMessage);
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(toastMessages.passwordUpdateError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedProfile = { ...mockUserProfile, displayName: 'Updated Name' };
      enhancedAuthService.updateUserProfile.mockResolvedValue({
        success: true,
        profile: updatedProfile,
        message: 'Profile updated'
      });

      const { result } = renderHook(() => useEnhancedAuth());

      // Set user first
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      const updates = { displayName: 'Updated Name' };
      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateProfile(updates);
      });

      expect(updateResult.success).toBe(true);
      expect(enhancedAuthService.updateUserProfile).toHaveBeenCalledWith('test-user-id', updates);
      expect(toastMessages.profileUpdateSuccess).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.userProfile.displayName).toBe('Updated Name');
      });
    });

    it('should handle profile update errors', async () => {
      enhancedAuthService.updateUserProfile.mockResolvedValue({
        success: false,
        message: 'Profile update failed'
      });

      const { result } = renderHook(() => useEnhancedAuth());

      // Set user first
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      await act(async () => {
        try {
          await result.current.updateProfile({ displayName: 'Updated Name' });
        } catch (error) {
          expect(error.message).toBe('Profile update failed');
        }
      });

      expect(toastMessages.profileUpdateError).toHaveBeenCalled();
    });

    it('should not update profile if no user', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      const updateResult = await act(async () => {
        return result.current.updateProfile({ displayName: 'Updated Name' });
      });

      expect(updateResult).toBeUndefined();
      expect(enhancedAuthService.updateUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('getUserActivityHistory', () => {
    it('should get activity history successfully', async () => {
      const mockActivities = [
        { id: '1', activityType: 'login', timestamp: new Date() },
        { id: '2', activityType: 'profile_update', timestamp: new Date() }
      ];

      enhancedAuthService.getUserActivityHistory.mockResolvedValue({
        success: true,
        activities: mockActivities
      });

      const { result } = renderHook(() => useEnhancedAuth());

      // Set user first
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      let activityResult;
      await act(async () => {
        activityResult = await result.current.getUserActivityHistory();
      });

      expect(activityResult.success).toBe(true);
      expect(activityResult.activities).toHaveLength(2);
      expect(enhancedAuthService.getUserActivityHistory).toHaveBeenCalledWith('test-user-id', {});
    });

    it('should return empty result if no user', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      const activityResult = await act(async () => {
        return result.current.getUserActivityHistory();
      });

      expect(activityResult.success).toBe(false);
      expect(activityResult.activities).toHaveLength(0);
    });
  });

  describe('getUserLoginStats', () => {
    it('should get login stats successfully', async () => {
      const mockStats = {
        totalLogins: 10,
        lastLoginAt: new Date(),
        memberSince: new Date(),
        recentLogins: []
      };

      enhancedAuthService.getUserLoginStats.mockResolvedValue({
        success: true,
        stats: mockStats
      });

      const { result } = renderHook(() => useEnhancedAuth());

      // Set user first
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      let statsResult;
      await act(async () => {
        statsResult = await result.current.getUserLoginStats();
      });

      expect(statsResult.success).toBe(true);
      expect(statsResult.stats.totalLogins).toBe(10);
      expect(enhancedAuthService.getUserLoginStats).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('Profile Completeness Methods', () => {
    it('should check if profile is complete', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      // Set user with complete profile
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.isProfileComplete()).toBe(true);
        expect(result.current.getProfileCompletionPercentage()).toBe(100);
        expect(result.current.getMissingProfileFields()).toHaveLength(0);
      });
    });

    it('should handle incomplete profile', async () => {
      const incompleteProfile = {
        ...mockUserProfile,
        isProfileComplete: {
          percentage: 60,
          isComplete: false,
          missingFields: ['phone', 'address']
        }
      };

      enhancedAuthService.getUserProfile.mockResolvedValue(incompleteProfile);

      const { result } = renderHook(() => useEnhancedAuth());

      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      await waitFor(() => {
        expect(result.current.isProfileComplete()).toBe(false);
        expect(result.current.getProfileCompletionPercentage()).toBe(60);
        expect(result.current.getMissingProfileFields()).toContain('phone');
        expect(result.current.getMissingProfileFields()).toContain('address');
      });
    });
  });

  describe('Utility Methods', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should get current user', () => {
      enhancedAuthService.getCurrentUser.mockReturnValue(mockUser);

      const { result } = renderHook(() => useEnhancedAuth());

      const currentUser = result.current.getCurrentUser();
      expect(currentUser).toEqual(mockUser);
    });

    it('should check if user is authenticated', () => {
      enhancedAuthService.isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useEnhancedAuth());

      const isAuthenticated = result.current.isUserAuthenticated();
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('refreshProfile', () => {
    it('should refresh user profile', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      // Set user first
      await act(async () => {
        mockAuthStateCallback(mockUser);
      });

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(enhancedAuthService.getUserProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should not refresh if no user', async () => {
      const { result } = renderHook(() => useEnhancedAuth());

      await act(async () => {
        await result.current.refreshProfile();
      });

      // Should not call getUserProfile since no user is set
      expect(enhancedAuthService.getUserProfile).not.toHaveBeenCalled();
    });
  });
});