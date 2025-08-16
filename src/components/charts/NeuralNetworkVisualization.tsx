import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Target, AlertTriangle, DollarSign } from 'lucide-react';

interface NeuralNetworkVisualizationProps {
  isActive: boolean;
  confidence: number;
  match?: {
    home_team: string;
    away_team: string;
    league: string;
    odds_home: number;
    odds_draw: number;
    odds_away: number;
    odds_btts_yes?: number;
    odds_over_2_5?: number;
    p_home_fair: number;
    p_draw_fair: number;
    p_away_fair: number;
    p_btts_yes_fair: number;
    p_over_2_5_fair: number;
    vig_1x2: number;
    vig_btts: number;
    vig_ou_2_5: number;
    ai_prediction?: string | null;
    ai_confidence?: number;
  };
}

interface ValueBet {
  market: string;
  odds: number;
  fairProb: number;
  impliedProb: number;
  value: number;
  color: string;
  icon: React.ReactNode;
}

export function NeuralNetworkVisualization({ isActive, confidence, match }: NeuralNetworkVisualizationProps) {
  const insights = useMemo(() => {
    if (!match || !isActive) return [];
    
    const valueBets: ValueBet[] = [];
    
    // Vérifications de sécurité pour les propriétés requises
    if (!match.odds_home || !match.odds_draw || !match.odds_away || 
        typeof match.p_home_fair !== 'number' || typeof match.p_draw_fair !== 'number' || 
        typeof match.p_away_fair !== 'number' || typeof match.vig_1x2 !== 'number') {
      console.warn('Données de match incomplètes pour l\'analyse:', match);
      return [];
    }
    
    // Analyse 1X2
    const homeImplied = (1 / match.odds_home) * 100;
    const drawImplied = (1 / match.odds_draw) * 100;
    const awayImplied = (1 / match.odds_away) * 100;
    
    const homeValue = ((match.p_home_fair / 100) * match.odds_home) - 1;
    const drawValue = ((match.p_draw_fair / 100) * match.odds_draw) - 1;
    const awayValue = ((match.p_away_fair / 100) * match.odds_away) - 1;
    
    if (homeValue > 0.05) {
      valueBets.push({
        market: `${match.home_team} Gagne`,
        odds: match.odds_home,
        fairProb: match.p_home_fair,
        impliedProb: homeImplied,
        value: homeValue * 100,
        color: 'text-green-400',
        icon: <TrendingUp className="w-4 h-4" />
      });
    }
    
    if (drawValue > 0.05) {
      valueBets.push({
        market: 'Match Nul',
        odds: match.odds_draw,
        fairProb: match.p_draw_fair,
        impliedProb: drawImplied,
        value: drawValue * 100,
        color: 'text-yellow-400',
        icon: <Target className="w-4 h-4" />
      });
    }
    
    if (awayValue > 0.05) {
      valueBets.push({
        market: `${match.away_team} Gagne`,
        odds: match.odds_away,
        fairProb: match.p_away_fair,
        impliedProb: awayImplied,
        value: awayValue * 100,
        color: 'text-blue-400',
        icon: <TrendingUp className="w-4 h-4" />
      });
    }
    
    // BTTS Analysis - avec vérifications de sécurité
    if (match.odds_btts_yes && match.p_btts_yes_fair && 
        typeof match.odds_btts_yes === 'number' && typeof match.p_btts_yes_fair === 'number') {
      const bttsImplied = (1 / match.odds_btts_yes) * 100;
      const bttsValue = ((match.p_btts_yes_fair / 100) * match.odds_btts_yes) - 1;
      
      if (bttsValue > 0.05) {
        valueBets.push({
          market: 'BTTS Oui',
          odds: match.odds_btts_yes,
          fairProb: match.p_btts_yes_fair,
          impliedProb: bttsImplied,
          value: bttsValue * 100,
          color: 'text-purple-400',
          icon: <Target className="w-4 h-4" />
        });
      }
    }
    
    // Over 2.5 Analysis - avec vérifications de sécurité
    if (match.odds_over_2_5 && match.p_over_2_5_fair && 
        typeof match.odds_over_2_5 === 'number' && typeof match.p_over_2_5_fair === 'number') {
      const overImplied = (1 / match.odds_over_2_5) * 100;
      const overValue = ((match.p_over_2_5_fair / 100) * match.odds_over_2_5) - 1;
      
      if (overValue > 0.05) {
        valueBets.push({
          market: 'Plus de 2.5 buts',
          odds: match.odds_over_2_5,
          fairProb: match.p_over_2_5_fair,
          impliedProb: overImplied,
          value: overValue * 100,
          color: 'text-orange-400',
          icon: <TrendingUp className="w-4 h-4" />
        });
      }
    }
    
    // Tri par valeur décroissante
    return valueBets.sort((a, b) => b.value - a.value);
  }, [match, isActive]);

  const getVigorishLevel = (vig: number) => {
    if (vig < 0.03) return { level: 'Excellent', color: 'text-green-400', bg: 'bg-green-400/20' };
    if (vig < 0.05) return { level: 'Bon', color: 'text-yellow-400', bg: 'bg-yellow-400/20' };
    if (vig < 0.08) return { level: 'Moyen', color: 'text-orange-400', bg: 'bg-orange-400/20' };
    return { level: 'Élevé', color: 'text-red-400', bg: 'bg-red-400/20' };
  };

  if (!match || !isActive) {
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-900/50 to-purple-900/20 border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 bg-slate-600 rounded-full" />
          <h3 className="font-semibold text-sm text-slate-400">
            Analyse en attente...
          </h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          L'analyse détaillée du match sera affichée ici une fois les données chargées.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête du match */}
      <Card className="p-4 bg-gradient-to-r from-slate-900/50 to-purple-900/20 border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse" />
            <h3 className="font-semibold text-sm bg-gradient-to-r from-cyan-300 to-purple-400 bg-clip-text text-transparent">
              Analyse Intelligente
            </h3>
          </div>
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
            Confiance: {confidence}%
          </Badge>
        </div>

        <div className="text-center mb-4">
          <div className="text-lg font-bold text-white">
            {match.home_team} vs {match.away_team}
          </div>
          <div className="text-sm text-slate-400">{match.league}</div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-400">{match.odds_home.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Domicile</div>
            <div className="text-xs text-slate-300">{match.p_home_fair.toFixed(1)}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-yellow-400">{match.odds_draw.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Nul</div>
            <div className="text-xs text-slate-300">{match.p_draw_fair.toFixed(1)}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-400">{match.odds_away.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Extérieur</div>
            <div className="text-xs text-slate-300">{match.p_away_fair.toFixed(1)}%</div>
          </div>
        </div>
      </Card>

      {/* Value Bets détectés */}
      {insights.length > 0 ? (
        <Card className="p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-green-400" />
            <h4 className="font-semibold text-green-300">Value Bets Détectés</h4>
            <Badge variant="secondary" className="bg-green-500/20 text-green-300">
              {insights.length} opportunité{insights.length > 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="space-y-3">
            {insights.map((bet, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-green-500/10">
                <div className="flex items-center gap-3">
                  <div className={bet.color}>
                    {bet.icon}
                  </div>
                  <div>
                    <div className="font-medium text-white">{bet.market}</div>
                    <div className="text-xs text-slate-400">
                      Cote: {bet.odds.toFixed(2)} • Fair: {bet.fairProb.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-400">+{bet.value.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">Valeur</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-4 bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <h4 className="font-semibold text-orange-300">Aucune Value Bet</h4>
          </div>
          <p className="text-sm text-slate-400">
            Les cotes actuelles ne présentent pas d'opportunités de value betting significatives (seuil: 5%).
          </p>
        </Card>
      )}

      {/* Analyse du Vigorish */}
      <Card className="p-4 bg-gradient-to-r from-slate-900/50 to-indigo-900/20 border-indigo-500/20">
        <h4 className="font-semibold text-indigo-300 mb-3">Analyse des Marges</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">1X2</span>
              <Badge className={`${getVigorishLevel(match.vig_1x2).bg} ${getVigorishLevel(match.vig_1x2).color} border-none`}>
                {getVigorishLevel(match.vig_1x2).level}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={(1 - match.vig_1x2) * 100} className="w-20 h-2" />
              <span className="text-sm font-mono text-slate-300">
                {(match.vig_1x2 * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {match.vig_btts > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">BTTS</span>
                <Badge className={`${getVigorishLevel(match.vig_btts).bg} ${getVigorishLevel(match.vig_btts).color} border-none`}>
                  {getVigorishLevel(match.vig_btts).level}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(1 - match.vig_btts) * 100} className="w-20 h-2" />
                <span className="text-sm font-mono text-slate-300">
                  {(match.vig_btts * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {match.vig_ou_2_5 > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">O/U 2.5</span>
                <Badge className={`${getVigorishLevel(match.vig_ou_2_5).bg} ${getVigorishLevel(match.vig_ou_2_5).color} border-none`}>
                  {getVigorishLevel(match.vig_ou_2_5).level}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(1 - match.vig_ou_2_5) * 100} className="w-20 h-2" />
                <span className="text-sm font-mono text-slate-300">
                  {(match.vig_ou_2_5 * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 p-2 bg-slate-800/30 rounded text-xs text-slate-400">
          💡 Plus le vigorish est faible, plus les cotes sont favorables aux parieurs
        </div>
      </Card>
    </div>
  );
}