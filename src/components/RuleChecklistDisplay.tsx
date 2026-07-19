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
      <div className="text-sm italic py-4" style={{ color: 'var(--text-muted)' }}>
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
          <span className="text-xs font-mono font-bold border rounded px-2 py-0.5 w-9 text-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--bar)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            #{rule.rule_order}
          </span>

          {/* Rule Text */}
          <span className="text-sm flex-1 leading-snug" style={{ color: 'var(--text)' }}>
            {rule.rule_text}
          </span>

          {/* Read-only Followed value badge */}
          <div className="shrink-0">
            {rule.followed === true ? (
              <span style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }} className="inline-block font-sans">
                Y
              </span>
            ) : rule.followed === false ? (
              <span style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }} className="inline-block font-sans">
                N
              </span>
            ) : (
              <span className="font-bold font-mono" style={{ color: 'var(--text-muted)' }}>—</span>
            )}
          </div>
        </div>
      ))}
      <div className="text-xs mt-3 font-medium" style={{ color: 'var(--text-muted)' }}>
        {followedCount} of {rules.length} {ruleType} rules followed
      </div>
    </div>
  );
};
