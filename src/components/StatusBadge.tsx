import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'not_working' | 'retired' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'active':
      return (
        <span style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }} className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
          Active
        </span>
      );
    case 'not_working':
      return (
        <span style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }} className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-1">
          <span className="mr-1">⚠</span>
          Not Working
        </span>
      );
    case 'retired':
      return (
        <span style={{ backgroundColor: 'rgba(148,163,184,0.12)', color: '#94a3b8' }} className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-1">
          <span className="mr-1">—</span>
          Retired
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-1 border bg-gray-800 text-gray-400 border-gray-700">
          {status}
        </span>
      );
  }
};
