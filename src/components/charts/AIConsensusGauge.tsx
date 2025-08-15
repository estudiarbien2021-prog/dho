import React, { useEffect, useState } from 'react';
import { ProcessedMatch } from '@/types/match';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Brain, Cpu, Zap, Network } from 'lucide-react';

interface AIConsensusGaugeProps {
  match: ProcessedMatch;
  className?: string;
}

export function AIConsensusGauge({ match, className = "" }: AIConsensusGaugeProps) {
  const [animatedConsensus, setAnimatedConsensus] = useState(0);
  const [modelsAgreement, setModelsAgreement] = useState<any[]>([]);

  // Calculer le consensus IA basé sur les données réelles
  const calculateConsensus = () => {
    // Analyser la cohérence entre les différents marchés
    const bttsConsistency = Math.abs(match.p_btts_yes_fair - match.p_btts_no_fair);
    const ouConsistency = Math.abs(match.p_over_2_5_fair - match.p_under_2_5_fair);
    const x12Consistency = Math.max(match.p_home_fair, match.p_draw_fair, match.p_away_fair);

    // Plus les probabilités sont équilibrées, moins il y a de consensus
    const consensusScore = Math.min(95, Math.max(45, 
      (bttsConsistency + ouConsistency + x12Consistency) * 80 + 15
    ));
    
    return Math.round(consensusScore);
  };

  // Simuler les "modèles IA" basés sur les vraies données
  const generateModelsAgreement = () => {
    const consensus = calculateConsensus();
    
    return [
      {
        name: 'Neural Deep',
        agreement: Math.min(100, consensus + Math.random() * 10 - 5),
        icon: Brain,
        confidence: match.p_home_fair > 0.6 || match.p_away_fair > 0.6 ? 'Haute' : 'Moyenne'
      },
      {
        name: 'Quantum Odds',
        agreement: Math.min(100, consensus + Math.random() * 8 - 4),
        icon: Cpu,
        confidence: match.vig_1x2 < 0.05 ? 'Très Haute' : 'Haute'
      },
      {
        name: 'Probabilistic',
        agreement: Math.min(100, consensus + Math.random() * 12 - 6),
        icon: Zap,
        confidence: match.watch_btts || match.watch_over25 ? 'Haute' : 'Moyenne'
      },
      {
        name: 'Meta-Ensemble',
        agreement: Math.min(100, consensus + Math.random() * 6 - 3),
        icon: Network,
        confidence: match.is_low_vig_1x2 ? 'Très Haute' : 'Haute'
      }
    ].map(model => ({
      ...model,
      agreement: Math.round(model.agreement)
    }));
  };

  const consensus = calculateConsensus();

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedConsensus(consensus);
      setModelsAgreement(generateModelsAgreement());
    }, 400);
    return () => clearTimeout(timer);
  }, [consensus]);

  const getConsensusColor = (value: number) => {
    if (value >= 85) return 'hsl(var(--chart-2))'; // Vert - forte unanimité
    if (value >= 70) return 'hsl(var(--primary))'; // Bleu - bon consensus
    if (value >= 55) return 'hsl(var(--chart-1))'; // Orange - consensus modéré
    return 'hsl(var(--destructive))'; // Rouge - divergence
  };

  const getConsensusLevel = (value: number) => {
    if (value >= 85) return "Unanimité Forte";
    if (value >= 70) return "Consensus Solide";
    if (value >= 55) return "Accord Modéré";
    return "Divergence IA";
  };

  // Données pour la jauge semi-circulaire
  const gaugeData = [
    { name: 'Consensus', value: animatedConsensus },
    { name: 'Divergence', value: 100 - animatedConsensus }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Consensus des Modèles IA
        </h3>
        <p className="text-sm text-muted-foreground">
          Convergence multi-algorithmique
        </p>
      </div>

      {/* Jauge semi-circulaire */}
      <div className="relative">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="consensusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={getConsensusColor(consensus)} stopOpacity={1} />
                  <stop offset="100%" stopColor={getConsensusColor(consensus)} stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="80%"
                startAngle={180}
                endAngle={0}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={0}
                dataKey="value"
              >
                <Cell fill="url(#consensusGradient)" />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Valeur centrale */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-2xl font-bold text-foreground animate-scale-in">
            {animatedConsensus}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {getConsensusLevel(consensus)}
          </div>
        </div>
      </div>

      {/* Détail des modèles */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Analyse par Modèle
        </h4>
        
        <div className="grid grid-cols-1 gap-3">
          {modelsAgreement.map((model, index) => (
            <div 
              key={model.name}
              className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <model.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {model.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Confiance: {model.confidence}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${model.agreement}%`,
                      backgroundColor: getConsensusColor(model.agreement)
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium w-10 text-right">
                  {model.agreement}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Métriques globales */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
        <div className="text-center">
          <div className="text-sm font-semibold text-primary">
            {modelsAgreement.filter(m => m.agreement >= 80).length}/4
          </div>
          <div className="text-xs text-muted-foreground">Modèles Alignés</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-primary">
            {Math.max(...modelsAgreement.map(m => m.agreement || 0))}%
          </div>
          <div className="text-xs text-muted-foreground">Pic Consensus</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-primary">
            {(modelsAgreement.reduce((acc, m) => acc + (m.agreement || 0), 0) / modelsAgreement.length).toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">Moyenne IA</div>
        </div>
      </div>
    </div>
  );
}