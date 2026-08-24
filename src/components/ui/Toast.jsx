import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext({ toast: () => {} });

const ICONS = {
  success: { icon: 'check_circle', cls: 'bg-secondary-container text-on-secondary-container border-secondary/30' },
  error: { icon: 'error', cls: 'bg-error-container text-on-error-container border-error/30' },
  info: { icon: 'info', cls: 'bg-surface-container-high text-primary border-outline-variant/30' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => dismiss(id), 3200);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(({ id, message, type }) => {
          const cfg = ICONS[type] || ICONS.info;
          return (
            <div
              key={id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-sm animate-slideInRight min-w-[280px] max-w-sm ${cfg.cls}`}
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">{cfg.icon}</span>
              <span className="text-sm font-label-md flex-1">{message}</span>
              <button onClick={() => dismiss(id)} className="opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
