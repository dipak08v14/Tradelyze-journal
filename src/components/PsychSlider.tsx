import React from 'react';

interface PsychSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint: string;
  valueColorClass?: string;
  accentClass?: string;
  id?: string;
}

export const PsychSlider: React.FC<PsychSliderProps> = ({
  label,
  value,
  onChange,
  hint,
  valueColorClass = 'text-indigo-400',
  accentClass = 'accent-indigo-500',
  id
}) => {
  return (
    <div id={id} className="space-y-1 font-sans">
      <div className="flex justify-between items-center text-sm">
        <span className="text-zinc-300 font-medium">{label}</span>
        <span className={`font-bold ${valueColorClass}`}>{value}%</span>
      </div>
      
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className={`w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${accentClass}`}
      />
      
      <div className="text-[11px] text-zinc-500 italic">
        {hint}
      </div>
    </div>
  );
};
