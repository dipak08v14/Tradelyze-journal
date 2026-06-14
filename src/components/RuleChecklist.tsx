import React from 'react';
import { Target } from 'lucide-react';
import { StagedRuleState } from '../types';

interface RuleChecklistProps {
  rules: StagedRuleState[];
  onChange: (ruleId: string, followed: boolean | null) => void;
  ruleType: 'entry' | 'exit';
  strategySelected: boolean;
  id?: string;
}

export const RuleChecklist: React.FC<RuleChecklistProps> = ({
  rules,
  onChange,
  ruleType,
  strategySelected,
  id
}) => {
  if (!strategySelected) {
    return (
      <div className="py-8 text-center flex flex-col items-center">
        <Target className="text-zinc-650 w-8 h-8 mx-auto" />
        <p className="text-zinc-500 text-sm mt-2 font-medium">
          Select a strategy above to load {ruleType} rules
        </p>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center text-zinc-500 text-sm italic py-6">
        No {ruleType} rules defined for this strategy. Edit the strategy to add them.
      </div>
    );
  }

  const handleToggle = (ruleId: string, button: 'Y' | 'N', currentFollowed: boolean | null) => {
    if (button === 'Y') {
      // Toggle to true, or reset to null if already true
      onChange(ruleId, currentFollowed === true ? null : true);
    } else {
      // Toggle to false, or reset to null if already false
      onChange(ruleId, currentFollowed === false ? null : false);
    }
  };

  return (
    <div id={id} className="space-y-1 mt-4">
      {rules.map((rule, idx) => (
        <div
          key={rule.id}
          className="flex items-center gap-3 py-2.5 border-b border-zinc-800/60 last:border-0"
        >
          {/* Order Badge */}
          <span className="text-xs font-mono font-bold bg-zinc-950 border border-zinc-800 text-zinc-500 rounded px-2 py-0.5 w-9 text-center shrink-0">
            #{rule.rule_order}
          </span>

          {/* Rule Text */}
          <span className="text-sm text-zinc-200 flex-1 leading-snug">
            {rule.rule_text}
          </span>

          {/* Y/N Toggles */}
          <div className="flex gap-1.5 shrink-0">
            {/* Yes Option */}
            <button
              type="button"
              onClick={() => handleToggle(rule.id, 'Y', rule.followed)}
              className={`px-3 py-1 text-sm rounded-md transition-all cursor-pointer ${
                rule.followed === true
                  ? 'bg-green-900 border border-green-600 text-green-300 font-bold'
                  : 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-green-600 hover:text-green-400'
              }`}
            >
              Y
            </button>

            {/* No Option */}
            <button
              type="button"
              onClick={() => handleToggle(rule.id, 'N', rule.followed)}
              className={`px-3 py-1 text-sm rounded-md transition-all cursor-pointer ${
                rule.followed === false
                  ? 'bg-red-900 border border-red-600 text-red-300 font-bold'
                  : 'bg-transparent border border-zinc-800 text-zinc-500 hover:border-red-600 hover:text-red-400'
              }`}
            >
              N
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
