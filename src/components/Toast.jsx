import { useEffect } from 'react';
import './Toast.css';

export default function Toast({
  message,
  type = 'success',
  onClose,
  duration = 3000,
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`toast show ${type === 'error' ? 'error' : ''}`}>
      {message}
    </div>
  );
}
