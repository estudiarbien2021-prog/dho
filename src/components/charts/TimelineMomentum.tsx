import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card } from '@/components/ui/card';

interface TimelineMomentumProps {
  homeTeam: string;
  awayTeam: string;
  matchId: string;
  isActive: boolean;
}

export function TimelineMomentum({ homeTeam, awayTeam, matchId, isActive }: TimelineMomentumProps) {
  const [animatedData, setAnimatedData] = useState<any[]>([]);

  // Generate deterministic momentum data
  const generateMomentumData = () => {
    const hashCode = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    const seed = hashCode(matchId);
    const seededRandom = (index: number) => {
      const x = Math.sin(seed + index) * 10000;
      return x - Math.floor(x);
    };

    const weeks = ['S-6', 'S-5', 'S-4', 'S-3', 'S-2', 'S-1', 'Aujourd\'hui'];
    
    return weeks.map((week, index) => {
      const homeBase = 65 + seededRandom(index * 2) * 25;
      const awayBase = 60 + seededRandom(index * 2 + 1) * 30;
      
      // Add some momentum/trend
      const homeTrend = Math.sin(index * 0.5) * 10;
      const awayTrend = Math.cos(index * 0.7) * 12;
      
      return {
        week,
        [homeTeam]: Math.max(20, Math.min(95, homeBase + homeTrend)),
        [awayTeam]: Math.max(20, Math.min(95, awayBase + awayTrend)),
        homeConfidence: 60 + seededRandom(index * 3) * 30,
        awayConfidence: 55 + seededRandom(index * 3 + 2) * 35,
      };
    });
  };

  const staticData = generateMomentumData();

  useEffect(() => {
    if (!isActive) {
      setAnimatedData([]);
      return;
    }

    const animateTimeline = async () => {
      for (let i = 0; i <= staticData.length; i++) {
        setAnimatedData(staticData.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    };

    animateTimeline();
  }, [isActive, matchId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {entry.dataKey}: <span className="font-semibold">{entry.value.toFixed(1)}%</span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getCurrentTrend = (team: string) => {
    if (animatedData.length < 2) return 0;
    const recent = animatedData[animatedData.length - 1][team];
    const previous = animatedData[animatedData.length - 2][team];
    return recent - previous;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Timeline de Momentum</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Évolution des performances sur 6 semaines</p>
        </div>
      </div>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={animatedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="homeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="awayGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-600" />
            <XAxis 
              dataKey="week" 
              tick={{ fontSize: 12, fill: '#64748b' }}
              className="dark:fill-slate-400"
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              className="dark:fill-slate-400"
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={homeTeam}
              stroke="#10b981"
              strokeWidth={3}
              fill="url(#homeGradient)"
              dot={{ r: 4, strokeWidth: 2, fill: "#10b981" }}
            />
            <Area
              type="monotone"
              dataKey={awayTeam}
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#awayGradient)"
              dot={{ r: 4, strokeWidth: 2, fill: "#3b82f6" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{homeTeam}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              getCurrentTrend(homeTeam) > 0 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {getCurrentTrend(homeTeam) > 0 ? '↗' : '↘'} 
              {Math.abs(getCurrentTrend(homeTeam)).toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
            {animatedData.length > 0 ? animatedData[animatedData.length - 1]?.[homeTeam]?.toFixed(1) || '0' : '0'}%
          </div>
          <div className="text-sm text-emerald-600 dark:text-emerald-400">Forme actuelle</div>
        </div>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="font-semibold text-blue-700 dark:text-blue-300">{awayTeam}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              getCurrentTrend(awayTeam) > 0 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {getCurrentTrend(awayTeam) > 0 ? '↗' : '↘'} 
              {Math.abs(getCurrentTrend(awayTeam)).toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
            {animatedData.length > 0 ? animatedData[animatedData.length - 1]?.[awayTeam]?.toFixed(1) || '0' : '0'}%
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Forme actuelle</div>
        </div>
      </div>
    </Card>
  );
}