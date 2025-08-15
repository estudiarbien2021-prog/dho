import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface ProbabilityDistributionProps {
  matchId: string;
  isActive: boolean;
}

export function ProbabilityDistribution({ matchId, isActive }: ProbabilityDistributionProps) {
  const [animatedData, setAnimatedData] = useState<any[]>([]);

  // Generate bell curve distribution data
  const generateDistributionData = () => {
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

    // Generate bell curve for different score outcomes
    const scores = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = 0; j <= 6; j++) {
        if (i + j <= 8) { // Realistic total goals
          scores.push(`${i}-${j}`);
        }
      }
    }

    // Create probability distribution with some realistic patterns
    const data: any[] = [];
    scores.forEach((score, index) => {
      const [home, away] = score.split('-').map(Number);
      const totalGoals = home + away;
      
      // Base probability using normal distribution around 2-3 total goals
      let probability = Math.exp(-Math.pow(totalGoals - 2.5, 2) / (2 * 1.2));
      
      // Adjust for common football patterns
      if (home === away) probability *= 0.8; // Draws slightly less likely
      if (home === 1 && away === 0) probability *= 1.3; // 1-0 is common
      if (home === 2 && away === 1) probability *= 1.2; // 2-1 is common
      if (home === 0 && away === 0) probability *= 0.6; // 0-0 less common
      if (totalGoals > 5) probability *= 0.3; // High scoring games rare
      
      // Add some randomness based on teams
      probability *= (0.8 + seededRandom(index) * 0.4);
      
      data.push({
        score,
        probability: probability * 100,
        homeGoals: home,
        awayGoals: away,
        totalGoals,
      });
    });

    // Normalize probabilities to sum to 100%
    const totalProb = data.reduce((sum, item) => sum + item.probability, 0);
    return data.map(item => ({
      ...item,
      probability: (item.probability / totalProb) * 100,
    })).sort((a, b) => b.probability - a.probability).slice(0, 15); // Top 15 most likely
  };

  const staticData = generateDistributionData();

  useEffect(() => {
    if (!isActive) {
      setAnimatedData([]);
      return;
    }

    const animateDistribution = async () => {
      for (let i = 0; i <= staticData.length; i++) {
        setAnimatedData(staticData.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    animateDistribution();
  }, [isActive, matchId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-bold text-slate-900 dark:text-white text-lg mb-2">Score: {label}</p>
          <p className="text-slate-600 dark:text-slate-400">
            Probabilité: <span className="font-semibold text-purple-600">{data.probability.toFixed(2)}%</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            Total buts: {data.totalGoals}
          </p>
        </div>
      );
    }
    return null;
  };

  const getMostLikelyScore = () => {
    if (animatedData.length === 0) return null;
    return animatedData[0];
  };

  const getHighScoringProbability = () => {
    if (animatedData.length === 0) return 0;
    return animatedData
      .filter(item => item.totalGoals >= 4)
      .reduce((sum, item) => sum + item.probability, 0);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 border-0 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Distribution des Probabilités</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Scores les plus probables selon l'IA</p>
        </div>
      </div>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={animatedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="probabilityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-600" />
            <XAxis 
              dataKey="score" 
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              height={60}
              className="dark:fill-slate-400"
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              className="dark:fill-slate-400"
              label={{ value: 'Probabilité (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="probability"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#probabilityGradient)"
              dot={{ r: 3, strokeWidth: 2, fill: "#8b5cf6" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="font-semibold text-purple-700 dark:text-purple-300">Score le + probable</span>
          </div>
          <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
            {getMostLikelyScore()?.score || '--'}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">
            {getMostLikelyScore()?.probability.toFixed(1) || '0'}% de chances
          </div>
        </div>
        
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
            <span className="font-semibold text-amber-700 dark:text-amber-300">Match spectaculaire</span>
          </div>
          <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
            {getHighScoringProbability().toFixed(1)}%
          </div>
          <div className="text-sm text-amber-600 dark:text-amber-400">
            4+ buts marqués
          </div>
        </div>

        <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-cyan-500 rounded-full" />
            <span className="font-semibold text-cyan-700 dark:text-cyan-300">Scénarios analysés</span>
          </div>
          <div className="text-2xl font-bold text-cyan-800 dark:text-cyan-200">
            {animatedData.length}
          </div>
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Issues possibles
          </div>
        </div>
      </div>
    </Card>
  );
}