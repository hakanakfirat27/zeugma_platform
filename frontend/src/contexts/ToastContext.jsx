// frontend/src/contexts/ToastContext.jsx
// Global toast context that persists across page navigation
import React, { createContext, useContext, useState, useCallback } from 'react';

let toastId = 0;

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = toastId++;
    const newToast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Convenience methods with default durations (4 seconds)
  const success = useCallback((message, duration = 4000) => showToast(message, 'success', duration), [showToast]);
  const error = useCallback((message, duration = 5000) => showToast(message, 'error', duration), [showToast]);
  const warning = useCallback((message, duration = 4000) => showToast(message, 'warning', duration), [showToast]);
  const info = useCallback((message, duration = 3000) => showToast(message, 'info', duration), [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
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
