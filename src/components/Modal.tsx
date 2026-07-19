import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 transition-all duration-200"
      onClick={onClose}
    >
      <div
        className="border rounded-2xl p-6 w-full max-w-md shadow-2xl relative font-sans"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
          animation: 'tradelyzeModalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: 'var(--text)' }} className="text-xl font-bold font-display">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bar)] hover:text-[var(--text)] transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ color: 'var(--text-sub)' }}>{children}</div>
      </div>
      
      <style>{`
        @keyframes tradelyzeModalSlideUp {
          from {
            transform: translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
