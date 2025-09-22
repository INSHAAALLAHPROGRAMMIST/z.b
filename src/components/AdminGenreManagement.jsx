import React, { useState, useEffect } from 'react';
import { GenresAdmin, FirebaseQuery } from '../utils/firebaseAdmin';
import { prepareSearchText } from '../utils/transliteration';
import { highlightText } from '../utils/highlightText.jsx';
import { toastMessages, toast } from '../utils/toastUtils';
import { generateGenreSlug } from '../utils/slugUtils';
import ImageUpload from './ImageUpload';
import AdminFilters from './admin/AdminFilters';
import AdminTable from './admin/AdminTable';
import AdminPagination from './admin/AdminPagination';
import AdminModal from './admin/AdminModal';
import AdminForm, { FormGroup } from './admin/AdminForm';
import AdminButton from './admin/AdminButton';
import DeleteConfirmModal from './admin/DeleteConfirmModal';
import siteConfig from '../config/siteConfig';
import '../index.css';
import '../styles/admin.css';
import '../styles/admin/genres.css';
import '../styles/admin/pagination.css';
import '../styles/admin/modal.css';
import '../styles/admin/forms.css';

function AdminGenreManagement() {
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalGenres, setTotalGenres] = useState(0);
    
    // Genre form
    const [showGenreForm, setShowGenreForm] = useState(false);
    const [genreFormMode, setGenreFormMode] = useState('add'); // 'add' or 'edit'
    const [selectedGenre, setSelectedGenre] = useState(null);
    const [genreForm, setGenreForm] = useState({
        name: '',
        slug: '',
        imageFile: null,
        imagePreview: ''
    });
    
    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [genreToDelete, setGenreToDelete] = useState(null);

    // Fetch genres
    const fetchGenres = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const queries = [];
            
            // Add search
            if (searchTerm) {
                queries.push(Query.search('name', searchTerm));
            }
            
            // Add pagination
            queries.push(Query.limit(itemsPerPage));
            queries.push(Query.offset((currentPage - 1) * itemsPerPage));
            
            const response = await databases.listDocuments(
                DATABASE_ID,
                GENRES_COLLECTION_ID,
                queries
            );
            
            setGenres(response.documents);
            setTotalGenres(response.total);
            setLoading(false);
        } catch (err) {
            console.error("Janrlarni yuklashda xato:", err);
            setError(err.message || "Janrlarni yuklashda noma'lum xato yuz berdi.");
            setLoading(false);
        }
    };

    // Fetch genres when filters or pagination changes
    useEffect(() => {
        fetchGenres();
    }, [searchTerm, currentPage, itemsPerPage]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on new search
    };

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };
    
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    // Genre form handlers
    const handleGenreFormChange = (e) => {
        const { name, value } = e.target;
        setGenreForm({
            ...genreForm,
            [name]: value
        });
    };

    // Handle image file selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file type
            if (!file.type.startsWith('image/')) {
                toastMessages.fileTypeError();
                return;
            }
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toastMessages.fileSizeError(5);
                return;
            }
            
            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setGenreForm({
                    ...genreForm,
                    imageFile: file,
                    imagePreview: e.target.result
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove selected image
    const removeImage = () => {
        setGenreForm({
            ...genreForm,
            imageFile: null,
            imagePreview: ''
        });
    };
    
    const openAddGenreForm = () => {
        setGenreForm({
            name: '',
            slug: '',
            imageFile: null,
            imagePreview: ''
        });
        setGenreFormMode('add');
        setShowGenreForm(true);
    };
    
    const openEditGenreForm = (genre) => {
        setSelectedGenre(genre);
        setGenreForm({
            name: genre.name || '',
            slug: genre.slug || '',
            imageFile: null,
            imagePreview: genre.imgUrl || ''
        });
        setGenreFormMode('edit');
        setShowGenreForm(true);
    };
    
    const closeGenreForm = () => {
        setShowGenreForm(false);
        setSelectedGenre(null);
    };
    
    const handleGenreSubmit = async (e) => {
        e.preventDefault();
        
        try {
            let imageUrl = genreForm.imagePreview;
            
            // If new image file is selected, use it as base64 (temporary solution)
            // In production, you should upload to cloud storage like Cloudinary, AWS S3, etc.
            if (genreForm.imageFile) {
                imageUrl = genreForm.imagePreview; // Base64 data URL
            }
            
            // Generate slug automatically if not provided
            const slug = genreForm.slug || generateGenreSlug(genreForm.name);

            const genreData = {
                name: genreForm.name,
                slug: slug,
                imgUrl: imageUrl || ''
            };
            
            if (genreFormMode === 'add') {
                // Create new genre
                await databases.createDocument(
                    DATABASE_ID,
                    GENRES_COLLECTION_ID,
                    ID.unique(),
                    genreData
                );
                
                // Success message with slug info
                toast.success(`✅ Janr yaratildi!\n📂 "${genreForm.name}"\n🔗 URL: /janr/${slug}`);
            } else {
                // Update existing genre
                await databases.updateDocument(
                    DATABASE_ID,
                    GENRES_COLLECTION_ID,
                    selectedGenre.$id,
                    genreData
                );
                
                // Success message with slug info
                toast.success(`✅ Janr yangilandi!\n📂 "${genreForm.name}"\n🔗 URL: /janr/${slug}`);
            }
            
            // Close form and refresh genres
            closeGenreForm();
            fetchGenres();
            
        } catch (err) {
            console.error("Janrni saqlashda xato:", err);
            toast.error(`Janrni saqlashda xato: ${err.message}`);
        }
    };

    // Delete genre handlers
    const openDeleteConfirm = (genre) => {
        setGenreToDelete(genre);
        setShowDeleteConfirm(true);
    };
    
    const closeDeleteConfirm = () => {
        setShowDeleteConfirm(false);
        setGenreToDelete(null);
    };
    
    const handleDeleteGenre = async () => {
        try {
            await databases.deleteDocument(
                DATABASE_ID,
                GENRES_COLLECTION_ID,
                genreToDelete.$id
            );
            
            // Close modal and refresh genres
            closeDeleteConfirm();
            fetchGenres();
            
        } catch (err) {
            console.error("Janrni o'chirishda xato:", err);
            toast.error(`Janrni o'chirishda xato: ${err.message}`);
        }
    };

    // Table columns
    const columns = [
        {
            header: 'Rasm',
            key: 'image',
            width: '80px',
            render: (genre) => (
                <div className="genre-image">
                    <img 
                        src={genre.imgUrl || 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/No_image_available_f8lfjd.svg'} 
                        alt={genre.name}
                        width="50"
                        height="50"
                    />
                </div>
            )
        },
        {
            header: 'Nomi',
            key: 'name',
            className: 'genre-name',
            render: (genre) => searchTerm ? highlightText(genre.name, searchTerm) : genre.name
        },
        {
            header: 'Slug',
            key: 'slug',
            className: 'genre-slug',
            render: (genre) => searchTerm ? highlightText(genre.slug || '-', searchTerm) : (genre.slug || '-')
        },
        {
            header: 'Kitoblar soni',
            key: 'bookCount',
            render: (genre) => genre.bookCount || 0
        },
        {
            header: 'Amallar',
            key: 'actions',
            className: 'genre-actions',
            render: (genre) => (
                <>
                    <AdminButton 
                        variant="edit"
                        onClick={() => openEditGenreForm(genre)}
                        title="Tahrirlash"
                    >
                        <i className="fas fa-edit"></i>
                    </AdminButton>
                    <AdminButton 
                        variant="delete"
                        onClick={() => openDeleteConfirm(genre)}
                        title="O'chirish"
                    >
                        <i className="fas fa-trash-alt"></i>
                    </AdminButton>
                </>
            )
        }
    ];

    return (
        <div className="admin-genre-management" style={{ marginTop: `${siteConfig.layout.contentSpacing}px` }}>
            {/* Filters and Search */}
            <AdminFilters
                searchTerm={searchTerm}
                onSearchChange={handleSearchChange}
                onSearchClear={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                }}
                searchPlaceholder="Janr nomini qidirish..."
                onAddClick={openAddGenreForm}
                addButtonText="Yangi janr"
            />

            {/* Genres Table */}
            <AdminTable
                columns={columns}
                data={genres}
                loading={loading}
                error={error}
                noDataMessage="Janrlar topilmadi"
                className="genres-table"
            />

            {/* Pagination */}
            {!loading && !error && (
                <AdminPagination
                    currentPage={currentPage}
                    totalItems={totalGenres}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    itemName="janr"
                />
            )}

            {/* Genre Form Modal */}
            <AdminModal
                isOpen={showGenreForm}
                onClose={closeGenreForm}
                title={genreFormMode === 'add' ? 'Yangi janr qo\'shish' : 'Janrni tahrirlash'}
            >
                <AdminForm
                    onSubmit={handleGenreSubmit}
                    onCancel={closeGenreForm}
                    submitText={genreFormMode === 'add' ? 'Qo\'shish' : 'Saqlash'}
                >
                    <FormGroup label="Nomi" required>
                        <input
                            type="text"
                            name="name"
                            value={genreForm.name}
                            onChange={handleGenreFormChange}
                            required
                        />
                        {/* Auto-generated slug preview */}
                        {genreForm.name && !genreForm.slug && (
                            <div style={{
                                marginTop: '8px',
                                padding: '8px 12px',
                                background: 'rgba(106, 138, 255, 0.1)',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: 'var(--primary-color)'
                            }}>
                                <strong>🔗 Auto URL:</strong> /janr/{generateGenreSlug(genreForm.name)}
                            </div>
                        )}
                    </FormGroup>
                    
                    <FormGroup label="Slug (URL uchun)" required>
                        <input
                            type="text"
                            name="slug"
                            value={genreForm.slug}
                            onChange={handleGenreFormChange}
                            placeholder="janr-nomi"
                            required
                        />
                        <small>URL uchun lotin harflari, raqamlar va chiziqchalardan foydalaning</small>
                    </FormGroup>
                    
                    <FormGroup label="Janr rasmi (ixtiyoriy)">
                        <ImageUpload
                            imagePreview={genreForm.imagePreview}
                            onImageChange={(file) => {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    setGenreForm({
                                        ...genreForm,
                                        imageFile: file,
                                        imagePreview: e.target.result
                                    });
                                };
                                reader.readAsDataURL(file);
                            }}
                            label="Janr rasmi tanlash"
                        />
                    </FormGroup>
                </AdminForm>
            </AdminModal>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteConfirm}
                onClose={closeDeleteConfirm}
                onConfirm={handleDeleteGenre}
                itemName={genreToDelete?.name}
                itemType="janr"
                warningMessage="Bu janr bilan bog'liq kitoblar ham o'chirilishi mumkin."
            />
        </div>
    );
}

export default AdminGenreManagement;