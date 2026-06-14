import React from 'react';

interface ScoreBarProps {
  label: string;
  value: number;
  subLabel: string;
  fillColorClass?: string;
  id?: string;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  value,
  subLabel,
  fillColorClass = 'bg-indigo-600',
  id
}) => {
  const getScoreColor = (val: number) => {
    if (val >= 70) return 'text-green-400';
    if (val >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div id={id} className="space-y-1.5 font-sans">
      <div className="flex justify-between items-center text-sm">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className={`font-bold ${getScoreColor(value)}`}>
          {value.toFixed(0)}%
        </span>
      </div>
      
      <div className="w-full h-2.5 bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden">
        <div
          className={`h-full ${fillColorClass} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      
      <div className="text-[11px] text-zinc-500">
        {subLabel}
      </div>
    </div>
  );
};
