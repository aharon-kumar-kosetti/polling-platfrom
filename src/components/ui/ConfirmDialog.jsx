import React from 'react';
import Modal from './Modal';

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
}) => {
  const toneStyles =
    tone === 'danger'
      ? { icon: 'bg-error-container text-error', btn: 'bg-error text-on-error hover:brightness-110' }
      : { icon: 'bg-secondary-container text-on-secondary-container', btn: 'bg-primary text-on-primary hover:bg-primary-container' };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${toneStyles.icon}`}>
            <span className={`material-symbols-outlined ${tone === 'danger' ? '' : ''}`}>{tone === 'danger' ? 'delete' : 'help'}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-headline-lg text-lg font-bold text-primary">{title}</h3>
            <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary p-1.5 rounded-full hover:bg-surface-container transition-colors -mt-1 -mr-1"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-5 py-2.5 rounded-full font-label-md text-sm border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container transition-colors press-effect disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-5 py-2.5 rounded-full font-label-md text-sm transition-all shadow-sm flex items-center gap-2 press-effect disabled:opacity-60 ${toneStyles.btn}`}
          >
            {busy && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
