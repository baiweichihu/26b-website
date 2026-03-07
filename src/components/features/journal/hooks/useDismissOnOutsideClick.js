import { useEffect } from 'react';

export const useDismissOnOutsideClick = (ref, isOpen, onDismiss) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onDismiss();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, isOpen, onDismiss]);
};
