import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';

interface RadarScoreChartProps {
  technicalScore: number;
  psychScore: number;
  riskScore: number;
}

const RadarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '4px 8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          minWidth: '0px',
          whiteSpace: 'nowrap'
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 500,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1px'
          }}
        >
          {item.payload.metric}
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--accent)'
          }}
        >
          {item.value}%
        </div>
      </div>
    );
  }
  return null;
};

export const RadarScoreChart: React.FC<RadarScoreChartProps> = ({
  technicalScore,
  psychScore,
  riskScore
}) => {
  const radarData = [
    { metric: 'Technical', score: technicalScore },
    { metric: 'Psychology', score: psychScore },
    { metric: 'Risk Mgmt', score: riskScore },
  ];

  return (
    <>
      <style>{`
        .trading-metrics-radar .recharts-polar-grid-angle line {
          stroke-width: 1 !important;
          stroke-opacity: 0.3 !important;
        }
      `}</style>
      <div
        className="w-full flex items-center justify-center mt-2 trading-metrics-radar"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ width: '100%', height: '220px', outline: 'none', userSelect: 'none' }}
      >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="88%"
          data={radarData}
        >
          <PolarGrid
            gridType="polygon"
            stroke="var(--accent)"
            strokeOpacity={0.15}
            strokeWidth={10}
            strokeLinecap="round"
            style={{ strokeLinejoin: 'round' }}
            fill="var(--accent)"
            fillOpacity={0.06}
          />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: 'var(--text)', fontSize: 11, fontFamily: 'Inter' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            tickCount={3}
          />
          <Radar
            name="Avg Score"
            dataKey="score"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.12}
            strokeWidth={1.6}
            strokeOpacity={1}
            dot={{
              r: 4,
              fill: 'var(--accent)',
              stroke: 'var(--accent)',
              strokeWidth: 1
            }}
          />
          <RechartsTooltip content={<RadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
    </>
  );
};

