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
    if (val >= 70) return 'text-green-600';
    if (val >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div id={id} className="space-y-1.5 font-sans">
      <div className="flex justify-between items-center text-sm">
        <span style={{ color: 'var(--text-sub)' }} className="font-medium">{label}</span>
        <span className={`font-bold ${getScoreColor(value)}`}>
          {value.toFixed(0)}%
        </span>
      </div>
      
      <div style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }} className="w-full h-2.5 rounded-full border overflow-hidden">
        <div
          className={`h-full ${fillColorClass} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      
      <div style={{ color: 'var(--text-muted)' }} className="text-[11px]">
        {subLabel}
      </div>
    </div>
  );
};
