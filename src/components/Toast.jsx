import { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast show ${type === 'error' ? 'error' : ''}`}>
      {message}
    </div>
  );
}
