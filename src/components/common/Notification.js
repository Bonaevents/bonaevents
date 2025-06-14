import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const Notification = ({ message, type = 'info', duration = 3000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // Vibrazione per feedback tattile su mobile (solo per errori e warning)
  useEffect(() => {
    if (window.navigator.vibrate && (type === 'error' || type === 'warning')) {
      window.navigator.vibrate(200);
    }
  }, [type]);

  return createPortal(
    <div className={`notification ${type}`} role="alert">
      {message}
    </div>,
    document.body
  );
};

export default Notification; 