// Enhanced Authentication Form Test Suite
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EnhancedAuthForm from '../EnhancedAuthForm';
import useEnhancedAuth from '../../hooks/useEnhancedAuth';

// Mock dependencies
vi.mock('../../hooks/useEnhancedAuth');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('EnhancedAuthForm', () => {
  let mockAuthHook;

  beforeEach(() => {
    mockAuthHook = {
      user: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      clearError: vi.fn()
    };

    useEnhancedAuth.mockReturnValue(mockAuthHook);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Mode', () => {
    it('should render login form by default', () => {
      renderWithRouter(<EnhancedAuthForm />);

      expect(screen.getByText('Tizimga Kirish')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Parol')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /kirish/i })).toBeInTheDocument();
    });

    it('should handle login form submission', async () => {
      mockAuthHook.signIn.mockResolvedValue({ success: true });

      renderWithRouter(<EnhancedAuthForm />);

      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Parol'), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByRole('button', { name: /kirish/i }));

      await waitFor(() => {
        expect(mockAuthHook.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should validate email format', async () => {
      renderWithRouter(<EnhancedAuthForm />);

      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: 'invalid-email' }
      });
      fireEvent.change(screen.getByPlaceholderText('Parol'), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByRole('button', { name: /kirish/i }));

      await waitFor(() => {
        expect(screen.getByText(/email format noto'g'ri/i)).toBeInTheDocument();
      });

      expect(mockAuthHook.signIn).not.toHaveBeenCalled();
    });

    it('should show password toggle', () => {
      renderWithRouter(<EnhancedAuthForm />);

      const passwordInput = screen.getByPlaceholderText('Parol');
      const toggleButton = screen.getByRole('button', { name: '' }); // Password toggle button

      expect(passwordInput.type).toBe('password');

      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      fireEvent.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('should show forgot password modal', async () => {
      renderWithRouter(<EnhancedAuthForm />);

      fireEvent.click(screen.getByText(/parolni unutdingizmi/i));

      await waitFor(() => {
        expect(screen.getByText('Parolni Tiklash')).toBeInTheDocument();
      });
    });

    it('should handle forgot password submission', async () => {
      mockAuthHook.resetPassword.mockResolvedValue({ success: true });

      renderWithRouter(<EnhancedAuthForm />);

      // Fill email first
      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: 'test@example.com' }
      });

      // Open forgot password modal
      fireEvent.click(screen.getByText(/parolni unutdingizmi/i));

      await waitFor(() => {
        expect(screen.getByText('Parolni Tiklash')).toBeInTheDocument();
      });

      // Submit forgot password
      fireEvent.click(screen.getByText(/yuborish/i));

      await waitFor(() => {
        expect(mockAuthHook.resetPassword).toHaveBeenCalledWith('test@example.com');
      });
    });
  });

  describe('Registration Mode', () => {
    beforeEach(() => {
      renderWithRouter(<EnhancedAuthForm />);
      // Switch to registration mode
      fireEvent.click(screen.getByText(/ro'yxatdan o'tish/i));
    });

    it('should render registration form', () => {
      expect(screen.getByText("Ro'yxatdan O'tish")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Ism (ko'rsatiladigan)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("To'liq ism familiya")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/telefon raqami/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/telegram username/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/manzilingiz/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/parol \(kamida 8 ta belgi\)/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/parolni tasdiqlang/i)).toBeInTheDocument();
    });

    it('should show profile image upload section', () => {
      expect(screen.getByText('Rasm tanlang')).toBeInTheDocument();
      expect(screen.getByText('Profil rasmi (ixtiyoriy)')).toBeInTheDocument();
    });

    it('should handle profile image selection', async () => {
      const file = new File(['test'], 'profile.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByRole('button', { name: /rasm tanlang/i }).parentElement.querySelector('input[type="file"]');

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Note: Testing file preview would require mocking FileReader
      // This test verifies the file input accepts the file
      expect(fileInput.files[0]).toBe(file);
    });

    it('should validate registration form', async () => {
      fireEvent.click(screen.getByRole('button', { name: /ro'yxatdan o'tish/i }));

      await waitFor(() => {
        expect(screen.getByText(/ism kiritish majburiy/i)).toBeInTheDocument();
        expect(screen.getByText(/to'liq ism kiritish majburiy/i)).toBeInTheDocument();
        expect(screen.getByText(/manzil kiritish majburiy/i)).toBeInTheDocument();
      });

      expect(mockAuthHook.signUp).not.toHaveBeenCalled();
    });

    it('should validate password confirmation', async () => {
      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText("Ism (ko'rsatiladigan)"), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByPlaceholderText("To'liq ism familiya"), {
        target: { value: 'Test User Full' }
      });
      fireEvent.change(screen.getByPlaceholderText(/manzilingiz/i), {
        target: { value: 'Test Address' }
      });
      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText(/parol \(kamida 8 ta belgi\)/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByPlaceholderText(/parolni tasdiqlang/i), {
        target: { value: 'differentpassword' }
      });

      fireEvent.click(screen.getByRole('button', { name: /ro'yxatdan o'tish/i }));

      await waitFor(() => {
        expect(screen.getByText(/parollar mos kelmaydi/i)).toBeInTheDocument();
      });

      expect(mockAuthHook.signUp).not.toHaveBeenCalled();
    });

    it('should validate phone number format', async () => {
      fireEvent.change(screen.getByPlaceholderText(/telefon raqami/i), {
        target: { value: '123456789' }
      });

      fireEvent.click(screen.getByRole('button', { name: /ro'yxatdan o'tish/i }));

      await waitFor(() => {
        expect(screen.getByText(/telefon raqami noto'g'ri formatda/i)).toBeInTheDocument();
      });
    });

    it('should handle successful registration', async () => {
      mockAuthHook.signUp.mockResolvedValue({ success: true });

      // Fill all required fields
      fireEvent.change(screen.getByPlaceholderText("Ism (ko'rsatiladigan)"), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByPlaceholderText("To'liq ism familiya"), {
        target: { value: 'Test User Full' }
      });
      fireEvent.change(screen.getByPlaceholderText(/telefon raqami/i), {
        target: { value: '+998901234567' }
      });
      fireEvent.change(screen.getByPlaceholderText(/telegram username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByPlaceholderText(/manzilingiz/i), {
        target: { value: 'Test Address' }
      });
      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText(/parol \(kamida 8 ta belgi\)/i), {
        target: { value: 'password123' }
      });
      fireEvent.change(screen.getByPlaceholderText(/parolni tasdiqlang/i), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByRole('button', { name: /ro'yxatdan o'tish/i }));

      await waitFor(() => {
        expect(mockAuthHook.signUp).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            password: 'password123',
            displayName: 'Test User',
            fullName: 'Test User Full',
            phone: '+998901234567',
            telegramUsername: 'testuser',
            address: 'Test Address'
          })
        );
      });
    });
  });

  describe('Logged In User', () => {
    beforeEach(() => {
      mockAuthHook.user = {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null
      };
    });

    it('should show logged in user interface', () => {
      renderWithRouter(<EnhancedAuthForm />);

      expect(screen.getByText('Siz allaqachon tizimga kirgansiz')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText(/bosh sahifaga o'tish/i)).toBeInTheDocument();
      expect(screen.getByText(/profilni tahrirlash/i)).toBeInTheDocument();
      expect(screen.getByText(/boshqa hisob bilan kirish/i)).toBeInTheDocument();
    });

    it('should handle logout', async () => {
      mockAuthHook.signOut.mockResolvedValue({ success: true });

      renderWithRouter(<EnhancedAuthForm />);

      fireEvent.click(screen.getByText(/boshqa hisob bilan kirish/i));

      await waitFor(() => {
        expect(mockAuthHook.signOut).toHaveBeenCalled();
      });
    });

    it('should show profile image if available', () => {
      mockAuthHook.user.photoURL = 'https://example.com/profile.jpg';

      renderWithRouter(<EnhancedAuthForm />);

      const profileImage = screen.getByAltText('Profile');
      expect(profileImage).toBeInTheDocument();
      expect(profileImage.src).toBe('https://example.com/profile.jpg');
    });
  });

  describe('Error Handling', () => {
    it('should display authentication errors', () => {
      mockAuthHook.error = 'Login failed';

      renderWithRouter(<EnhancedAuthForm />);

      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });

    it('should clear errors when switching modes', () => {
      mockAuthHook.error = 'Login failed';

      renderWithRouter(<EnhancedAuthForm />);

      fireEvent.click(screen.getByText(/ro'yxatdan o'tish/i));

      expect(mockAuthHook.clearError).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during authentication', () => {
      mockAuthHook.loading = true;

      renderWithRouter(<EnhancedAuthForm />);

      expect(screen.getByText(/yuklanmoqda/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /yuklanmoqda/i })).toBeDisabled();
    });

    it('should disable form inputs during loading', () => {
      mockAuthHook.loading = true;

      renderWithRouter(<EnhancedAuthForm />);

      expect(screen.getByPlaceholderText('Email')).toBeDisabled();
      expect(screen.getByPlaceholderText('Parol')).toBeDisabled();
    });
  });

  describe('Form Reset', () => {
    it('should reset form when switching between login and register', () => {
      renderWithRouter(<EnhancedAuthForm />);

      // Fill login form
      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Parol'), {
        target: { value: 'password123' }
      });

      // Switch to register
      fireEvent.click(screen.getByText(/ro'yxatdan o'tish/i));

      // Switch back to login
      fireEvent.click(screen.getByText(/kirish/i));

      // Form should be reset
      expect(screen.getByPlaceholderText('Email').value).toBe('');
      expect(screen.getByPlaceholderText('Parol').value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      renderWithRouter(<EnhancedAuthForm />);

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /kirish/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithRouter(<EnhancedAuthForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Parol');

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      // Tab to next input
      fireEvent.keyDown(emailInput, { key: 'Tab' });
      // Note: jsdom doesn't automatically handle tab navigation
      // In a real browser, this would move focus to the password input
    });
  });
});