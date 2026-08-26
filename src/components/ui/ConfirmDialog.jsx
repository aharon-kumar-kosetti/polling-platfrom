import React from 'react';
import Modal from './Modal';
import Button from './Button';

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
  const iconCls = tone === 'danger'
    ? 'bg-error-container text-error'
    : 'bg-secondary-container text-on-secondary-container';

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconCls}`}>
            <span className="material-symbols-outlined">{tone === 'danger' ? 'delete' : 'help'}</span>
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
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
