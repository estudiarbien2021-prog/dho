import React, { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/card';

interface RadarChartProps {
  homeTeam: string;
  awayTeam: string;
  matchId: string;
  isActive: boolean;
}

export function TeamRadarChart({ homeTeam, awayTeam, matchId, isActive }: RadarChartProps) {
  const [animatedData, setAnimatedData] = useState<any[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState(-1);

  // Generate deterministic data based on match ID
  const generateTeamData = (team: string, isHome: boolean) => {
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    const seed = hashCode(matchId + team);
    const seededRandom = (index: number) => {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    };

    const baseValues = [
      65 + seededRandom(1) * 25, // Attaque
      60 + seededRandom(2) * 30, // Défense
      55 + seededRandom(3) * 35, // Milieu
      50 + seededRandom(4) * 40, // Forme
      45 + seededRandom(5) * 45, // Mental
      70 + seededRandom(6) * 20, // Physique
      60 + seededRandom(7) * 25, // Tactique
      55 + seededRandom(8) * 30, // Expérience
    ];

    // Home advantage
    if (isHome) {
      return baseValues.map(val => Math.min(100, val + 5));
    }
    return baseValues;
  };

  const metrics = [
    'Attaque',
    'Défense', 
    'Milieu',
    'Forme',
    'Mental',
    'Physique',
    'Tactique',
    'Expérience'
  ];

  const staticData = metrics.map((metric, index) => ({
    metric,
    [homeTeam]: generateTeamData(homeTeam, true)[index],
    [awayTeam]: generateTeamData(awayTeam, false)[index],
  }));

  useEffect(() => {
    if (!isActive) {
      setAnimatedData(metrics.map(metric => ({ metric, [homeTeam]: 0, [awayTeam]: 0 })));
      setCurrentAnimation(-1);
      return;
    }

    const animateRadar = async () => {
      for (let step = 0; step <= 100; step += 2) {
        setCurrentAnimation(step);
        const progress = step / 100;
        
        setAnimatedData(staticData.map(item => ({
          metric: item.metric,
          [homeTeam]: (item[homeTeam] as number) * progress,
          [awayTeam]: (item[awayTeam] as number) * progress,
        })));
        
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      setCurrentAnimation(-1);
    };

    animateRadar();
  }, [isActive, homeTeam, awayTeam, matchId]);

  const getTeamColor = (team: string, isHome: boolean) => {
    if (isHome) return '#10b981'; // emerald-500
    return '#3b82f6'; // blue-500
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Radar de Performance</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Comparaison sur 8 métriques clés</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={animatedData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid 
              stroke="#e2e8f0" 
              strokeWidth={1}
              className="dark:stroke-slate-600"
            />
            <PolarAngleAxis 
              dataKey="metric" 
              tick={{ 
                fontSize: 12, 
                fill: '#64748b',
                fontWeight: 500
              }}
              className="dark:fill-slate-400"
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ 
                fontSize: 10, 
                fill: '#94a3b8' 
              }}
              tickCount={5}
              className="dark:fill-slate-500"
            />
            <Radar
              name={homeTeam}
              dataKey={homeTeam}
              stroke={getTeamColor(homeTeam, true)}
              fill={getTeamColor(homeTeam, true)}
              fillOpacity={0.1}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: getTeamColor(homeTeam, true) }}
            />
            <Radar
              name={awayTeam}
              dataKey={awayTeam}
              stroke={getTeamColor(awayTeam, false)}
              fill={getTeamColor(awayTeam, false)}
              fillOpacity={0.1}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: getTeamColor(awayTeam, false) }}
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{homeTeam}</span>
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
            {animatedData.length > 0 ? 
              Math.round(animatedData.reduce((acc, item) => acc + item[homeTeam], 0) / animatedData.length) : 0}
          </div>
          <div className="text-sm text-emerald-600 dark:text-emerald-400">Score moyen</div>
        </div>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="font-semibold text-blue-700 dark:text-blue-300">{awayTeam}</span>
          </div>
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
            {animatedData.length > 0 ? 
              Math.round(animatedData.reduce((acc, item) => acc + item[awayTeam], 0) / animatedData.length) : 0}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Score moyen</div>
        </div>
      </div>
    </Card>
  );
}