import React from 'react';

interface PsychSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint: string;
  valueColorClass?: string;
  accentClass?: string;
  accentColor?: string;
  id?: string;
}

export const PsychSlider: React.FC<PsychSliderProps> = ({
  label,
  value,
  onChange,
  hint,
  valueColorClass = 'text-indigo-600',
  accentClass = 'accent-indigo-500',
  accentColor,
  id
}) => {
  return (
    <div id={id} className="space-y-1 font-sans">
      <div className="flex justify-between items-center text-sm">
        <span style={{ color: 'var(--text-sub)' }} className="font-medium">{label}</span>
        <span className={`font-bold ${valueColorClass}`}>{value}%</span>
      </div>
      
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ backgroundColor: 'var(--bar)', accentColor: accentColor || 'var(--accent)' }}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
      />
      
      <div style={{ color: 'var(--text-muted)' }} className="text-[11px] italic">
        {hint}
      </div>
    </div>
  );
};
