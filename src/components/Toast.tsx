import React from 'react';
import { useToast } from '../hooks/useToast';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        let cardStyle = '';
        let Icon = CheckCircle2;
        let iconColor = '';

        switch (toast.type) {
          case 'SUCCESS':
            cardStyle = 'bg-green-950/95 border border-green-700 text-green-100';
            Icon = CheckCircle2;
            iconColor = 'text-green-400';
            break;
          case 'ERROR':
            cardStyle = 'bg-red-950/95 border border-red-700 text-red-100';
            Icon = XCircle;
            iconColor = 'text-red-400';
            break;
          case 'WARNING':
            cardStyle = 'bg-amber-950/95 border border-amber-700 text-amber-100';
            Icon = AlertCircle;
            iconColor = 'text-amber-400';
            break;
        }

        return (
          <div
            key={toast.id}
            className={`rounded-xl p-4 flex items-start gap-3 shadow-2xl min-w-[300px] max-w-[400px] pointer-events-auto transition-all duration-300 ${cardStyle}`}
            style={{
              animation: 'tradelyzeToastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-sm font-medium mr-1 text-gray-100 break-words">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded hover:bg-white/10"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      
      <style>{`
        @keyframes tradelyzeToastSlideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
