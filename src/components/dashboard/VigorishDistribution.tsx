import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProcessedMatch } from '@/types/match';

interface VigorishDistributionProps {
  matches: ProcessedMatch[];
}

export function VigorishDistribution({ matches }: VigorishDistributionProps) {
  const data = React.useMemo(() => {
    const bins = [
      { range: '0-3%', min: 0, max: 0.03, count: 0, color: '#22c55e' },
      { range: '3-6%', min: 0.03, max: 0.06, count: 0, color: '#84cc16' },
      { range: '6-9%', min: 0.06, max: 0.09, count: 0, color: '#eab308' },
      { range: '9-12%', min: 0.09, max: 0.12, count: 0, color: '#f59e0b' },
      { range: '12-15%', min: 0.12, max: 0.15, count: 0, color: '#ef4444' },
      { range: '15%+', min: 0.15, max: 1, count: 0, color: '#dc2626' },
    ];

    matches.forEach(match => {
      const bin = bins.find(b => match.vig_1x2 >= b.min && match.vig_1x2 < b.max);
      if (bin) bin.count++;
    });

    return bins.filter(bin => bin.count > 0);
  }, [matches]);

  if (matches.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Distribution des Marges (Vig)</h3>
        <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Distribution des Marges (Vig 1X2)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis 
              dataKey="range" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))'
              }}
              formatter={(value: number) => [value, 'Matchs']}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        <p>• Idéal : 0-12% (marge faible)</p>
        <p>• Élevé : 12%+ (éviter)</p>
      </div>
    </Card>
  );
}