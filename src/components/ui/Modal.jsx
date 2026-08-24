import React, { useEffect } from 'react';

const Modal = ({ open, onClose, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className={`bg-surface-container-lowest rounded-3xl ${maxWidth} w-full shadow-2xl border border-outline-variant/40 animate-scaleIn overflow-hidden`}>
        {children}
      </div>
    </div>
  );
};

export default Modal;
