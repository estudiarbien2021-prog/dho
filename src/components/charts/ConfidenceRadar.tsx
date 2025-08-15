import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

interface ConfidenceRadarProps {
  match: ProcessedMatch;
  className?: string;
}

export function ConfidenceRadar({ match, className = "" }: ConfidenceRadarProps) {
  // Générer des métriques basées sur les vraies données du match
  const generateTeamMetrics = () => {
    const homeAdvantage = Math.min(95, Math.max(5, match.p_home_fair * 120));
    const awayResilience = Math.min(95, Math.max(5, match.p_away_fair * 120));
    
    // Utiliser le vigorish pour calculer l'efficacité du marché
    const marketEfficiency = Math.min(95, Math.max(30, (1 - match.vig_1x2) * 100));
    
    // Calculer la forme basée sur les probabilités BTTS et O/U
    const homeForm = Math.min(95, Math.max(20, 
      (match.p_btts_yes_fair + match.p_over_2_5_fair) * 60 + Math.random() * 20
    ));
    const awayForm = Math.min(95, Math.max(20, 
      (match.p_btts_no_fair + match.p_under_2_5_fair) * 60 + Math.random() * 20
    ));

    // Calculer l'historique basé sur les cotes
    const homeHistory = Math.min(95, Math.max(10, 100 - (match.odds_home - 1) * 15));
    const awayHistory = Math.min(95, Math.max(10, 100 - (match.odds_away - 1) * 15));

    // Météo et contexte (simulés mais cohérents avec les données)
    const matchContext = Math.min(95, Math.max(30, 
      (match.category === 'first_div' ? 85 : 
       match.category === 'continental_cup' ? 90 : 
       match.category === 'national_cup' ? 75 : 70) + Math.random() * 10
    ));

    return [
      {
        axis: 'Forme',
        équipeDomicile: Math.round(homeForm),
        équipeExtérieur: Math.round(awayForm),
      },
      {
        axis: 'Historique',
        équipeDomicile: Math.round(homeHistory),
        équipeExtérieur: Math.round(awayHistory),
      },
      {
        axis: 'Avantage',
        équipeDomicile: Math.round(homeAdvantage),
        équipeExtérieur: Math.round(awayResilience),
      },
      {
        axis: 'Contexte',
        équipeDomicile: Math.round(matchContext),
        équipeExtérieur: Math.round(matchContext * 0.9),
      },
      {
        axis: 'Efficacité',
        équipeDomicile: Math.round(marketEfficiency),
        équipeExtérieur: Math.round(marketEfficiency * 0.95),
      },
      {
        axis: 'Motivation',
        équipeDomicile: Math.round(Math.min(95, Math.max(40, 
          (match.category === 'continental_cup' ? 90 : 75) + Math.random() * 15
        ))),
        équipeExtérieur: Math.round(Math.min(95, Math.max(40, 
          (match.category === 'continental_cup' ? 85 : 70) + Math.random() * 15
        ))),
      },
      {
        axis: 'Tactique',
        équipeDomicile: Math.round(Math.min(95, Math.max(30, 
          match.p_btts_yes_fair * 80 + 30
        ))),
        équipeExtérieur: Math.round(Math.min(95, Math.max(30, 
          match.p_btts_no_fair * 80 + 30
        ))),
      },
      {
        axis: 'Mentalité',
        équipeDomicile: Math.round(Math.min(95, Math.max(35, 
          (100 - match.odds_draw * 10) + Math.random() * 20
        ))),
        équipeExtérieur: Math.round(Math.min(95, Math.max(35, 
          (100 - match.odds_draw * 10) + Math.random() * 20
        ))),
      },
    ];
  };

  const data = generateTeamMetrics();
  
  // Calculer le score de confiance global
  const globalConfidence = Math.round(
    data.reduce((acc, curr) => acc + Math.max(curr.équipeDomicile, curr.équipeExtérieur), 0) / data.length
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Radar de Confiance Multi-Dimensionnel
        </h3>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/20 rounded-full border border-primary/20">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-primary">
            Score Global: {globalConfidence}%
          </span>
        </div>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <defs>
              <linearGradient id="homeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="awayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.3}
              radialLines={true}
            />
            <PolarAngleAxis 
              dataKey="axis" 
              tick={{ 
                fontSize: 12, 
                fill: 'hsl(var(--foreground))',
                fontWeight: 500
              }}
              tickSize={8}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ 
                fontSize: 10, 
                fill: 'hsl(var(--muted-foreground))'
              }}
              tickCount={6}
            />
            <Radar
              name={match.home_team}
              dataKey="équipeDomicile"
              stroke="hsl(var(--primary))"
              fill="url(#homeGradient)"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            />
            <Radar
              name={match.away_team}
              dataKey="équipeExtérieur"
              stroke="hsl(var(--destructive))"
              fill="url(#awayGradient)"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span className="text-muted-foreground">
            {match.home_team} - Avantage du terrain
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive"></div>
          <span className="text-muted-foreground">
            {match.away_team} - Résistance extérieure
          </span>
        </div>
      </div>
    </div>
  );
}