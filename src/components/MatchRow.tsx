import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { FlagMini } from './FlagMini';
import { leagueToFlag } from '@/lib/leagueCountry';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MatchRowProps {
  match: ProcessedMatch;
  onClick: () => void;
}

export function MatchRow({ match, onClick }: MatchRowProps) {
  const flagInfo = leagueToFlag(match.league);
  
  return (
    <div 
      className="flex items-center gap-4 p-3 hover:bg-surface-soft cursor-pointer border-b border-surface-strong transition-colors"
      onClick={onClick}
    >
      {/* Flag */}
      <div className="flex-shrink-0">
        <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
      </div>
      
      {/* Time */}
      <div className="flex-shrink-0 text-sm text-text-weak w-16">
        {format(match.kickoff_local, 'HH:mm', { locale: fr })}
      </div>
      
      {/* League */}
      <div className="flex-shrink-0 text-xs text-text-mute w-32 truncate">
        {match.league}
      </div>
      
      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text truncate">
          {match.home_team} vs {match.away_team}
        </div>
      </div>
      
      {/* Badges */}
      <div className="flex gap-1 flex-shrink-0">
        {match.is_low_vig_1x2 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-brand-50 text-brand-600">
            Low-vig
          </Badge>
        )}
        {match.watch_btts && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600">
            BTTS
          </Badge>
        )}
        {match.watch_over25 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600">
            Over25
          </Badge>
        )}
      </div>
      
      {/* Vigorish */}
      <div className="flex-shrink-0 text-xs text-text-weak w-12 text-right">
        {(match.vig_1x2 * 100).toFixed(1)}%
      </div>
    </div>
  );
}