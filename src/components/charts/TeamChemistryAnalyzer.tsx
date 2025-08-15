import React, { useState, useEffect } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Users, Zap, Target, Shield, Heart, Brain } from 'lucide-react';

interface TeamChemistryAnalyzerProps {
  match: ProcessedMatch;
  className?: string;
}

export function TeamChemistryAnalyzer({ match, className = "" }: TeamChemistryAnalyzerProps) {
  const [compatibilityScore, setCompatibilityScore] = useState(0);
  const [animatedData, setAnimatedData] = useState<any[]>([]);

  // Calculer les métriques de chimie d'équipe basées sur les vraies données
  const calculateTeamChemistry = () => {
    // Cohésion offensive (basée sur les probabilités de buts)
    const homeCohesion = Math.min(95, Math.max(25, 
      (match.p_over_2_5_fair * 70) + (match.p_btts_yes_fair * 30) + 15
    ));
    const awayCohesion = Math.min(95, Math.max(25, 
      (match.p_over_2_5_fair * 60) + (match.p_btts_yes_fair * 40) + 10
    ));

    // Stabilité défensive (basée sur les probabilités under)
    const homeDefense = Math.min(95, Math.max(20, 
      (match.p_under_2_5_fair * 75) + (match.p_btts_no_fair * 25) + 20
    ));
    const awayDefense = Math.min(95, Math.max(20, 
      (match.p_under_2_5_fair * 70) + (match.p_btts_no_fair * 30) + 15
    ));

    // Mentalité (basée sur les cotes)
    const homeMentality = Math.min(95, Math.max(30, 
      100 - (match.odds_home - 1) * 15 + (match.category === 'first_div' ? 10 : 0)
    ));
    const awayMentality = Math.min(95, Math.max(25, 
      100 - (match.odds_away - 1) * 12 + (match.category === 'continental_cup' ? 15 : 0)
    ));

    // Adaptabilité (basée sur les vigorish - plus c'est bas, plus l'équipe est prévisible)
    const homeAdaptability = Math.min(95, Math.max(35, 
      70 + (match.vig_1x2 * 200) + Math.random() * 15
    ));
    const awayAdaptability = Math.min(95, Math.max(35, 
      65 + (match.vig_btts * 250) + Math.random() * 15
    ));

    // Expérience (basée sur la catégorie de compétition)
    const homeExperience = Math.min(95, Math.max(40, 
      (match.category === 'continental_cup' ? 85 : 
       match.category === 'first_div' ? 75 : 65) + Math.random() * 10
    ));
    const awayExperience = Math.min(95, Math.max(35, 
      (match.category === 'continental_cup' ? 80 : 
       match.category === 'first_div' ? 70 : 60) + Math.random() * 10
    ));

    // Motivation (basée sur l'équilibre des cotes)
    const oddsBalance = Math.abs(match.odds_home - match.odds_away);
    const homeMotivation = Math.min(95, Math.max(45, 
      85 - (oddsBalance * 5) + (match.odds_home > match.odds_away ? -10 : 10)
    ));
    const awayMotivation = Math.min(95, Math.max(45, 
      80 - (oddsBalance * 4) + (match.odds_away > match.odds_home ? -10 : 15)
    ));

    return [
      {
        axis: 'Cohésion',
        domicile: Math.round(homeCohesion),
        extérieur: Math.round(awayCohesion),
        icon: Users
      },
      {
        axis: 'Défense',
        domicile: Math.round(homeDefense),
        extérieur: Math.round(awayDefense),
        icon: Shield
      },
      {
        axis: 'Mentalité',
        domicile: Math.round(homeMentality),
        extérieur: Math.round(awayMentality),
        icon: Brain
      },
      {
        axis: 'Adaptabilité',
        domicile: Math.round(homeAdaptability),
        extérieur: Math.round(awayAdaptability),
        icon: Zap
      },
      {
        axis: 'Expérience',
        domicile: Math.round(homeExperience),
        extérieur: Math.round(awayExperience),
        icon: Target
      },
      {
        axis: 'Motivation',
        domicile: Math.round(homeMotivation),
        extérieur: Math.round(awayMotivation),
        icon: Heart
      }
    ];
  };

  // Calculer le score de compatibilité global
  const calculateCompatibilityScore = (data: any[]) => {
    const avgDifference = data.reduce((acc, curr) => 
      acc + Math.abs(curr.domicile - curr.extérieur), 0
    ) / data.length;
    
    // Plus la différence est grande, moins les équipes sont compatibles
    // Score inversé pour que 100% = match parfaitement équilibré
    return Math.round(Math.max(45, Math.min(95, 100 - (avgDifference * 1.2))));
  };

  const chemistryData = calculateTeamChemistry();

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(chemistryData);
      setCompatibilityScore(calculateCompatibilityScore(chemistryData));
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const getCompatibilityLevel = (score: number) => {
    if (score >= 85) return { level: "Exceptionnelle", color: "hsl(var(--chart-2))" };
    if (score >= 70) return { level: "Élevée", color: "hsl(var(--primary))" };
    if (score >= 55) return { level: "Modérée", color: "hsl(var(--chart-1))" };
    return { level: "Déséquilibrée", color: "hsl(var(--destructive))" };
  };

  const compatibility = getCompatibilityLevel(compatibilityScore);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Analyseur de Chimie d'Équipes
        </h3>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/20 rounded-full border border-primary/20">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium" style={{ color: compatibility.color }}>
            Compatibilité: {compatibilityScore}% - {compatibility.level}
          </span>
        </div>
      </div>

      {/* Radar Chart Comparatif */}
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={animatedData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <defs>
              <linearGradient id="homeChemistry" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="awayChemistry" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.4}
              radialLines={true}
            />
            <PolarAngleAxis 
              dataKey="axis" 
              tick={{ 
                fontSize: 12, 
                fill: 'hsl(var(--foreground))',
                fontWeight: 500
              }}
              tickSize={10}
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
              dataKey="domicile"
              stroke="hsl(var(--primary))"
              fill="url(#homeChemistry)"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
              filter="url(#glow)"
            />
            <Radar
              name={match.away_team}
              dataKey="extérieur"
              stroke="hsl(var(--chart-1))"
              fill="url(#awayChemistry)"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 5 }}
              filter="url(#glow)"
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

      {/* Métriques détaillées */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Analyse Psychologique & Tactique</h4>
        
        <div className="grid grid-cols-1 gap-3">
          {chemistryData.map((metric, index) => {
            const IconComponent = metric.icon;
            const homeAdvantage = metric.domicile - metric.extérieur;
            
            return (
              <div 
                key={metric.axis}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconComponent className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {metric.axis}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {homeAdvantage > 10 ? `Avantage ${match.home_team}` :
                       homeAdvantage < -10 ? `Avantage ${match.away_team}` :
                       'Équilibré'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm font-bold text-primary">
                      {metric.domicile}
                    </div>
                    <div className="text-xs text-muted-foreground">DOM</div>
                  </div>
                  
                  <div className="w-16 h-2 bg-muted rounded-full relative overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000"
                      style={{ width: `${(metric.domicile / (metric.domicile + metric.extérieur)) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-bold text-chart-1">
                      {metric.extérieur}
                    </div>
                    <div className="text-xs text-muted-foreground">EXT</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Synthèse tactique */}
      <div className="p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-border/50">
        <h4 className="text-sm font-semibold text-foreground mb-3">Synthèse Tactique</h4>
        
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-medium text-primary mb-1">{match.home_team}</div>
            <div className="text-muted-foreground">
              {chemistryData.find(d => d.axis === 'Cohésion')?.domicile! > 70 ? 'Attaque fluide' : 'Jeu direct'}
              {chemistryData.find(d => d.axis === 'Défense')?.domicile! > 70 ? ', Défense solide' : ', Vulnérable'}
            </div>
          </div>
          
          <div>
            <div className="font-medium text-chart-1 mb-1">{match.away_team}</div>
            <div className="text-muted-foreground">
              {chemistryData.find(d => d.axis === 'Adaptabilité')?.extérieur! > 70 ? 'Tactiquement flexible' : 'Schéma rigide'}
              {chemistryData.find(d => d.axis === 'Motivation')?.extérieur! > 70 ? ', Très motivé' : ', Motivation standard'}
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="text-xs text-muted-foreground">
            <strong>Prédiction Tactique:</strong> {' '}
            {compatibilityScore > 75 ? 
              'Match équilibré avec phases de domination alternées' :
              compatibilityScore > 60 ?
              'Avantage tactique léger pour une équipe' :
              'Déséquilibre tactique notable attendu'
            }
          </div>
        </div>
      </div>
    </div>
  );
}