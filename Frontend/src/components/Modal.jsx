import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import Button from './Button';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full mx-4',
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal panel - reduced glassmorphism effect */}
      <div
        className={`relative z-50 backdrop-blur-lg bg-gradient-to-br from-white/70 via-white/65 to-white/60 border border-white/40 rounded-2xl text-left overflow-hidden transform transition-all w-full mx-4 ${sizes[size]}`}
        style={{
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(12px) saturate(130%)',
          WebkitBackdropFilter: 'blur(12px) saturate(130%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glass overlay effect - reduced */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none rounded-2xl" />
        
        {/* Header - reduced glassmorphism */}
        {title && (
          <div 
            className="relative px-6 py-4 border-b border-gray-200/50 backdrop-blur-sm bg-white/70 flex justify-between items-center"
            style={{
              backdropFilter: 'blur(8px) saturate(120%)',
              WebkitBackdropFilter: 'blur(8px) saturate(120%)',
            }}
          >
            <h3
              className="text-lg font-semibold text-gray-900"
              id="modal-title"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none backdrop-blur-sm bg-white/40 hover:bg-white/60 border border-white/30 rounded-lg p-1.5 transition-all"
              style={{
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body - reduced glassmorphism */}
        <div 
          className="relative px-6 py-4 overflow-visible backdrop-blur-sm bg-white/60"
          style={{
            backdropFilter: 'blur(8px) saturate(110%)',
            WebkitBackdropFilter: 'blur(8px) saturate(110%)',
          }}
        >
          {children}
        </div>

        {/* Footer - reduced glassmorphism */}
        {footer && (
          <div 
            className="relative px-6 py-4 border-t border-gray-200/50 backdrop-blur-sm bg-white/70 flex justify-end gap-3"
            style={{
              backdropFilter: 'blur(8px) saturate(120%)',
              WebkitBackdropFilter: 'blur(8px) saturate(120%)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

