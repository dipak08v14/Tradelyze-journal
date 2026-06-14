import React from 'react';

interface TypeBadgeProps {
  type: 'Breakout' | 'Reversal' | 'Neutral' | string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  switch (type) {
    case 'Breakout':
      return (
        <span className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-0.5 border bg-blue-950/80 text-blue-400 border-blue-800">
          Breakout
        </span>
      );
    case 'Reversal':
      return (
        <span className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-0.5 border bg-purple-950/80 text-purple-400 border-purple-800">
          Reversal
        </span>
      );
    case 'Neutral':
      return (
        <span className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-0.5 border bg-gray-800/80 text-gray-400 border-gray-600">
          Neutral
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center text-xs font-semibold rounded-full px-3 py-0.5 border bg-gray-800 text-gray-400 border-gray-700">
          {type}
        </span>
      );
  }
};
