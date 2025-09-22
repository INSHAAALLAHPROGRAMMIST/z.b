/**
 * Security Service
 * Comprehensive security service for authentication, authorization, and security monitoring
 */

import { auth } from '../firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import ValidationService from './ValidationService';
import RateLimitingService from './RateLimitingService';

class SecurityService {
  constructor() {
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  // Enhanced login with security checks
  async login(email, password, options = {}) {
    const identifier = RateLimitingService.getUserIdentifier();
    
    try {
      // Check if user is blocked
      const blockStatus = RateLimitingService.isUserBlocked(identifier);
      if (blockStatus.blocked) {
        throw new Error(`Account temporarily locked. Try again in ${Math.ceil(blockStatus.remainingMs / 60000)} minutes.`);
      }

      // Rate limiting check
      const rateLimit = RateLimitingService.checkLimit(identifier, 'login');
      if (!rateLimit.allowed) {
        throw new Error(`Too many login attempts. Try again in ${rateLimit.retryAfter} seconds.`);
      }

      // Validate input
      const emailValidation = ValidationService.validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }

      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Attempt login
      const userCredential = await signInWithEmailAndPassword(auth, emailValidation.value, password);
      const user = userCredential.user;

      // Record successful login
      RateLimitingService.recordAction(identifier, 'login');
      
      // Create secure session
      const sessionData = await this.createSecureSession(user);
      
      // Log security event
      this.logSecurityEvent('login_success', {
        userId: user.uid,
        email: user.email,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: identifier
      });

      return {
        user,
        session: sessionData,
        success: true
      };

    } catch (error) {
      // Record failed attempt
      RateLimitingService.recordAction(identifier, 'login');
      
      // Check for suspicious activity
      const suspiciousActivity = RateLimitingService.detectSuspiciousActivity(identifier);
      if (suspiciousActivity.isSuspicious) {
        RateLimitingService.blockUser(identifier, this.lockoutDuration);
        
        this.logSecurityEvent('suspicious_login_activity', {
          identifier,
          patterns: suspiciousActivity.patterns,
          riskScore: suspiciousActivity.riskScore,
          timestamp: new Date().toISOString()
        });
      }

      // Log failed login
      this.logSecurityEvent('login_failed', {
        email,
        error: error.message,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: identifier
      });

      throw new Error(this.getSecureErrorMessage(error));
    }
  }

  // Enhanced registration with security validation
  async register(userData) {
    const identifier = RateLimitingService.getUserIdentifier();
    
    try {
      // Rate limiting check
      const rateLimit = RateLimitingService.checkLimit(identifier, 'register');
      if (!rateLimit.allowed) {
        throw new Error(`Too many registration attempts. Try again in ${rateLimit.retryAfter} seconds.`);
      }

      // Validate all input data
      const validation = this.validateRegistrationData(userData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      const sanitizedData = validation.sanitizedData;

      // Check password strength
      const passwordStrength = this.checkPasswordStrength(userData.password);
      if (!passwordStrength.isStrong) {
        throw new Error(`Password is too weak: ${passwordStrength.feedback.join(', ')}`);
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        sanitizedData.email, 
        userData.password
      );
      
      const user = userCredential.user;

      // Record successful registration
      RateLimitingService.recordAction(identifier, 'register');

      // Log security event
      this.logSecurityEvent('registration_success', {
        userId: user.uid,
        email: user.email,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: identifier
      });

      return {
        user,
        sanitizedData,
        success: true
      };

    } catch (error) {
      // Record failed attempt
      RateLimitingService.recordAction(identifier, 'register');

      // Log failed registration
      this.logSecurityEvent('registration_failed', {
        email: userData.email,
        error: error.message,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: identifier
      });

      throw new Error(this.getSecureErrorMessage(error));
    }
  }

  // Validate registration data
  validateRegistrationData(userData) {
    const errors = [];
    const sanitizedData = {};

    // Validate email
    const emailValidation = ValidationService.validateEmail(userData.email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error);
    } else {
      sanitizedData.email = emailValidation.value;
    }

    // Validate name
    const nameValidation = ValidationService.validateName(userData.name);
    if (!nameValidation.isValid) {
      errors.push(nameValidation.error);
    } else {
      sanitizedData.name = nameValidation.value;
    }

    // Validate phone (optional)
    if (userData.phone) {
      const phoneValidation = ValidationService.validatePhone(userData.phone);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error);
      } else {
        sanitizedData.phone = phoneValidation.value;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  // Check password strength
  checkPasswordStrength(password) {
    const feedback = [];
    let score = 0;

    if (!password) {
      return { isStrong: false, score: 0, feedback: ['Password is required'] };
    }

    // Length check
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 2;

    // Common patterns check
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Avoid repeating characters');
      score -= 1;
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      feedback.push('Avoid common patterns');
      score -= 2;
    }

    // Dictionary words check (basic)
    const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'hello', 'world'];
    if (commonWords.some(word => password.toLowerCase().includes(word))) {
      feedback.push('Avoid common words');
      score -= 1;
    }

    const isStrong = score >= 5 && feedback.length === 0;

    if (!isStrong && feedback.length === 0) {
      feedback.push('Password should include uppercase, lowercase, numbers, and special characters');
    }

    return {
      isStrong,
      score: Math.max(0, score),
      feedback
    };
  }

  // Create secure session
  async createSecureSession(user) {
    const sessionId = this.generateSecureId();
    const expiresAt = Date.now() + this.sessionTimeout;
    
    const sessionData = {
      sessionId,
      userId: user.uid,
      email: user.email,
      createdAt: Date.now(),
      expiresAt,
      userAgent: navigator.userAgent,
      lastActivity: Date.now()
    };

    // Store session data securely
    localStorage.setItem('secure_session', JSON.stringify(sessionData));
    
    return sessionData;
  }

  // Validate session
  validateSession() {
    try {
      const sessionData = localStorage.getItem('secure_session');
      if (!sessionData) {
        return { isValid: false, reason: 'No session found' };
      }

      const session = JSON.parse(sessionData);
      const now = Date.now();

      // Check expiration
      if (now > session.expiresAt) {
        this.clearSession();
        return { isValid: false, reason: 'Session expired' };
      }

      // Check for session hijacking (basic check)
      if (session.userAgent !== navigator.userAgent) {
        this.clearSession();
        this.logSecurityEvent('session_hijacking_attempt', {
          sessionId: session.sessionId,
          originalUserAgent: session.userAgent,
          currentUserAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
        return { isValid: false, reason: 'Session security violation' };
      }

      // Update last activity
      session.lastActivity = now;
      localStorage.setItem('secure_session', JSON.stringify(session));

      return { isValid: true, session };

    } catch (error) {
      console.error('Session validation error:', error);
      this.clearSession();
      return { isValid: false, reason: 'Session validation failed' };
    }
  }

  // Clear session
  clearSession() {
    localStorage.removeItem('secure_session');
  }

  // Enhanced logout
  async logout() {
    try {
      const sessionValidation = this.validateSession();
      if (sessionValidation.isValid) {
        this.logSecurityEvent('logout', {
          userId: sessionValidation.session.userId,
          sessionId: sessionValidation.session.sessionId,
          timestamp: new Date().toISOString()
        });
      }

      await signOut(auth);
      this.clearSession();
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      this.clearSession(); // Clear session even if Firebase logout fails
      throw new Error('Logout failed');
    }
  }

  // Password reset with rate limiting
  async resetPassword(email) {
    const identifier = RateLimitingService.getUserIdentifier();
    
    try {
      // Rate limiting check
      const rateLimit = RateLimitingService.checkLimit(identifier, 'passwordReset');
      if (!rateLimit.allowed) {
        throw new Error(`Too many password reset attempts. Try again in ${rateLimit.retryAfter} seconds.`);
      }

      // Validate email
      const emailValidation = ValidationService.validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }

      await sendPasswordResetEmail(auth, emailValidation.value);
      
      // Record attempt
      RateLimitingService.recordAction(identifier, 'passwordReset');

      // Log security event
      this.logSecurityEvent('password_reset_requested', {
        email: emailValidation.value,
        timestamp: new Date().toISOString(),
        ip: identifier
      });

      return { success: true };

    } catch (error) {
      RateLimitingService.recordAction(identifier, 'passwordReset');
      
      this.logSecurityEvent('password_reset_failed', {
        email,
        error: error.message,
        timestamp: new Date().toISOString(),
        ip: identifier
      });

      throw new Error(this.getSecureErrorMessage(error));
    }
  }

  // Change password with reauthentication
  async changePassword(currentPassword, newPassword) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate new password strength
      const passwordStrength = this.checkPasswordStrength(newPassword);
      if (!passwordStrength.isStrong) {
        throw new Error(`New password is too weak: ${passwordStrength.feedback.join(', ')}`);
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      // Log security event
      this.logSecurityEvent('password_changed', {
        userId: user.uid,
        timestamp: new Date().toISOString()
      });

      return { success: true };

    } catch (error) {
      this.logSecurityEvent('password_change_failed', {
        userId: auth.currentUser?.uid,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw new Error(this.getSecureErrorMessage(error));
    }
  }

  // Check user permissions
  async checkPermission(user, permission) {
    if (!user) {
      return false;
    }

    try {
      // Get user data from Firestore (this would be implemented with your user service)
      // For now, we'll check basic permissions
      
      const permissions = {
        'admin': user.isAdmin === true,
        'read_books': true, // All users can read books
        'write_books': user.isAdmin === true,
        'manage_orders': user.isAdmin === true,
        'view_analytics': user.isAdmin === true,
        'manage_users': user.isAdmin === true
      };

      return permissions[permission] || false;

    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  // Generate secure random ID
  generateSecureId() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Get secure error message (don't expose internal details)
  getSecureErrorMessage(error) {
    const secureMessages = {
      'auth/user-not-found': 'Invalid email or password',
      'auth/wrong-password': 'Invalid email or password',
      'auth/invalid-email': 'Invalid email format',
      'auth/user-disabled': 'Account has been disabled',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/email-already-in-use': 'Email is already registered',
      'auth/weak-password': 'Password is too weak',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/requires-recent-login': 'Please log in again to continue'
    };

    return secureMessages[error.code] || 'An error occurred. Please try again.';
  }

  // Log security events
  logSecurityEvent(eventType, data) {
    const logEntry = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Store in localStorage for now (in production, send to server)
    const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('security_logs', JSON.stringify(logs));

    // In production, also send to server for monitoring
    console.log('Security Event:', logEntry);
  }

  // Get security logs (admin only)
  getSecurityLogs(limit = 50) {
    try {
      const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      return logs.slice(-limit).reverse(); // Most recent first
    } catch (error) {
      console.error('Error retrieving security logs:', error);
      return [];
    }
  }

  // Clear old security logs
  clearOldLogs(olderThanDays = 30) {
    try {
      const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const filteredLogs = logs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );
      
      localStorage.setItem('security_logs', JSON.stringify(filteredLogs));
      
      return logs.length - filteredLogs.length; // Number of logs removed
    } catch (error) {
      console.error('Error clearing old logs:', error);
      return 0;
    }
  }
}

// Create singleton instance
const securityService = new SecurityService();

export default securityService;