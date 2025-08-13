import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { ProcessedMatch } from '@/types/match';

interface VigorishChartProps {
  matches: ProcessedMatch[];
}

export function VigorishChart({ matches }: VigorishChartProps) {
  const data = React.useMemo(() => {
    const bins = [
      { name: '0-5%', min: 0, max: 0.05, vig1x2: 0, vigBtts: 0, vigOu: 0 },
      { name: '5-10%', min: 0.05, max: 0.10, vig1x2: 0, vigBtts: 0, vigOu: 0 },
      { name: '10-15%', min: 0.10, max: 0.15, vig1x2: 0, vigBtts: 0, vigOu: 0 },
      { name: '15-20%', min: 0.15, max: 0.20, vig1x2: 0, vigBtts: 0, vigOu: 0 },
      { name: '20%+', min: 0.20, max: 1, vig1x2: 0, vigBtts: 0, vigOu: 0 },
    ];

    matches.forEach(match => {
      // 1X2 vigorish
      const bin1x2 = bins.find(b => match.vig_1x2 >= b.min && match.vig_1x2 < b.max);
      if (bin1x2) bin1x2.vig1x2++;

      // BTTS vigorish
      if (match.vig_btts > 0) {
        const binBtts = bins.find(b => match.vig_btts >= b.min && match.vig_btts < b.max);
        if (binBtts) binBtts.vigBtts++;
      }

      // Over/Under vigorish
      if (match.vig_ou_2_5 > 0) {
        const binOu = bins.find(b => match.vig_ou_2_5 >= b.min && match.vig_ou_2_5 < b.max);
        if (binOu) binOu.vigOu++;
      }
    });

    return bins;
  }, [matches]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--surface-strong))" />
        <XAxis dataKey="name" stroke="hsl(var(--text-mute))" fontSize={12} />
        <YAxis stroke="hsl(var(--text-mute))" fontSize={12} />
        <Legend />
        <Bar 
          dataKey="vig1x2" 
          name="1X2" 
          fill="hsl(var(--brand))" 
          radius={[2, 2, 0, 0]} 
        />
        <Bar 
          dataKey="vigBtts" 
          name="BTTS" 
          fill="hsl(var(--brand-400))" 
          radius={[2, 2, 0, 0]} 
        />
        <Bar 
          dataKey="vigOu" 
          name="O/U 2.5" 
          fill="hsl(var(--brand-300))" 
          radius={[2, 2, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
}