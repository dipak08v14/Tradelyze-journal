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
      unselectedClasses: 'border border-green-900/60 text-green-500 hover:border-green-700 hover:text-green-400',
      selectedClasses: 'bg-green-900/85 border border-green-500 text-green-300 shadow-lg shadow-green-950/40 font-bold',
    },
    {
      status: 'GOOD TRADE',
      label: 'GOOD',
      unselectedClasses: 'border border-teal-900/60 text-teal-500 hover:border-teal-700 hover:text-teal-400',
      selectedClasses: 'bg-teal-900/85 border border-teal-500 text-teal-300 shadow-lg shadow-teal-950/40 font-bold',
    },
    {
      status: 'AVERAGE TRADE',
      label: 'AVG',
      unselectedClasses: 'border border-amber-900/60 text-amber-500 hover:border-amber-700 hover:text-amber-400',
      selectedClasses: 'bg-amber-900/85 border border-amber-500 text-amber-300 shadow-lg shadow-amber-950/40 font-bold',
    },
    {
      status: 'POOR TRADE',
      label: 'POOR',
      unselectedClasses: 'border border-orange-900/60 text-orange-500 hover:border-orange-700 hover:text-orange-400',
      selectedClasses: 'bg-orange-900/85 border border-orange-500 text-orange-300 shadow-lg shadow-orange-950/40 font-bold',
    },
    {
      status: 'BAD TRADE',
      label: 'BAD',
      unselectedClasses: 'border border-red-900/60 text-red-500 hover:border-red-700 hover:text-red-400',
      selectedClasses: 'bg-red-900/85 border border-red-500 text-red-300 shadow-lg shadow-red-950/40 font-bold',
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
      <label className="block text-sm font-medium text-zinc-300">
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
