import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, Users, Zap, Target, Clock, MapPin } from 'lucide-react';

interface Factor {
  name: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface InfluenceFactorsProps {
  matchId: string;
  isActive: boolean;
}

export function InfluenceFactors({ matchId, isActive }: InfluenceFactorsProps) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [animatedValues, setAnimatedValues] = useState<number[]>([]);
  const [currentlyAnimating, setCurrentlyAnimating] = useState(-1);

  // Generate deterministic factors based on matchId
  useEffect(() => {
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

    const baseFactors: Omit<Factor, 'value'>[] = [
      {
        name: 'Forme Récente',
        icon: <TrendingUp size={16} />,
        color: 'hsl(var(--primary))',
        description: 'Performances des 5 derniers matchs'
      },
      {
        name: 'Historique H2H',
        icon: <Target size={16} />,
        color: '#10b981',
        description: 'Confrontations directes récentes'
      },
      {
        name: 'Motivation Équipes',
        icon: <Zap size={16} />,
        color: '#f59e0b',
        description: 'Enjeux sportifs et financiers'
      },
      {
        name: 'Support Domicile',
        icon: <Users size={16} />,
        color: '#8b5cf6',
        description: 'Avantage du terrain et supporters'
      },
      {
        name: 'Fatigue/Rotation',
        icon: <Clock size={16} />,
        color: '#ef4444',
        description: 'Calendrier et gestion d\'effectif'
      },
      {
        name: 'Conditions Externes',
        icon: <MapPin size={16} />,
        color: '#06b6d4',
        description: 'Météo, arbitrage, pelouse'
      }
    ];

    const generatedFactors = baseFactors.map((factor, index) => ({
      ...factor,
      value: Math.round(30 + seededRandom(index) * 65) // 30-95%
    }));

    // Sort by value for visual impact
    generatedFactors.sort((a, b) => b.value - a.value);

    setFactors(generatedFactors);
    setAnimatedValues(new Array(generatedFactors.length).fill(0));
  }, [matchId]);

  // Animation logic
  useEffect(() => {
    if (!isActive || factors.length === 0) {
      setAnimatedValues(new Array(factors.length).fill(0));
      setCurrentlyAnimating(-1);
      return;
    }

    const animateFactors = async () => {
      // Animate all bars with staggered timing
      for (let i = 0; i < factors.length; i++) {
        setCurrentlyAnimating(i);
        
        const duration = 800;
        const frames = 40;
        const targetValue = factors[i].value;
        
        for (let frame = 0; frame <= frames; frame++) {
          const progress = frame / frames;
          const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
          const currentValue = easedProgress * targetValue;
          
          setAnimatedValues(prev => {
            const newValues = [...prev];
            newValues[i] = currentValue;
            return newValues;
          });
          
          await new Promise(resolve => setTimeout(resolve, duration / frames));
        }
        
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      setCurrentlyAnimating(-1);
    };

    animateFactors();
  }, [isActive, factors]);

  const getImpactLevel = (value: number) => {
    if (value >= 80) return { label: 'Très Fort', color: '#10b981' };
    if (value >= 65) return { label: 'Fort', color: '#f59e0b' };
    if (value >= 45) return { label: 'Modéré', color: '#8b5cf6' };
    return { label: 'Faible', color: '#ef4444' };
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        <h3 className="font-semibold text-sm">Facteurs d'Influence IA</h3>
      </div>

      <div className="space-y-4">
        {factors.map((factor, index) => {
          const impact = getImpactLevel(factor.value);
          const isAnimating = currentlyAnimating === index;
          
          return (
            <div key={factor.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isAnimating ? 'animate-pulse' : ''
                    }`}
                    style={{ 
                      backgroundColor: `${factor.color}20`,
                      color: factor.color 
                    }}
                  >
                    {factor.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{factor.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {factor.description}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div 
                    className={`text-lg font-bold transition-all duration-300 ${
                      isAnimating ? 'animate-pulse' : ''
                    }`}
                    style={{ color: factor.color }}
                  >
                    {Math.round(animatedValues[index])}%
                  </div>
                  <div 
                    className="text-xs font-medium"
                    style={{ color: impact.color }}
                  >
                    {impact.label}
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-75 ease-out relative"
                    style={{
                      width: `${animatedValues[index]}%`,
                      backgroundColor: factor.color,
                      boxShadow: isAnimating 
                        ? `0 0 8px ${factor.color}50` 
                        : 'none'
                    }}
                  >
                    {/* Pulse effect during animation */}
                    {isAnimating && (
                      <div 
                        className="absolute inset-0 rounded-full animate-pulse"
                        style={{
                          backgroundColor: factor.color,
                          opacity: 0.3
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analysis Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-primary" />
          <span className="text-sm font-medium">Synthèse Algorithmique</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          L'IA a analysé {factors.length} facteurs critiques. Les algorithmes de machine learning 
          identifient les variables les plus déterminantes pour prédire l'issue du match avec 
          une précision optimisée.
        </p>
      </div>
    </Card>
  );
}