import React from 'react';

interface RuleAdherenceRow {
  id: string;
  rule_id: string;
  rule_type: 'entry' | 'exit';
  rule_order: number;
  rule_text: string;
  followed: boolean | null;
}

interface RuleChecklistDisplayProps {
  rules: RuleAdherenceRow[];
  ruleType: 'entry' | 'exit';
}

export const RuleChecklistDisplay: React.FC<RuleChecklistDisplayProps> = ({
  rules,
  ruleType
}) => {
  if (rules.length === 0) {
    return (
      <div className="text-zinc-500 text-sm italic py-4">
        No {ruleType} rules recorded for this trade.
      </div>
    );
  }

  const followedCount = rules.filter(r => r.followed === true).length;

  return (
    <div className="space-y-1 mt-4">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-start gap-3 py-2.5 border-b border-zinc-800/60 last:border-0"
        >
          {/* Order Badge */}
          <span className="text-xs font-mono font-bold bg-zinc-950 border border-zinc-800 text-zinc-500 rounded px-2 py-0.5 w-9 text-center shrink-0 mt-0.5">
            #{rule.rule_order}
          </span>

          {/* Rule Text */}
          <span className="text-sm text-zinc-200 flex-1 leading-snug">
            {rule.rule_text}
          </span>

          {/* Read-only Followed value badge */}
          <div className="shrink-0">
            {rule.followed === true ? (
              <span className="inline-block bg-green-950/85 border border-green-700/80 text-green-400 rounded-md px-3 py-1 text-xs font-extrabold font-mono">
                Y
              </span>
            ) : rule.followed === false ? (
              <span className="inline-block bg-red-950/85 border border-red-700/80 text-red-400 rounded-md px-3 py-1 text-xs font-extrabold font-mono">
                N
              </span>
            ) : (
              <span className="inline-block bg-zinc-850/80 border border-zinc-700 text-zinc-500 rounded-md px-3 py-1 text-xs font-extrabold font-mono">
                —
              </span>
            )}
          </div>
        </div>
      ))}
      <div className="text-xs text-zinc-500 mt-3 font-medium">
        {followedCount} of {rules.length} {ruleType} rules followed
      </div>
    </div>
  );
};
