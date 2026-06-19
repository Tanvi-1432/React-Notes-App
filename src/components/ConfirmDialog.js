import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useSafeMotion } from '../utils/motionConfig';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);
  const { backdropVariants, confirmVariants } = useSafeMotion();

  useEffect(() => {
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const dialog = (
    <motion.div
      className="confirm-overlay"
      role="presentation"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="confirm-dialog"
        variants={confirmVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {title && <h2 id="confirm-title" className="confirm-dialog__title">{title}</h2>}
        {message && <p id="confirm-message" className="confirm-dialog__message">{message}</p>}
        <div className="confirm-dialog__actions">
          <motion.button
            type="button"
            ref={confirmBtnRef}
            className={`confirm-dialog__btn${isDanger ? ' confirm-dialog__btn--danger' : ''}`}
            onClick={onConfirm}
            whileTap={{ scale: 0.96 }}
          >
            {confirmLabel}
          </motion.button>
          <motion.button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
            whileTap={{ scale: 0.96 }}
          >
            {cancelLabel}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(dialog, document.body);
}
