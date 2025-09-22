import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EnhancedBookForm from '../EnhancedBookForm';

// Mock ImageUploadManager
vi.mock('../ImageUploadManager', () => ({
  default: ({ onImagesChange, initialImages = [] }) => (
    <div data-testid="image-upload-manager">
      <button 
        onClick={() => onImagesChange([
          { id: 'test-img', publicId: 'test-public-id', fileName: 'test.jpg', isMain: true }
        ])}
      >
        Upload Image
      </button>
      <div>Images: {initialImages.length}</div>
    </div>
  )
}));

vi.mock('../../../utils/toastUtils', () => ({
  toastMessages: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

describe('EnhancedBookForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  
  const mockAuthors = [
    { id: 'author1', name: 'Test Author 1' },
    { id: 'author2', name: 'Test Author 2' }
  ];
  
  const mockGenres = [
    { id: 'genre1', name: 'Fiction' },
    { id: 'genre2', name: 'Non-Fiction' }
  ];

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    authors: mockAuthors,
    genres: mockGenres
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with all required fields', () => {
    render(<EnhancedBookForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/Kitob nomi/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Narxi/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tavsif/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Muallif/)).toBeInTheDocument();
    expect(screen.getByText('Janrlar *')).toBeInTheDocument();
    expect(screen.getByTestId('image-upload-manager')).toBeInTheDocument();
  });

  it('populates form with initial data', () => {
    const initialData = {
      title: 'Test Book',
      price: '50000',
      description: 'Test description',
      author: 'author1',
      genres: ['genre1'],
      images: [{ id: 'img1', fileName: 'test.jpg' }]
    };

    render(<EnhancedBookForm {...defaultProps} initialData={initialData} />);
    
    expect(screen.getByDisplayValue('Test Book')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('author1')).toBeInTheDocument();
    expect(screen.getByText('Images: 1')).toBeInTheDocument();
  });

  it('handles form input changes', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    const titleInput = screen.getByLabelText(/Kitob nomi/);
    await user.type(titleInput, 'New Book Title');
    
    expect(titleInput).toHaveValue('New Book Title');
  });

  it('handles genre selection', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    const fictionCheckbox = screen.getByLabelText('Fiction');
    await user.click(fictionCheckbox);
    
    expect(fictionCheckbox).toBeChecked();
  });

  it('handles image upload', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    const uploadButton = screen.getByText('Upload Image');
    await user.click(uploadButton);
    
    expect(screen.getByText('Images: 1')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    const submitButton = screen.getByText('Saqlash');
    await user.click(submitButton);
    
    expect(screen.getByText('Kitob nomi majburiy')).toBeInTheDocument();
    expect(screen.getByText('Tavsif majburiy')).toBeInTheDocument();
    expect(screen.getByText('To\'g\'ri narx kiriting')).toBeInTheDocument();
    expect(screen.getByText('Muallif tanlang')).toBeInTheDocument();
    expect(screen.getByText('Kamida bitta janr tanlang')).toBeInTheDocument();
    expect(screen.getByText('Kamida bitta rasm yuklang')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    // Fill required fields
    await user.type(screen.getByLabelText(/Kitob nomi/), 'Test Book');
    await user.type(screen.getByLabelText(/Tavsif/), 'Test description');
    await user.type(screen.getByLabelText(/Narxi/), '50000');
    await user.selectOptions(screen.getByLabelText(/Muallif/), 'author1');
    await user.click(screen.getByLabelText('Fiction'));
    await user.click(screen.getByText('Upload Image'));
    
    const submitButton = screen.getByText('Saqlash');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Book',
          description: 'Test description',
          price: '50000',
          author: 'author1',
          genres: ['genre1'],
          images: expect.arrayContaining([
            expect.objectContaining({ fileName: 'test.jpg' })
          ])
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    const cancelButton = screen.getByText('Bekor qilish');
    await user.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<EnhancedBookForm {...defaultProps} loading={true} />);
    
    expect(screen.getByText('Saqlanmoqda...')).toBeInTheDocument();
    expect(screen.getByLabelText(/Kitob nomi/)).toBeDisabled();
  });

  it('validates price field', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    const priceInput = screen.getByLabelText(/Narxi/);
    await user.type(priceInput, '-100');
    
    const submitButton = screen.getByText('Saqlash');
    await user.click(submitButton);
    
    expect(screen.getByText('To\'g\'ri narx kiriting')).toBeInTheDocument();
  });

  it('validates year field', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    const yearInput = screen.getByLabelText(/Nashr yili/);
    await user.type(yearInput, '3000');
    
    const submitButton = screen.getByText('Saqlash');
    await user.click(submitButton);
    
    expect(screen.getByText('To\'g\'ri yil kiriting')).toBeInTheDocument();
  });

  it('handles checkbox fields', async () => {
    const user = userEvent.setup();
    render(<EnhancedBookForm {...defaultProps} />);
    
    const featuredCheckbox = screen.getByLabelText(/Tavsiya etilgan/);
    const newArrivalCheckbox = screen.getByLabelText(/Yangi kelgan/);
    
    await user.click(featuredCheckbox);
    await user.click(newArrivalCheckbox);
    
    expect(featuredCheckbox).toBeChecked();
    expect(newArrivalCheckbox).toBeChecked();
  });
});