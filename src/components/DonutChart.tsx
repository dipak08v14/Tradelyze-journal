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
    <div className="bg-[#1A1D27] border border-[#2A2D3A] rounded-xl p-4 flex flex-col justify-between h-[280px]">
      <div className="text-sm font-semibold text-zinc-100 tracking-tight">{title}</div>
      
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
                    backgroundColor: '#1A1D27',
                    border: '1px solid #2A2D3A',
                    borderRadius: '8px',
                    color: '#F9FAFB',
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
          <span className="text-xl font-extrabold text-zinc-100 leading-tight">
            {displayPrimary}
          </span>
          {displaySecondary && (
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-0.5">
              {displaySecondary}
            </span>
          )}
        </div>
      </div>

      {/* Legend below chart: small colored dots + labels with counts */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-400 border-t border-zinc-800/40 pt-2 shrink-0">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate max-w-[80px]" title={item.name}>
              {item.name}
            </span>
            <span className="text-zinc-500 font-mono">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};
