// Test setup file for Vitest
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';

// Mock Firebase
vi.mock('./firebaseConfig', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn()
  },
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn()
  }
}));

// Mock Cloudinary
vi.mock('@cloudinary/react', () => ({
  AdvancedImage: vi.fn(({ cldImg, alt, ...props }) => {
    const MockImg = () => React.createElement('img', { alt, ...props });
    return MockImg;
  })
}));

vi.mock('@cloudinary/url-gen', () => ({
  Cloudinary: vi.fn().mockImplementation(() => ({
    image: vi.fn().mockReturnValue({
      resize: vi.fn().mockReturnThis(),
      delivery: vi.fn().mockReturnThis(),
      effect: vi.fn().mockReturnThis()
    })
  }))
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock performance API
global.performance = {
  ...global.performance,
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  },
  timing: {
    navigationStart: 0,
    loadEventEnd: 1000
  }
};

// Mock navigator
Object.defineProperty(global.navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: vi.fn()
  },
  writable: true
});

// Mock service worker
global.navigator.serviceWorker = {
  register: vi.fn().mockResolvedValue({
    addEventListener: vi.fn(),
    installing: null,
    waiting: null,
    active: null
  }),
  ready: Promise.resolve({
    showNotification: vi.fn()
  })
};

// Mock fetch
global.fetch = vi.fn();

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Setup test environment
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear.mockClear();
  sessionStorageMock.clear.mockClear();
});

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_CLOUDINARY_CLOUD_NAME: 'test-cloud',
    VITE_CLOUDINARY_UPLOAD_PRESET: 'test-preset',
    VITE_CLOUDINARY_API_KEY: 'test-api-key',
    VITE_CLOUDINARY_API_SECRET: 'test-api-secret',
    VITE_FIREBASE_API_KEY: 'test-firebase-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    VITE_FIREBASE_APP_ID: 'test-app-id'
  },
  writable: true,
  configurable: true
});

// Mock global objects that might not be available in test environment
global.FormData = class FormData {
  constructor() {
    this.data = new Map();
  }
  
  append(key, value) {
    this.data.set(key, value);
  }
  
  get(key) {
    return this.data.get(key);
  }
  
  has(key) {
    return this.data.has(key);
  }
};

// Mock File constructor
global.File = class File {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.type = options.type || '';
    this.size = options.size || (bits && bits.length ? bits.join('').length : 0);
    this.lastModified = options.lastModified || Date.now();
  }
};

// Mock crypto.subtle for signature generation
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.subtle) {
  global.crypto.subtle = {
    digest: vi.fn().mockImplementation((algorithm, data) => {
      // Return a mock hash buffer
      const mockHash = new ArrayBuffer(20);
      const view = new Uint8Array(mockHash);
      for (let i = 0; i < 20; i++) {
        view[i] = i;
      }
      return Promise.resolve(mockHash);
    })
  };
}

// Mock XMLHttpRequest
global.XMLHttpRequest = vi.fn(() => ({
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  addEventListener: vi.fn(),
  upload: {
    addEventListener: vi.fn()
  },
  status: 200,
  responseText: '{}',
  timeout: 0
}));

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK'
  })
);

// Console methods for cleaner test output
global.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};