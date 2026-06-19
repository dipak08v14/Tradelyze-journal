import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

interface RadarScoreChartProps {
  technicalScore: number;
  psychScore: number;
  riskScore: number;
}

export const RadarScoreChart: React.FC<RadarScoreChartProps> = ({
  technicalScore,
  psychScore,
  riskScore
}) => {
  const radarData = [
    { metric: 'Technical', score: parseFloat(technicalScore.toFixed(1)) },
    { metric: 'Risk Mgmt', score: parseFloat(riskScore.toFixed(1)) },
    { metric: 'Psychology', score: parseFloat(psychScore.toFixed(1)) },
  ];

  return (
    <div className="w-full h-[260px] min-h-[220px] min-w-[220px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData} startAngle={90} endAngle={450}>
          <PolarGrid stroke="rgba(0,0,0,0.08)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: 'var(--text-sub)', fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.15}
            dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
