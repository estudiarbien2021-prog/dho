import React, { useEffect, useState } from 'react';
import { ProcessedMatch } from '@/types/match';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface MarketEfficiencyGaugeProps {
  match: ProcessedMatch;
  className?: string;
}

export function MarketEfficiencyGauge({ match, className = "" }: MarketEfficiencyGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [flawsDetected, setFlawsDetected] = useState(0);

  // Calculer l'efficacité du marché basée sur les vigorish réels
  const calculateEfficiency = () => {
    const avgVigorish = (match.vig_1x2 + match.vig_btts + match.vig_ou_2_5) / 3;
    // Plus le vigorish est bas, plus le marché est efficace
    const efficiency = Math.max(75, Math.min(98, (1 - avgVigorish) * 100 + 15));
    return Math.round(efficiency * 10) / 10;
  };

  const efficiency = calculateEfficiency();
  
  // Détecter les failles basées sur les flags réels
  const detectFlaws = () => {
    let flaws = 0;
    if (match.is_low_vig_1x2) flaws++;
    if (match.watch_btts) flaws++;
    if (match.watch_over25) flaws++;
    
    // Ajouter des failles basées sur les écarts de probabilités
    const oddsImpliedProb = 1 / match.odds_home + 1 / match.odds_draw + 1 / match.odds_away;
    if (oddsImpliedProb < 1.05) flaws++; // Marché très serré
    
    return flaws;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(efficiency);
      setFlawsDetected(detectFlaws());
    }, 300);
    return () => clearTimeout(timer);
  }, [efficiency]);

  const getEfficiencyColor = (value: number) => {
    if (value >= 95) return 'hsl(var(--destructive))'; // Rouge - marché trop efficace
    if (value >= 90) return 'hsl(var(--chart-1))'; // Orange
    if (value >= 85) return 'hsl(var(--primary))'; // Bleu - bon équilibre
    return 'hsl(var(--chart-2))'; // Vert - opportunités
  };

  const getStatusIcon = (value: number) => {
    if (value >= 95) return <AlertTriangle className="w-5 h-5 text-destructive" />;
    if (value >= 85) return <CheckCircle className="w-5 h-5 text-primary" />;
    return <TrendingUp className="w-5 h-5 text-chart-2" />;
  };

  const getStatusText = (value: number) => {
    if (value >= 95) return "Marché Verrouillé";
    if (value >= 90) return "Haute Efficacité";
    if (value >= 85) return "Équilibré";
    return "Opportunités Détectées";
  };

  // Données pour le graphique circulaire
  const data = [
    { name: 'Efficiency', value: animatedValue },
    { name: 'Remaining', value: 100 - animatedValue }
  ];

  const COLORS = [getEfficiencyColor(efficiency), 'hsl(var(--muted))'];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Efficacité du Marché
        </h3>
        <p className="text-sm text-muted-foreground">
          Analyse en temps réel des distorsions
        </p>
      </div>

      <div className="relative">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="efficiencyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={getEfficiencyColor(efficiency)} stopOpacity={1} />
                  <stop offset="100%" stopColor={getEfficiencyColor(efficiency)} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={0}
                dataKey="value"
              >
                <Cell fill="url(#efficiencyGradient)" />
                <Cell fill={COLORS[1]} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Valeur centrale */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground animate-scale-in">
              {animatedValue.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {getStatusText(efficiency)}
            </div>
          </div>
        </div>
      </div>

      {/* Métriques détaillées */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            {getStatusIcon(efficiency)}
            <span className="text-sm font-medium">État</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {getStatusText(efficiency)}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-chart-2 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Failles</span>
          </div>
          <span className="text-sm font-bold text-chart-2">
            {flawsDetected} détectée{flawsDetected > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Analyse des vigorish */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Analyse des Marges</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">1X2</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, match.vig_1x2 * 1000)}%` }}
                ></div>
              </div>
              <span className="font-medium w-12 text-right">
                {(match.vig_1x2 * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">BTTS</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-chart-1 transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, match.vig_btts * 1000)}%` }}
                ></div>
              </div>
              <span className="font-medium w-12 text-right">
                {(match.vig_btts * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">O/U 2.5</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-chart-2 transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(100, match.vig_ou_2_5 * 1000)}%` }}
                ></div>
              </div>
              <span className="font-medium w-12 text-right">
                {(match.vig_ou_2_5 * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}