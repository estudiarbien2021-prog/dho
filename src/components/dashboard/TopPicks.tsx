import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { generateConfidenceScore } from '@/lib/confidence';
import { generateAIRecommendation } from '@/lib/aiRecommendation';
import AIRecommendationDisplay from '@/components/AIRecommendationDisplay';
import { Trophy, Target, TrendingUp, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TopPicksProps {
  matches: ProcessedMatch[];
  onMatchClick: (match: ProcessedMatch) => void;
}

interface BestBet {
  match: ProcessedMatch;
  type: 'BTTS' | 'O/U 2.5';
  prediction: string;
  odds: number;
  probability: number;
  vigorish: number;
  score: number;
  edge: number;
}

export function TopPicks({ matches, onMatchClick }: TopPicksProps) {
  // Utiliser la même logique que les autres composants
  const getTopBets = () => {
    const validMatches = matches
      .map(match => ({
        match,
        aiRec: generateAIRecommendation(match, [])
      }))
      .filter(({ aiRec }) => aiRec !== null)
      .sort((a, b) => {
        // Trier par probabilité d'abord, puis par score
        const aProbability = a.match.p_btts_yes_fair || a.match.p_over_2_5_fair || 0;
        const bProbability = b.match.p_btts_yes_fair || b.match.p_over_2_5_fair || 0;
        
        if (Math.abs(aProbability - bProbability) > 0.01) {
          return bProbability - aProbability;
        }
        
        // Si probabilités similaires, utiliser le score
        const aScore = aProbability * (a.aiRec?.odds || 1);
        const bScore = bProbability * (b.aiRec?.odds || 1);
        return bScore - aScore;
      })
      .slice(0, 3);

    return validMatches;
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
        {topBets.map(({ match, aiRec }, index) => {
          const flagInfo = leagueToFlag(match.league, match.country, match.home_team, match.away_team);
          
          return (
            <Card 
              key={`${match.id}-top-pick-${index}`}
              className="group relative p-4 bg-gradient-to-br from-surface-soft to-surface border border-brand/30 hover:border-brand/50 transition-all duration-300 hover:shadow-xl hover:shadow-brand/20 cursor-pointer transform hover:scale-[1.02]"
              onClick={() => onMatchClick(match)}
            >
              {/* Rank Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-brand to-brand-400 rounded-full flex items-center justify-center text-brand-fg font-bold text-sm shadow-lg">
                {index + 1}
              </div>

              {/* Match Info */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                <span className="text-xs text-text-weak text-center truncate">{match.league}</span>
              </div>

              <div className="space-y-2 mb-4 text-center">
                <div className="text-sm font-medium text-text">
                  {match.home_team} vs {match.away_team}
                </div>
                <div className="text-xs text-text-weak">
                  {format(match.kickoff_utc, 'HH:mm', { locale: fr })}
                </div>
              </div>

              {/* AI Recommendation Display */}
              <div className="mt-4">
                <AIRecommendationDisplay
                  match={match}
                  marketFilters={[]}
                  variant="card"
                  showIcon={false}
                />
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