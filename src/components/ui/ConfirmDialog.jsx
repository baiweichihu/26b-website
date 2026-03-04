import React from 'react';
import styles from './ConfirmDialog.module.css';

const ConfirmDialog = ({
  open,
  title = '确认操作',
  message = '确认继续吗？',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  confirmDisabled = false,
}) => {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.text}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
