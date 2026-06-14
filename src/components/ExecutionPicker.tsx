import React from 'react';

export type ExecutionStatus = 'BEST TRADE' | 'GOOD TRADE' | 'AVERAGE TRADE' | 'POOR TRADE' | 'BAD TRADE';

interface ExecutionPickerProps {
  value: ExecutionStatus | null;
  onChange: (value: ExecutionStatus | null) => void;
  id?: string;
}

export const ExecutionPicker: React.FC<ExecutionPickerProps> = ({ value, onChange, id }) => {
  const options: {
    status: ExecutionStatus;
    label: string;
    unselectedClasses: string;
    selectedClasses: string;
  }[] = [
    {
      status: 'BEST TRADE',
      label: 'BEST',
      unselectedClasses: 'border border-green-200 text-green-600 hover:border-green-400 hover:text-green-700',
      selectedClasses: 'bg-green-500/10 border border-green-500 text-green-700 font-bold shadow-sm',
    },
    {
      status: 'GOOD TRADE',
      label: 'GOOD',
      unselectedClasses: 'border border-teal-200 text-teal-600 hover:border-teal-400 hover:text-teal-700',
      selectedClasses: 'bg-teal-500/10 border border-teal-500 text-teal-700 font-bold shadow-sm',
    },
    {
      status: 'AVERAGE TRADE',
      label: 'AVG',
      unselectedClasses: 'border border-amber-200 text-amber-600 hover:border-amber-400 hover:text-amber-700',
      selectedClasses: 'bg-amber-500/10 border border-amber-500 text-amber-700 font-bold shadow-sm',
    },
    {
      status: 'POOR TRADE',
      label: 'POOR',
      unselectedClasses: 'border border-orange-200 text-orange-600 hover:border-orange-400 hover:text-orange-700',
      selectedClasses: 'bg-orange-500/10 border border-orange-500 text-orange-700 font-bold shadow-sm',
    },
    {
      status: 'BAD TRADE',
      label: 'BAD',
      unselectedClasses: 'border border-red-200 text-red-600 hover:border-red-400 hover:text-red-700',
      selectedClasses: 'bg-red-500/10 border border-red-500 text-red-700 font-bold shadow-sm',
    },
  ];

  const handleSelect = (status: ExecutionStatus) => {
    if (value === status) {
      onChange(null); // click currently selected clears it
    } else {
      onChange(status);
    }
  };

  return (
    <div id={id} className="space-y-2 font-sans">
      <label style={{ color: 'var(--text-sub)' }} className="block text-sm font-medium">
        Execution Status
      </label>
      
      <div className="grid grid-cols-5 gap-2 mt-2">
        {options.map((option) => {
          const isSelected = value === option.status;
          return (
            <button
              key={option.status}
              type="button"
              onClick={() => handleSelect(option.status)}
              className={`rounded-xl py-3 text-xs text-center cursor-pointer transition-all ${
                isSelected ? option.selectedClasses : option.unselectedClasses
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
