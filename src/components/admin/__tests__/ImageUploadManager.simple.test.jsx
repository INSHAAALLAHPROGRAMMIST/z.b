import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ImageUploadManager from '../ImageUploadManager';

// Mock dependencies
vi.mock('../../../services/CloudinaryService', () => ({
  default: {
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
    getOptimizedUrl: vi.fn(() => 'https://optimized-url.jpg')
  }
}));

vi.mock('../../../utils/toastUtils', () => ({
  toastMessages: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('../ImageCropModal', () => ({
  default: ({ onCancel }) => (
    <div data-testid="crop-modal">
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}));

describe('ImageUploadManager', () => {
  const mockOnImagesChange = vi.fn();
  
  const defaultProps = {
    onImagesChange: mockOnImagesChange,
    maxImages: 5,
    allowCrop: true,
    allowMultiple: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone correctly', () => {
    render(<ImageUploadManager {...defaultProps} />);
    
    expect(screen.getByText(/Rasmlarni bu yerga sudrab olib keling/)).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG, WebP formatida/)).toBeInTheDocument();
  });

  it('renders with initial images', () => {
    const initialImages = [
      {
        id: 'img1',
        publicId: 'test-id-1',
        fileName: 'test1.jpg',
        bytes: 1024,
        width: 400,
        height: 300,
        isMain: true
      }
    ];

    render(<ImageUploadManager {...defaultProps} initialImages={initialImages} />);
    
    expect(screen.getByText('Yuklangan rasmlar (1/5)')).toBeInTheDocument();
    expect(screen.getByText('test1.jpg')).toBeInTheDocument();
    expect(screen.getByText('Asosiy')).toBeInTheDocument();
  });

  it('handles drag and drop events', () => {
    render(<ImageUploadManager {...defaultProps} />);
    
    const uploadZone = screen.getByText(/Rasmlarni bu yerga sudrab olib keling/).closest('.upload-zone');
    
    // Test drag enter
    fireEvent.dragEnter(uploadZone);
    expect(uploadZone).toHaveClass('drag-active');
    
    // Test drag leave
    fireEvent.dragLeave(uploadZone);
    expect(uploadZone).not.toHaveClass('drag-active');
  });

  it('shows disabled state correctly', () => {
    render(<ImageUploadManager {...defaultProps} disabled={true} />);
    
    const uploadZone = screen.getByText(/Rasmlarni bu yerga sudrab olib keling/).closest('.upload-zone');
    expect(uploadZone).toHaveClass('disabled');
  });

  it('respects maxImages prop', () => {
    render(<ImageUploadManager {...defaultProps} maxImages={3} />);
    
    expect(screen.getByText(/maksimal 3 ta/)).toBeInTheDocument();
  });

  it('handles single image mode', () => {
    render(<ImageUploadManager {...defaultProps} allowMultiple={false} />);
    
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toHaveAttribute('multiple');
  });

  it('shows crop modal when crop button is clicked', async () => {
    const initialImages = [
      {
        id: 'img1',
        publicId: 'test-id-1',
        fileName: 'test1.jpg',
        isMain: true
      }
    ];

    render(<ImageUploadManager {...defaultProps} initialImages={initialImages} />);
    
    const cropButton = screen.getByTitle('Rasmni tahrirlash');
    fireEvent.click(cropButton);

    expect(screen.getByTestId('crop-modal')).toBeInTheDocument();
  });

  it('calls onImagesChange when images change', () => {
    const initialImages = [
      {
        id: 'img1',
        publicId: 'test-id-1',
        fileName: 'test1.jpg',
        isMain: true
      }
    ];

    render(<ImageUploadManager {...defaultProps} initialImages={initialImages} />);
    
    expect(mockOnImagesChange).toHaveBeenCalledWith(initialImages);
  });

  it('handles missing onImagesChange gracefully', () => {
    expect(() => {
      render(<ImageUploadManager />);
    }).not.toThrow();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <ImageUploadManager {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('image-upload-manager', 'custom-class');
  });
});