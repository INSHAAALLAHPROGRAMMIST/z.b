import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SecurityProvider } from '../contexts/SecurityContext';
import authService from '../services/AuthService';

// Mock Firebase
export const mockFirebase = {
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'test@example.com'
    }
  },
  db: {},
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn()
};

// Mock auth service
export const mockAuthService = {
  getCurrentUser: jest.fn(() => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    role: 'admin',
    permissions: ['VIEW_DASHBOARD', 'EDIT_ORDERS']
  })),
  hasPermission: jest.fn(() => true),
  hasRole: jest.fn(() => true),
  hasRoleLevel: jest.fn(() => true),
  init: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(() => () => {})
};

// Test wrapper with providers
export const TestWrapper = ({ children, initialUser = null }) => {
  // Mock auth service for testing
  if (initialUser) {
    authService.getCurrentUser = jest.fn(() => initialUser);
  }

  return (
    <BrowserRouter>
      <SecurityProvider>
        {children}
      </SecurityProvider>
    </BrowserRouter>
  );
};

// Custom render function
export const renderWithProviders = (ui, options = {}) => {
  const { initialUser, ...renderOptions } = options;
  
  const Wrapper = ({ children }) => (
    <TestWrapper initialUser={initialUser}>
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock data generators
export const generateMockUser = (overrides = {}) => ({
  id: 'user-123',
  uid: 'user-123',
  email: 'test@example.com',
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  lastLogin: new Date(),
  ...overrides
});

export const generateMockOrder = (overrides = {}) => ({
  id: 'order-123',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  status: 'pending',
  total: 99.99,
  items: [
    {
      id: 'book-1',
      title: 'Test Book',
      price: 29.99,
      quantity: 1
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const generateMockBook = (overrides = {}) => ({
  id: 'book-123',
  title: 'Test Book',
  author: 'Test Author',
  price: 29.99,
  stock: 10,
  category: 'Fiction',
  isbn: '1234567890',
  description: 'A test book description',
  imageUrl: 'https://example.com/book.jpg',
  ...overrides
});

export const generateMockCustomer = (overrides = {}) => ({
  id: 'customer-123',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Test St',
  totalOrders: 5,
  totalSpent: 299.95,
  segment: 'regular',
  createdAt: new Date(),
  ...overrides
});

// Test helpers
export const waitForLoadingToFinish = () => {
  return waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

export const expectElementToBeVisible = (element) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveText = (element, text) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent(text);
};

// Mock API responses
export const mockApiResponse = (data, delay = 0) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ data }), delay);
  });
};

export const mockApiError = (error, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(error), delay);
  });
};

// Form testing helpers
export const fillForm = (formData) => {
  Object.entries(formData).forEach(([fieldName, value]) => {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                  screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                  screen.getByDisplayValue('');
    
    if (field.type === 'checkbox') {
      if (value) {
        fireEvent.click(field);
      }
    } else if (field.tagName === 'SELECT') {
      fireEvent.change(field, { target: { value } });
    } else {
      fireEvent.change(field, { target: { value } });
    }
  });
};

export const submitForm = () => {
  const submitButton = screen.getByRole('button', { name: /submit|save|create|update/i });
  fireEvent.click(submitButton);
};

// Table testing helpers
export const getTableRows = (tableRole = 'table') => {
  const table = screen.getByRole(tableRole);
  return table.querySelectorAll('tbody tr');
};

export const getTableCellByRowAndColumn = (rowIndex, columnIndex) => {
  const rows = getTableRows();
  const row = rows[rowIndex];
  const cells = row.querySelectorAll('td');
  return cells[columnIndex];
};

// Modal testing helpers
export const expectModalToBeOpen = (modalTitle) => {
  const modal = screen.getByRole('dialog') || screen.getByText(modalTitle);
  expect(modal).toBeInTheDocument();
};

export const closeModal = () => {
  const closeButton = screen.getByRole('button', { name: /close|×/i });
  fireEvent.click(closeButton);
};

// Permission testing helpers
export const mockUserWithPermissions = (permissions = []) => ({
  user: { uid: 'test-user', email: 'test@example.com' },
  role: 'admin',
  permissions
});

export const mockUserWithRole = (role = 'admin') => ({
  user: { uid: 'test-user', email: 'test@example.com' },
  role,
  permissions: ['VIEW_DASHBOARD']
});

// Async testing helpers
export const waitForApiCall = async (apiMock, expectedCallCount = 1) => {
  await waitFor(() => {
    expect(apiMock).toHaveBeenCalledTimes(expectedCallCount);
  });
};

export const waitForStateUpdate = async (callback, timeout = 1000) => {
  await waitFor(callback, { timeout });
};

// Error boundary testing
export const TestErrorBoundary = ({ children, onError }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      if (onError) onError(error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  if (hasError) {
    return <div>Something went wrong</div>;
  }

  return children;
};

// Performance testing helpers
export const measureRenderTime = (component) => {
  const startTime = performance.now();
  render(component);
  const endTime = performance.now();
  return endTime - startTime;
};

export const measureAsyncOperation = async (operation) => {
  const startTime = performance.now();
  await operation();
  const endTime = performance.now();
  return endTime - startTime;
};

// Cleanup helpers
export const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};

export default {
  renderWithProviders,
  TestWrapper,
  mockFirebase,
  mockAuthService,
  generateMockUser,
  generateMockOrder,
  generateMockBook,
  generateMockCustomer,
  waitForLoadingToFinish,
  expectElementToBeVisible,
  expectElementToHaveText,
  fillForm,
  submitForm,
  cleanupMocks
};