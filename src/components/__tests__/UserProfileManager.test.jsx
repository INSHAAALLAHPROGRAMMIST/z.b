// User Profile Manager Test Suite
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserProfileManager from '../UserProfileManager';
import useEnhancedAuth from '../../hooks/useEnhancedAuth';

// Mock dependencies
vi.mock('../../hooks/useEnhancedAuth');

describe('UserProfileManager', () => {
    let mockAuthHook;
    let mockUser;
    let mockUserProfile;

    beforeEach(() => {
        mockUser = {
            uid: 'test-user-id',
            email: 'test@example.com',
            displayName: 'Test User',
            emailVerified: true
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
            loginCount: 5,
            totalOrders: 3,
            memberSince: new Date('2024-01-01'),
            lastActive: new Date('2024-01-15'),
            profileImage: {
                url: 'https://example.com/profile.jpg',
                thumbnail: 'https://example.com/profile-thumb.jpg'
            },
            preferences: {
                language: 'uz',
                theme: 'dark',
                notifications: {
                    email: true,
                    telegram: false,
                    orderUpdates: true,
                    promotions: false
                }
            }
        };

        mockAuthHook = {
            user: mockUser,
            userProfile: mockUserProfile,
            loading: false,
            error: null,
            updateProfile: vi.fn(),
            updatePassword: vi.fn(),
            getUserActivityHistory: vi.fn(),
            getUserLoginStats: vi.fn(),
            refreshProfile: vi.fn(),
            isProfileComplete: vi.fn(() => true),
            getProfileCompletionPercentage: vi.fn(() => 100),
            getMissingProfileFields: vi.fn(() => []),
            clearError: vi.fn()
        };

        useEnhancedAuth.mockReturnValue(mockAuthHook);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Authentication Check', () => {
        it('should show login required message when user is not authenticated', () => {
            mockAuthHook.user = null;

            render(<UserProfileManager />);

            expect(screen.getByText('Tizimga kirish kerak')).toBeInTheDocument();
            expect(screen.getByText("Profilni ko'rish uchun tizimga kirishingiz kerak.")).toBeInTheDocument();
        });
    });

    describe('Profile Display', () => {
        it('should render user profile information', () => {
            render(<UserProfileManager />);

            expect(screen.getByText('Foydalanuvchi Profili')).toBeInTheDocument();
            expect(screen.getByText('Test User')).toBeInTheDocument();
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
            expect(screen.getByText('Test User Full')).toBeInTheDocument();
            expect(screen.getByText('+998901234567')).toBeInTheDocument();
            expect(screen.getByText('Test Address')).toBeInTheDocument();
            expect(screen.getByText('testuser')).toBeInTheDocument();
        });

        it('should show profile image when available', () => {
            render(<UserProfileManager />);

            const profileImage = screen.getByAltText('Profile');
            expect(profileImage).toBeInTheDocument();
            expect(profileImage.src).toBe('https://example.com/profile.jpg');
        });

        it('should show default avatar when no profile image', () => {
            mockAuthHook.userProfile = {
                ...mockUserProfile,
                profileImage: null
            };

            render(<UserProfileManager />);

            expect(screen.getByRole('generic')).toBeInTheDocument(); // Default avatar container
        });

        it('should display user statistics', () => {
            render(<UserProfileManager />);

            expect(screen.getByText('5')).toBeInTheDocument(); // Login count
            expect(screen.getByText('3')).toBeInTheDocument(); // Total orders
        });
    });

    describe('Profile Completion', () => {
        it('should show completion progress for incomplete profiles', () => {
            mockAuthHook.isProfileComplete.mockReturnValue(false);
            mockAuthHook.getProfileCompletionPercentage.mockReturnValue(75);
            mockAuthHook.getMissingProfileFields.mockReturnValue(['phone']);

            render(<UserProfileManager />);

            expect(screen.getByText('Profil to\'ldirilganligi: 75%')).toBeInTheDocument();
            expect(screen.getByText(/quyidagi maydonlarni to'ldiring: phone/i)).toBeInTheDocument();
        });

        it('should not show completion progress for complete profiles', () => {
            mockAuthHook.isProfileComplete.mockReturnValue(true);

            render(<UserProfileManager />);

            expect(screen.queryByText(/profil to'ldirilganligi/i)).not.toBeInTheDocument();
        });
    });

    describe('Tab Navigation', () => {
        it('should render all tabs', () => {
            render(<UserProfileManager />);

            expect(screen.getByText('Profil')).toBeInTheDocument();
            expect(screen.getByText('Xavfsizlik')).toBeInTheDocument();
            expect(screen.getByText('Faollik')).toBeInTheDocument();
        });

        it('should switch between tabs', () => {
            render(<UserProfileManager />);

            // Initially on profile tab
            expect(screen.getByText('Profilni Tahrirlash')).toBeInTheDocument();

            // Switch to security tab
            fireEvent.click(screen.getByText('Xavfsizlik'));
            expect(screen.getByText('Xavfsizlik Sozlamalari')).toBeInTheDocument();
            expect(screen.getByText("Parolni O'zgartirish")).toBeInTheDocument();

            // Switch to activity tab
            fireEvent.click(screen.getByText('Faollik'));
            expect(screen.getByText('Faollik Tarixi')).toBeInTheDocument();
        });
    });

    describe('Profile Editing', () => {
        it('should enter edit mode when edit button is clicked', () => {
            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Test User Full')).toBeInTheDocument();
            expect(screen.getByDisplayValue('+998901234567')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Test Address')).toBeInTheDocument();
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
        });

        it('should handle form input changes', () => {
            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            const displayNameInput = screen.getByDisplayValue('Test User');
            fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

            expect(displayNameInput.value).toBe('Updated Name');
        });

        it('should handle profile image upload', () => {
            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            const file = new File(['test'], 'new-profile.jpg', { type: 'image/jpeg' });
            const fileInput = screen.getByRole('button', { name: /rasm tanlang/i }).parentElement.querySelector('input[type="file"]');

            fireEvent.change(fileInput, { target: { files: [file] } });

            expect(fileInput.files[0]).toBe(file);
        });

        it('should validate profile form', async () => {
            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            // Clear required field
            const displayNameInput = screen.getByDisplayValue('Test User');
            fireEvent.change(displayNameInput, { target: { value: '' } });

            fireEvent.click(screen.getByText('Saqlash'));

            await waitFor(() => {
                expect(screen.getByText('Ism kiritish majburiy')).toBeInTheDocument();
            });

            expect(mockAuthHook.updateProfile).not.toHaveBeenCalled();
        });

        it('should handle successful profile update', async () => {
            mockAuthHook.updateProfile.mockResolvedValue({ success: true });

            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            const displayNameInput = screen.getByDisplayValue('Test User');
            fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

            fireEvent.click(screen.getByText('Saqlash'));

            await waitFor(() => {
                expect(mockAuthHook.updateProfile).toHaveBeenCalledWith(
                    expect.objectContaining({
                        displayName: 'Updated Name'
                    })
                );
            });

            expect(mockAuthHook.refreshProfile).toHaveBeenCalled();
        });

        it('should cancel edit mode', () => {
            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            // Make a change
            const displayNameInput = screen.getByDisplayValue('Test User');
            fireEvent.change(displayNameInput, { target: { value: 'Changed Name' } });

            // Cancel
            fireEvent.click(screen.getByText('Bekor qilish'));

            // Should be back to display mode
            expect(screen.getByText('Profilni Tahrirlash')).toBeInTheDocument();
            expect(screen.queryByDisplayValue('Changed Name')).not.toBeInTheDocument();
        });
    });

    describe('Preferences Management', () => {
        it('should handle notification preference changes', () => {
            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            const emailNotificationCheckbox = screen.getByLabelText(/email bildirishnomalar/i);
            expect(emailNotificationCheckbox).toBeChecked();

            fireEvent.click(emailNotificationCheckbox);
            expect(emailNotificationCheckbox).not.toBeChecked();
        });

        it('should handle language preference changes', () => {
            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            const languageSelect = screen.getByDisplayValue("O'zbekcha");
            fireEvent.change(languageSelect, { target: { value: 'en' } });

            expect(languageSelect.value).toBe('en');
        });

        it('should handle theme preference changes', () => {
            render(<UserProfileManager />);

            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            const themeSelect = screen.getByDisplayValue("Qorong'u");
            fireEvent.change(themeSelect, { target: { value: 'light' } });

            expect(themeSelect.value).toBe('light');
        });
    });

    describe('Password Management', () => {
        beforeEach(() => {
            render(<UserProfileManager />);
            fireEvent.click(screen.getByText('Xavfsizlik'));
        });

        it('should render password change form', () => {
            expect(screen.getByPlaceholderText('Joriy parol')).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/yangi parol \(kamida 8 ta belgi\)/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Yangi parolni tasdiqlang')).toBeInTheDocument();
            expect(screen.getByText("Parolni O'zgartirish")).toBeInTheDocument();
        });

        it('should validate password form', async () => {
            fireEvent.click(screen.getByText("Parolni O'zgartirish"));

            await waitFor(() => {
                expect(screen.getByText('Joriy parol kiritish majburiy')).toBeInTheDocument();
                expect(screen.getByText('Yangi parol kiritish majburiy')).toBeInTheDocument();
            });

            expect(mockAuthHook.updatePassword).not.toHaveBeenCalled();
        });

        it('should validate password confirmation', async () => {
            fireEvent.change(screen.getByPlaceholderText('Joriy parol'), {
                target: { value: 'currentpassword' }
            });
            fireEvent.change(screen.getByPlaceholderText(/yangi parol \(kamida 8 ta belgi\)/i), {
                target: { value: 'newpassword123' }
            });
            fireEvent.change(screen.getByPlaceholderText('Yangi parolni tasdiqlang'), {
                target: { value: 'differentpassword' }
            });

            fireEvent.click(screen.getByText("Parolni O'zgartirish"));

            await waitFor(() => {
                expect(screen.getByText('Parollar mos kelmaydi')).toBeInTheDocument();
            });

            expect(mockAuthHook.updatePassword).not.toHaveBeenCalled();
        });

        it('should handle successful password update', async () => {
            mockAuthHook.updatePassword.mockResolvedValue({ success: true });

            fireEvent.change(screen.getByPlaceholderText('Joriy parol'), {
                target: { value: 'currentpassword' }
            });
            fireEvent.change(screen.getByPlaceholderText(/yangi parol \(kamida 8 ta belgi\)/i), {
                target: { value: 'newpassword123' }
            });
            fireEvent.change(screen.getByPlaceholderText('Yangi parolni tasdiqlang'), {
                target: { value: 'newpassword123' }
            });

            fireEvent.click(screen.getByText("Parolni O'zgartirish"));

            await waitFor(() => {
                expect(mockAuthHook.updatePassword).toHaveBeenCalledWith('currentpassword', 'newpassword123');
            });
        });

        it('should show password toggle buttons', () => {
            const passwordInputs = screen.getAllByRole('button', { name: '' }); // Password toggle buttons
            expect(passwordInputs.length).toBeGreaterThan(0);
        });
    });

    describe('Security Information', () => {
        beforeEach(() => {
            render(<UserProfileManager />);
            fireEvent.click(screen.getByText('Xavfsizlik'));
        });

        it('should display email verification status', () => {
            expect(screen.getByText('Tasdiqlangan')).toBeInTheDocument();
        });

        it('should display account creation date', () => {
            expect(screen.getByText(/hisob yaratilgan/i)).toBeInTheDocument();
        });

        it('should display last login date', () => {
            expect(screen.getByText(/oxirgi kirish/i)).toBeInTheDocument();
        });
    });

    describe('Activity History', () => {
        beforeEach(() => {
            const mockActivities = [
                {
                    id: 'activity-1',
                    activityType: 'login',
                    timestamp: new Date('2024-01-15T10:00:00Z'),
                    metadata: { method: 'email' }
                },
                {
                    id: 'activity-2',
                    activityType: 'profile_update',
                    timestamp: new Date('2024-01-14T15:30:00Z'),
                    metadata: { updatedFields: ['displayName'] }
                }
            ];

            const mockStats = {
                totalLogins: 10,
                lastLoginAt: new Date('2024-01-15T10:00:00Z'),
                memberSince: new Date('2024-01-01T00:00:00Z'),
                recentLogins: mockActivities.filter(a => a.activityType === 'login')
            };

            mockAuthHook.getUserActivityHistory.mockResolvedValue({
                success: true,
                activities: mockActivities
            });

            mockAuthHook.getUserLoginStats.mockResolvedValue({
                success: true,
                stats: mockStats
            });

            render(<UserProfileManager />);
            fireEvent.click(screen.getByText('Faollik'));
        });

        it('should load and display activity history', async () => {
            await waitFor(() => {
                expect(mockAuthHook.getUserActivityHistory).toHaveBeenCalledWith({ limitCount: 20 });
                expect(mockAuthHook.getUserLoginStats).toHaveBeenCalled();
            });

            expect(screen.getByText('Faollik Tarixi')).toBeInTheDocument();
            expect(screen.getByText('Kirish Statistikasi')).toBeInTheDocument();
        });

        it('should display login statistics', async () => {
            await waitFor(() => {
                expect(screen.getByText('10')).toBeInTheDocument(); // Total logins
                expect(screen.getByText('Jami kirishlar')).toBeInTheDocument();
            });
        });

        it('should display activity items', async () => {
            await waitFor(() => {
                expect(screen.getByText("Tizimga kirish")).toBeInTheDocument();
                expect(screen.getByText("Profil yangilash")).toBeInTheDocument();
            });
        });

        it('should show empty state when no activities', async () => {
            mockAuthHook.getUserActivityHistory.mockResolvedValue({
                success: true,
                activities: []
            });

            render(<UserProfileManager />);
            fireEvent.click(screen.getByText('Faollik'));

            await waitFor(() => {
                expect(screen.getByText("Hozircha faollik tarixi yo'q")).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should display authentication errors', () => {
            mockAuthHook.error = 'Profile update failed';

            render(<UserProfileManager />);

            expect(screen.getByText('Profile update failed')).toBeInTheDocument();
        });

        it('should handle loading states', () => {
            mockAuthHook.loading = true;

            render(<UserProfileManager />);
            fireEvent.click(screen.getByText('Profilni Tahrirlash'));

            const inputs = screen.getAllByRole('textbox');
            inputs.forEach(input => {
                expect(input).toBeDisabled();
            });
        });
    });

    describe('Date Formatting', () => {
        it('should format dates correctly', () => {
            render(<UserProfileManager />);

            // The component should display formatted dates
            // This test verifies that dates are rendered (exact format may vary by locale)
            expect(screen.getByText(/2024/)).toBeInTheDocument();
        });

        it('should handle null dates', () => {
            mockAuthHook.userProfile = {
                ...mockUserProfile,
                memberSince: null,
                lastActive: null
            };

            render(<UserProfileManager />);

            expect(screen.getByText("Noma'lum")).toBeInTheDocument();
        });
    });

    describe('Responsive Design', () => {
        it('should render grid layouts for different screen sizes', () => {
            render(<UserProfileManager />);

            const gridContainers = screen.getAllByRole('generic').filter(
                element => element.style.display === 'grid' ||
                    element.style.gridTemplateColumns
            );

            expect(gridContainers.length).toBeGreaterThan(0);
        });
    });
});