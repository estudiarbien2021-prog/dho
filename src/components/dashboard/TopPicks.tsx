import React, { useState, useEffect } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { Trophy, Target, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface ValidatedPick {
  id: string;
  match_id: string;
  league: string;
  home_team: string;
  away_team: string;
  country?: string;
  kickoff_utc: string;
  bet_type: string;
  prediction: string;
  odds: number;
  probability: number;
  vigorish: number;
  is_validated: boolean;
}

interface TopPicksProps {
  matches: ProcessedMatch[];
  onMatchClick: (match: ProcessedMatch) => void;
}

export function TopPicks({ matches, onMatchClick }: TopPicksProps) {
  const [validatedPicks, setValidatedPicks] = useState<ValidatedPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadValidatedPicks();
  }, []);

  const loadValidatedPicks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('validated_picks')
        .select('*')
        .eq('is_validated', true)
        .order('vigorish', { ascending: false })
        .order('probability', { ascending: false })
        .limit(3);

      if (error) throw error;
      setValidatedPicks(data || []);
    } catch (error) {
      console.error('Error loading validated picks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickClick = (pick: ValidatedPick) => {
    // Trouver le match correspondant et déclencher onMatchClick
    const correspondingMatch = matches.find(m => m.id === pick.match_id);
    if (correspondingMatch) {
      onMatchClick(correspondingMatch);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-surface-soft to-surface border border-brand/20">
        <div className="text-center">
          <Target className="h-12 w-12 text-brand/50 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-text mb-2">Chargement des picks...</h3>
        </div>
      </Card>
    );
  }

  if (validatedPicks.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-surface-soft to-surface border border-brand/20">
        <div className="text-center">
          <Target className="h-12 w-12 text-brand/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">Aucun pick validé</h3>
          <p className="text-text-weak text-sm">
            Les administrateurs n'ont pas encore validé de picks pour aujourd'hui.
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
          <p className="text-sm text-text-weak">Sélection validée par nos experts</p>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {validatedPicks.map((pick, index) => {
          const flagInfo = leagueToFlag(pick.league, pick.country, pick.home_team, pick.away_team);
          
          return (
            <Card 
              key={`validated-pick-${pick.id}`}
              className="group relative p-4 bg-gradient-to-br from-surface-soft to-surface border border-brand/30 hover:border-brand/50 transition-all duration-300 hover:shadow-xl hover:shadow-brand/20 cursor-pointer transform hover:scale-[1.02]"
              onClick={() => handlePickClick(pick)}
            >
              {/* Rank Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-brand to-brand-400 rounded-full flex items-center justify-center text-brand-fg font-bold text-sm shadow-lg">
                {index + 1}
              </div>

              {/* Match Info */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                <span className="text-xs text-text-weak text-center truncate">{pick.league}</span>
              </div>

              <div className="space-y-2 mb-4 text-center">
                <div className="text-sm font-medium text-text">
                  {pick.home_team} vs {pick.away_team}
                </div>
                <div className="text-xs text-text-weak">
                  {format(new Date(pick.kickoff_utc), 'HH:mm', { locale: fr })}
                </div>
              </div>

              {/* Custom Bet Display */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">
                    Pick Validé
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="default"
                      className="text-sm px-3 py-1"
                    >
                      {pick.bet_type} {pick.prediction}
                    </Badge>
                    <div className="text-xl font-bold text-green-700">
                      {pick.odds.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">Probabilité:</span>
                    <span className="font-semibold text-green-800">{(pick.probability * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="relative h-2 bg-green-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                      style={{ width: `${pick.probability * 100}%` }}
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