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
    { metric: 'Psychology', score: parseFloat(psychScore.toFixed(1)) },
    { metric: 'Risk Mgmt', score: parseFloat(riskScore.toFixed(1)) },
  ];

  return (
    <div className="w-full h-[260px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
          <PolarGrid stroke="var(--bar)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Inter' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#4B5563', fontSize: 9 }}
            tickCount={4}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.18}
            dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
