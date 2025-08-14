import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Eye, BarChart3 } from 'lucide-react';

interface KPIHeaderProps {
  stats: {
    total: number;
    lowVig: number;
    watchBtts: number;
    watchOver25: number;
    avgVig: number;
  };
}

export function KPIHeader({ stats }: KPIHeaderProps) {
  const kpis = [
    {
      label: 'Total Matchs',
      value: stats.total,
      icon: BarChart3,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Low Vig (≤12%)',
      value: stats.lowVig,
      percentage: stats.total > 0 ? (stats.lowVig / stats.total * 100).toFixed(1) : '0',
      icon: TrendingUp,
      color: 'bg-green-500/10 text-green-600',
    },
    {
      label: 'Recommandations BTTS',
      value: stats.watchBtts,
      icon: Target,
      color: 'bg-yellow-500/10 text-yellow-600',
    },
    {
      label: 'Recommandations O/U 2.5',
      value: stats.watchOver25,
      icon: Eye,
      color: 'bg-blue-500/10 text-blue-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
      {kpis.map((kpi, index) => (
        <Card key={index} className="p-3 sm:p-6 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                {kpi.label}
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-lg sm:text-2xl font-bold text-foreground">
                  {kpi.value}
                </span>
                {'percentage' in kpi && (
                  <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                    {kpi.percentage}%
                  </Badge>
                )}
              </div>
            </div>
            <div className={`p-2 sm:p-3 rounded-lg ${kpi.color} self-end lg:self-auto`}>
              <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </Card>
      ))}
      
      {/* Average Vig Card */}
      <Card className="p-3 sm:p-6 col-span-2 lg:col-span-4 animate-fade-in" style={{ animationDelay: '500ms' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
              Marge Moyenne (Vig 1X2)
            </p>
            <span className="text-lg sm:text-xl font-bold text-foreground">
              {(stats.avgVig * 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="text-right flex-1 sm:flex-none">
              <p className="text-xs text-muted-foreground">Objectif: &lt; 12%</p>
              <p className={`text-xs sm:text-sm font-medium ${stats.avgVig <= 0.12 ? 'text-green-600' : 'text-yellow-600'}`}>
                {stats.avgVig <= 0.12 ? 'Excellent' : 'Élevé'}
              </p>
            </div>
            <div className="w-16 sm:w-24 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${stats.avgVig <= 0.12 ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${Math.min(stats.avgVig * 100 / 15 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}