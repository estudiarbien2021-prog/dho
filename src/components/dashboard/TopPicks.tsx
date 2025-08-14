import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { generateConfidenceScore } from '@/lib/confidence';
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
  // Calculate the best bets using the same logic as MatchDetailModal
  const getTopBets = (): BestBet[] => {
    const allBets: BestBet[] = [];

    matches.forEach(match => {
      // Category weight system - prioritize continental competitions above all
      const getCategoryWeight = (category: string) => {
        switch (category) {
          case 'continental_cup': return 1.5; // Continental competitions (HIGHEST priority)
          case 'first_div': return 1.2; // National championships (high priority)
          case 'second_div': return 1.0; // Second division (neutral)
          case 'national_cup': return 0.6; // National cups (strongly deprioritized)
          default: return 1.0;
        }
      };

      const categoryWeight = getCategoryWeight(match.category);

      // BTTS markets - probability > 55% and odds >= 1.5
      if (match.odds_btts_yes && match.odds_btts_yes >= 1.5 && match.p_btts_yes_fair && match.p_btts_yes_fair > 0.55) {
        const baseScore = match.p_btts_yes_fair * match.odds_btts_yes * (1 + match.vig_btts);
        const score = baseScore * categoryWeight; // Apply category weight
        const edge = ((match.odds_btts_yes * match.p_btts_yes_fair) - 1) * 100;
        allBets.push({
          match,
          type: 'BTTS',
          prediction: 'Oui',
          odds: match.odds_btts_yes,
          probability: match.p_btts_yes_fair,
          vigorish: match.vig_btts,
          score,
          edge
        });
      }

      if (match.odds_btts_no && match.odds_btts_no >= 1.5 && match.p_btts_no_fair && match.p_btts_no_fair > 0.55) {
        const baseScore = match.p_btts_no_fair * match.odds_btts_no * (1 + match.vig_btts);
        const score = baseScore * categoryWeight; // Apply category weight
        const edge = ((match.odds_btts_no * match.p_btts_no_fair) - 1) * 100;
        allBets.push({
          match,
          type: 'BTTS',
          prediction: 'Non',
          odds: match.odds_btts_no,
          probability: match.p_btts_no_fair,
          vigorish: match.vig_btts,
          score,
          edge
        });
      }

      // Over/Under markets - probability > 55% and odds >= 1.5
      if (match.odds_over_2_5 && match.odds_over_2_5 >= 1.5 && match.p_over_2_5_fair > 0.55) {
        const baseScore = match.p_over_2_5_fair * match.odds_over_2_5 * (1 + match.vig_ou_2_5);
        const score = baseScore * categoryWeight; // Apply category weight
        const edge = ((match.odds_over_2_5 * match.p_over_2_5_fair) - 1) * 100;
        allBets.push({
          match,
          type: 'O/U 2.5',
          prediction: '+2,5 buts',
          odds: match.odds_over_2_5,
          probability: match.p_over_2_5_fair,
          vigorish: match.vig_ou_2_5,
          score,
          edge
        });
      }

      if (match.odds_under_2_5 && match.odds_under_2_5 >= 1.5 && match.p_under_2_5_fair > 0.55) {
        const baseScore = match.p_under_2_5_fair * match.odds_under_2_5 * (1 + match.vig_ou_2_5);
        const score = baseScore * categoryWeight; // Apply category weight
        const edge = ((match.odds_under_2_5 * match.p_under_2_5_fair) - 1) * 100;
        allBets.push({
          match,
          type: 'O/U 2.5',
          prediction: '-2,5 buts',
          odds: match.odds_under_2_5,
          probability: match.p_under_2_5_fair,
          vigorish: match.vig_ou_2_5,
          score,
          edge
        });
      }
    });

    // Sort by score (best opportunities) and take top 3
    // Always show the 3 best matches of the day, regardless of edge
    return allBets
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const topBets = getTopBets();

  if (topBets.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-surface-soft to-surface border border-brand/20">
        <div className="text-center">
          <Target className="h-12 w-12 text-brand/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">Aucune opportunité premium détectée</h3>
          <p className="text-text-weak text-sm">
            Aucun pari ne répond aux critères : probabilité IA {'>'} 55% ET cotes ≥ 1.5.
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
          <p className="text-sm text-text-weak">Sélection qualitative : probabilité {'>'} 55% ET cotes ≥ 1.5</p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {topBets.map((bet, index) => {
          const flagInfo = leagueToFlag(bet.match.league, bet.match.country, bet.match.home_team, bet.match.away_team);
          
          return (
            <Card 
              key={`${bet.match.id}-${bet.type}-${bet.prediction}`}
              className="group relative p-4 bg-gradient-to-br from-surface-soft to-surface border border-brand/30 hover:border-brand/50 transition-all duration-300 hover:shadow-xl hover:shadow-brand/20 cursor-pointer transform hover:scale-[1.02]"
              onClick={() => onMatchClick(bet.match)}
            >
              {/* Rank Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-brand to-brand-400 rounded-full flex items-center justify-center text-brand-fg font-bold text-sm shadow-lg">
                {index + 1}
              </div>

              {/* Match Info */}
              <div className="flex items-center gap-2 mb-3">
                <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                <span className="text-xs text-text-weak truncate">{bet.match.league}</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium text-text truncate">
                  {bet.match.home_team} vs {bet.match.away_team}
                </div>
                <div className="text-xs text-text-weak">
                  {format(bet.match.kickoff_utc, 'HH:mm', { locale: fr })}
                </div>
              </div>

              {/* Bet Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="bg-gradient-to-r from-brand/30 to-brand-300/30 border-brand/40 text-text font-bold">
                    {bet.type} {bet.prediction}
                  </Badge>
                  <div className="text-lg font-bold text-brand">
                    {bet.odds.toFixed(2)}
                  </div>
                </div>

                {/* Animated Probability Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-weak">Probabilité IA:</span>
                    <span className="font-medium text-brand">{(bet.probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="relative h-2 bg-surface-strong/50 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand via-brand-300 to-brand-400 rounded-full shadow-lg animate-pulse"
                      style={{ 
                        width: `${bet.probability * 100}%`,
                        boxShadow: '0 0 10px hsl(var(--brand) / 0.6), 0 0 20px hsl(var(--brand) / 0.4)',
                        animation: 'pulse 2s ease-in-out infinite'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-right"></div>
                    </div>
                  </div>
                  
                  {/* Confidence Index */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-weak">Indice de confiance:</span>
                    <span className="font-medium text-brand-300">
                      {generateConfidenceScore(bet.match.id)}/100
                    </span>
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