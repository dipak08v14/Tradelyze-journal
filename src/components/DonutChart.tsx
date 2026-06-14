import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DonutChartProps {
  title: string;
  data: Array<{ name: string; value: number; color: string }>;
  centerPrimary: React.ReactNode;
  centerSecondary: React.ReactNode;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  data,
  centerPrimary,
  centerSecondary,
}) => {
  const isAllZero = data.every((item) => item.value === 0);

  // Fallback for all-zero data
  const chartData = isAllZero
    ? [{ name: 'No Data', value: 1, color: '#374151' }]
    : data.filter((item) => item.value > 0);

  const displayPrimary = isAllZero ? 'No Data' : centerPrimary;
  const displaySecondary = isAllZero ? '—' : centerSecondary;

  return (
    <div className="rounded-xl p-4 flex flex-col justify-between h-[280px]" style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }}>
      <div className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text)' }}>{title}</div>
      
      <div className="relative flex-1 flex items-center justify-center my-1">
        <div className="w-full h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="75%"
                paddingAngle={isAllZero ? 0 : 2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              {!isAllZero && (
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '0.5px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [value, name]}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Absolutely Centered Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-extrabold leading-tight" style={{ color: 'var(--text)' }}>
            {displayPrimary}
          </span>
          {displaySecondary && (
            <span className="text-[10px] font-mono tracking-wider uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {displaySecondary}
            </span>
          )}
        </div>
      </div>

      {/* Legend below chart: small colored dots + labels with counts */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] border-t pt-2 shrink-0" style={{ borderColor: 'var(--border)', color: 'var(--text-sub)' }}>
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate max-w-[80px]" title={item.name}>
              {item.name}
            </span>
            <span className="font-mono text-zinc-550" style={{ color: 'var(--text-muted)' }}>({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};
