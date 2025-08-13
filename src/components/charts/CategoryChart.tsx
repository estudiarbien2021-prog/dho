import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ProcessedMatch } from '@/types/match';
import { Language, useTranslation } from '@/lib/i18n';

interface CategoryChartProps {
  matches: ProcessedMatch[];
  currentLang: Language;
}

export function CategoryChart({ matches, currentLang }: CategoryChartProps) {
  const t = useTranslation(currentLang);

  const data = React.useMemo(() => {
    const categories = matches.reduce((acc, match) => {
      acc[match.category] = (acc[match.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: t.first_div, count: categories.first_div || 0, fill: 'hsl(var(--brand))' },
      { name: t.second_div, count: categories.second_div || 0, fill: 'hsl(var(--brand-400))' },
      { name: t.continental_cup, count: categories.continental_cup || 0, fill: 'hsl(var(--brand-300))' },
      { name: t.national_cup, count: categories.national_cup || 0, fill: 'hsl(var(--brand-200))' },
    ].filter(item => item.count > 0);
  }, [matches, t]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--surface-strong))" />
        <XAxis 
          dataKey="name" 
          stroke="hsl(var(--text-mute))"
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis stroke="hsl(var(--text-mute))" fontSize={12} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}