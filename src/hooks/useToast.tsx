import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'SUCCESS' | 'ERROR' | 'WARNING';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      if (next.length > 3) {
        // Remove the oldest toast
        return next.slice(next.length - 3);
      }
      return next;
    });

    // Auto-dismiss after 3s
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  const showSuccess = useCallback((message: string) => addToast('SUCCESS', message), [addToast]);
  const showError = useCallback((message: string) => addToast('ERROR', message), [addToast]);
  const showWarning = useCallback((message: string) => addToast('WARNING', message), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, showSuccess, showError, showWarning, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
