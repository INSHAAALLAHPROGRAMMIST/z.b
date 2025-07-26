import React from 'react';
import AdminModal from './AdminModal';
import AdminButton from './AdminButton';

const DeleteConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    itemName,
    itemType = "element",
    warningMessage = null
}) => {
    return (
        <AdminModal
            isOpen={isOpen}
            onClose={onClose}
            title={`${itemType}ni o'chirish`}
            size="small"
        >
            <p>
                Haqiqatan ham <strong>{itemName}</strong> {itemType}ini o'chirmoqchimisiz?
                {warningMessage && (
                    <>
                        <br />
                        <strong className="text-danger">Diqqat:</strong> {warningMessage}
                    </>
                )}
            </p>
            
            <div className="form-actions">
                <AdminButton variant="cancel" onClick={onClose}>
                    Bekor qilish
                </AdminButton>
                <AdminButton variant="delete" onClick={onConfirm}>
                    O'chirish
                </AdminButton>
            </div>
        </AdminModal>
    );
};

export default DeleteConfirmModal;