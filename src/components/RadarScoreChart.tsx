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
    { name: 'Technical', value: technicalScore },
    { name: 'Psychology', value: psychScore },
    { name: 'Risk Mgmt', value: riskScore },
  ];

  return (
    <div className="w-full h-[260px] min-h-[220px] min-w-[220px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(0,0,0,0.08)" />
          <PolarAngleAxis dataKey="name" />
          <PolarRadiusAxis domain={[0, 100]} tickCount={4} />
          <Radar
            name="Score"
            dataKey="value"
            stroke="var(--accent)"
            fill="var(--accent)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
