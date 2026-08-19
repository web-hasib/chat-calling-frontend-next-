'use client';

import React from 'react';
import styles from './CallOverlay.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: string;
  submitLabel?: string;
  submitColor?: string;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  icon,
  submitLabel = 'Confirm',
  submitColor,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.confirmModalOverlay} onClick={onClose}>
      <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
        {icon && <div style={{ fontSize: '42px', marginBottom: '12px' }}>{icon}</div>}
        <h4 className={styles.confirmTitle} style={{ color: icon ? '#ffffff' : '#ef4444' }}>
          {title}
        </h4>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <button className={styles.confirmCancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.confirmSubmitBtn}
            style={submitColor ? { background: submitColor } : undefined}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
