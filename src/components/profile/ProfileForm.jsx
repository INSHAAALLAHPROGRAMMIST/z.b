import React, { memo, useCallback } from 'react';
import { validateTelegramUsername } from '../../utils/telegramUtils';

const ProfileForm = memo(({ 
    formData, 
    setFormData, 
    editMode, 
    setEditMode, 
    updating, 
    handleUpdate,
    error 
}) => {
    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, [setFormData]);

    return (
        <div className="profile-form glassmorphism-card" style={{
            padding: '30px',
            marginBottom: '30px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px'
            }}>
                <h2 style={{
                    fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
                    margin: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <i className="fas fa-user-edit" style={{ color: 'var(--primary-color)' }}></i>
                    Shaxsiy Ma'lumotlar
                </h2>
                
                <button
                    onClick={() => setEditMode(!editMode)}
                    className="glassmorphism-button"
                    style={{
                        padding: '10px 20px',
                        backgroundColor: editMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(106, 138, 255, 0.2)',
                        border: `1px solid ${editMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(106, 138, 255, 0.3)'}`,
                        color: editMode ? '#ef4444' : 'var(--primary-color)'
                    }}
                >
                    <i className={`fas ${editMode ? 'fa-times' : 'fa-edit'}`}></i>
                    {editMode ? 'Bekor qilish' : 'Tahrirlash'}
                </button>
            </div>

            {error && (
                <div className="error-message" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    padding: '15px',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <i className="fas fa-exclamation-triangle"></i>
                    {error}
                </div>
            )}

            <div className="form-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
            }}>
                <div className="form-group">
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: 'var(--text-color)'
                    }}>
                        <i className="fas fa-user" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                        To'liq Ism
                    </label>
                    <div className="glassmorphism-input">
                        <i className="fas fa-user"></i>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            disabled={!editMode}
                            placeholder="Ismingizni kiriting"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-color)',
                                width: '100%',
                                opacity: editMode ? 1 : 0.7
                            }}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: 'var(--text-color)'
                    }}>
                        <i className="fas fa-phone" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                        Telefon Raqami
                    </label>
                    <div className="glassmorphism-input">
                        <i className="fas fa-phone"></i>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            disabled={!editMode}
                            placeholder="+998901234567"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-color)',
                                width: '100%',
                                opacity: editMode ? 1 : 0.7
                            }}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: 'var(--text-color)'
                    }}>
                        <i className="fab fa-telegram" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                        Telegram Username
                    </label>
                    <div className="glassmorphism-input">
                        <i className="fab fa-telegram"></i>
                        <input
                            type="text"
                            value={formData.telegram_username}
                            onChange={(e) => handleInputChange('telegram_username', e.target.value)}
                            disabled={!editMode}
                            placeholder="@username"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-color)',
                                width: '100%',
                                opacity: editMode ? 1 : 0.7
                            }}
                        />
                    </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: 'var(--text-color)'
                    }}>
                        <i className="fas fa-map-marker-alt" style={{ marginRight: '8px', color: 'var(--primary-color)' }}></i>
                        Manzil
                    </label>
                    <div className="glassmorphism-input" style={{ alignItems: 'flex-start' }}>
                        <i className="fas fa-map-marker-alt" style={{ marginTop: '8px' }}></i>
                        <textarea
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            disabled={!editMode}
                            placeholder="Manzilingizni kiriting"
                            rows="3"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-color)',
                                width: '100%',
                                resize: 'vertical',
                                minHeight: '60px',
                                opacity: editMode ? 1 : 0.7
                            }}
                        />
                    </div>
                </div>
            </div>

            {editMode && (
                <div style={{
                    marginTop: '25px',
                    display: 'flex',
                    gap: '15px',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={() => setEditMode(false)}
                        className="glassmorphism-button"
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'rgba(156, 163, 175, 0.2)',
                            border: '1px solid rgba(156, 163, 175, 0.3)'
                        }}
                    >
                        <i className="fas fa-times"></i>
                        Bekor qilish
                    </button>
                    
                    <button
                        onClick={handleUpdate}
                        disabled={updating}
                        className="glassmorphism-button"
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'rgba(34, 197, 94, 0.2)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            opacity: updating ? 0.7 : 1
                        }}
                    >
                        {updating ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Saqlanmoqda...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                Saqlash
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
});

ProfileForm.displayName = 'ProfileForm';

export default ProfileForm;