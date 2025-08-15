import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { Trophy, Target, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TopPicksProps {
  matches: ProcessedMatch[];
  onMatchClick: (match: ProcessedMatch) => void;
}

export function TopPicks({ matches, onMatchClick }: TopPicksProps) {
  // Nouvelle formule : cotes les plus hautes avec vigorish le plus élevé (BTTS & O/U seulement)
  const getTopBets = () => {
    const validBets = [];
    
    matches.forEach(match => {
      // BTTS Markets seulement
      if (match.odds_btts_yes && match.vig_btts > 0) {
        validBets.push({
          match,
          type: 'BTTS',
          prediction: 'Oui',
          odds: match.odds_btts_yes,
          probability: match.p_btts_yes_fair,
          vigorish: match.vig_btts
        });
      }
      
      if (match.odds_btts_no && match.vig_btts > 0) {
        validBets.push({
          match,
          type: 'BTTS',
          prediction: 'Non',
          odds: match.odds_btts_no,
          probability: match.p_btts_no_fair,
          vigorish: match.vig_btts
        });
      }
      
      // Over/Under 2.5 Markets seulement
      if (match.odds_over_2_5 && match.vig_ou_2_5 > 0) {
        validBets.push({
          match,
          type: 'O/U 2.5',
          prediction: '+2,5 buts',
          odds: match.odds_over_2_5,
          probability: match.p_over_2_5_fair,
          vigorish: match.vig_ou_2_5
        });
      }
      
      if (match.odds_under_2_5 && match.vig_ou_2_5 > 0) {
        validBets.push({
          match,
          type: 'O/U 2.5',
          prediction: '-2,5 buts',
          odds: match.odds_under_2_5,
          probability: match.p_under_2_5_fair,
          vigorish: match.vig_ou_2_5
        });
      }
    });
    
    // Trier par vigorish décroissant puis par cotes décroissantes
    return validBets
      .sort((a, b) => {
        // D'abord par vigorish (plus élevé = mieux)
        if (Math.abs(a.vigorish - b.vigorish) > 0.001) {
          return b.vigorish - a.vigorish;
        }
        // Si vigorish similaire, alors par cotes (plus hautes = mieux)
        return b.odds - a.odds;
      })
      .slice(0, 3);
  };

  const topBets = getTopBets();

  if (topBets.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-surface-soft to-surface border border-brand/20">
        <div className="text-center">
          <Target className="h-12 w-12 text-brand/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">Aucune opportunité détectée</h3>
          <p className="text-text-weak text-sm">
            Aucun pari ne répond aux critères uniformes de l'IA.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-brand/20 to-brand-300/20 rounded-lg">
          <Trophy className="h-5 w-5 text-brand" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text">🎯 Top 3 Picks IA</h2>
          <p className="text-sm text-text-weak">Sélection automatique avec critères unifiés</p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {topBets.map((bet, index) => {
          const flagInfo = leagueToFlag(bet.match.league, bet.match.country, bet.match.home_team, bet.match.away_team);
          
          return (
            <Card 
              key={`${bet.match.id}-top-pick-${index}`}
              className="group relative p-4 bg-gradient-to-br from-surface-soft to-surface border border-brand/30 hover:border-brand/50 transition-all duration-300 hover:shadow-xl hover:shadow-brand/20 cursor-pointer transform hover:scale-[1.02]"
              onClick={() => onMatchClick(bet.match)}
            >
              {/* Rank Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-brand to-brand-400 rounded-full flex items-center justify-center text-brand-fg font-bold text-sm shadow-lg">
                {index + 1}
              </div>

              {/* Match Info */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                <span className="text-xs text-text-weak text-center truncate">{bet.match.league}</span>
              </div>

              <div className="space-y-2 mb-4 text-center">
                <div className="text-sm font-medium text-text">
                  {bet.match.home_team} vs {bet.match.away_team}
                </div>
                <div className="text-xs text-text-weak">
                  {format(bet.match.kickoff_utc, 'HH:mm', { locale: fr })}
                </div>
              </div>

              {/* Custom Bet Display */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">
                    Top Pick IA
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="default"
                      className="text-sm px-3 py-1"
                    >
                      {bet.type} {bet.prediction}
                    </Badge>
                    <div className="text-xl font-bold text-green-700">
                      {bet.odds.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">Probabilité:</span>
                    <span className="font-semibold text-green-800">{(bet.probability * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="relative h-2 bg-green-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                      style={{ width: `${bet.probability * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Hint */}
              <div className="mt-4 pt-3 border-t border-surface-strong/30">
                <div className="flex items-center justify-center gap-2 text-xs text-brand group-hover:text-brand-300 transition-colors">
                  <Zap className="h-3 w-3" />
                  Cliquer pour plus de détails
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}