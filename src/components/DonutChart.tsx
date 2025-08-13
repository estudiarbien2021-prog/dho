import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DonutData {
  name: string;
  value: number;
  odds?: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  title: string;
  centerText?: string;
}

export function DonutChart({ data, title, centerText }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface p-2 border border-surface-strong rounded shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-xs text-text-weak">
            {(data.value * 100).toFixed(1)}%
            {data.odds && ` (${data.odds.toFixed(2)})`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface p-4 rounded-lg border border-surface-strong">
      <h3 className="text-sm font-medium text-text mb-2 text-center">{title}</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {centerText && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-medium text-text">{centerText}</div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 space-y-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-text">{item.name}</span>
            </div>
            <div className="text-text-weak">
              {(item.value * 100).toFixed(1)}%
              {item.odds && ` (${item.odds.toFixed(2)})`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}