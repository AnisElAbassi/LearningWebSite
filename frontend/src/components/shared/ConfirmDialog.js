import React from 'react';
import Modal from '../layout/Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', variant = 'danger' }) {
  const btnClass = variant === 'danger' ? 'btn-pg-danger' : 'btn-pg-primary';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm'} size="sm">
      <p className="text-sm text-gray-300 mb-6">{message || 'Are you sure? This action cannot be undone.'}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-pg-ghost text-sm">Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }} className={`${btnClass} text-sm`}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
