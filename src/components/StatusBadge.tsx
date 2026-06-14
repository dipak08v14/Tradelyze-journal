import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'not_working' | 'retired' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center text-xs font-medium rounded-full px-3 py-1 border bg-green-950/80 text-green-400 border-green-800">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 animate-pulse" />
          Active
        </span>
      );
    case 'not_working':
      return (
        <span className="inline-flex items-center text-xs font-medium rounded-full px-3 py-1 border bg-amber-950/80 text-amber-400 border-amber-800">
          <span className="mr-1">⚠</span>
          Not Working
        </span>
      );
    case 'retired':
      return (
        <span className="inline-flex items-center text-xs font-medium rounded-full px-3 py-1 border bg-gray-800/80 text-gray-400 border-gray-600">
          <span className="mr-1">—</span>
          Retired
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center text-xs font-medium rounded-full px-3 py-1 border bg-gray-800 text-gray-400 border-gray-700">
          {status}
        </span>
      );
  }
};
