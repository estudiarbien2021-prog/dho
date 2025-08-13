import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe, TrendingUp } from 'lucide-react';

interface TeamInfo {
  name: string;
}

interface TournamentInfo {
  name: string;
  country?: string;
}

interface OneX2 {
  home?: number;
  draw?: number;
  away?: number;
}

interface BTTS {
  yes?: number;
  no?: number;
}

interface OUline {
  over?: number;
  under?: number;
}

interface AHline {
  line?: number;
  home?: number;
  away?: number;
}

interface BookmakerOdds {
  name: string;
  oneX2?: OneX2;
  btts?: BTTS;
  ou?: Record<string, OUline>;
  ah?: Record<string, AHline>;
  ahMain?: AHline;
}

export interface MatchOdds {
  id: string;
  startTimestamp: number;
  tournament: TournamentInfo;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  bookmakers: BookmakerOdds[];
}

interface OddsTableProps {
  matches: MatchOdds[];
  showSaoPauloTime: boolean;
  showParisTime: boolean;
  loading?: boolean;
}

const formatTime = (timestamp: number, timezone: string) => {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(timestamp * 1000));
};

const OddsCell: React.FC<{ odds?: number; className?: string }> = ({ odds, className = '' }) => {
  if (!odds || odds <= 1.0) return <span className="text-muted-foreground">-</span>;
  
  const impliedProbability = ((1 / odds) * 100).toFixed(1);
  
  return (
    <div className={`font-mono text-sm font-medium cursor-help ${className}`} 
         title={`Probabilité implicite: ${impliedProbability}%`}>
      {odds.toFixed(2)}
    </div>
  );
};

export const OddsTable: React.FC<OddsTableProps> = ({ 
  matches, 
  showSaoPauloTime, 
  showParisTime, 
  loading = false 
}) => {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Chargement des cotes...</span>
        </div>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Aucun match trouvé</h3>
          <p>Essayez d'ajuster vos filtres ou de charger de nouvelles données.</p>
        </div>
      </Card>
    );
  }

  const getBestBookmaker = (match: MatchOdds) => {
    const preferredBookmakers = ['Bet365', 'Unibet', 'Betfair', 'Betclic'];
    return match.bookmakers.find(bm => 
      preferredBookmakers.some(pref => bm.name.toLowerCase().includes(pref.toLowerCase()))
    ) || match.bookmakers[0];
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="bg-table-header rounded-t-lg p-3 grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground sticky top-0 z-10">
        {showSaoPauloTime && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>SP</span>
          </div>
        )}
        {showParisTime && (
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            <span>Paris</span>
          </div>
        )}
        <div className="col-span-2">Compétition</div>
        <div className="col-span-2">Match</div>
        <div>1</div>
        <div>X</div>
        <div>2</div>
        <div>BTTS Y</div>
        <div>BTTS N</div>
        <div>O2.5</div>
        <div>U2.5</div>
      </div>

      {/* Rows */}
      {matches.map((match) => {
        const bestBookmaker = getBestBookmaker(match);
        
        return (
          <div key={match.id} 
               className="bg-table-row hover:bg-table-row-hover transition-colors p-3 grid grid-cols-12 gap-2 text-sm border-b border-border">
            
            {showSaoPauloTime && (
              <div className="text-xs text-odds-neutral">
                {formatTime(match.startTimestamp, 'America/Sao_Paulo')}
              </div>
            )}
            
            {showParisTime && (
              <div className="text-xs text-odds-neutral">
                {formatTime(match.startTimestamp, 'Europe/Paris')}
              </div>
            )}
            
            <div className="col-span-2">
              <Badge variant="outline" className="text-xs">
                {match.tournament.name}
              </Badge>
              {match.tournament.country && (
                <div className="text-xs text-muted-foreground mt-1">
                  {match.tournament.country}
                </div>
              )}
            </div>
            
            <div className="col-span-2">
              <div className="font-medium">{match.homeTeam.name}</div>
              <div className="text-muted-foreground">vs {match.awayTeam.name}</div>
            </div>
            
            <OddsCell odds={bestBookmaker?.oneX2?.home} className="text-odds-positive" />
            <OddsCell odds={bestBookmaker?.oneX2?.draw} className="text-odds-neutral" />
            <OddsCell odds={bestBookmaker?.oneX2?.away} className="text-odds-positive" />
            <OddsCell odds={bestBookmaker?.btts?.yes} className="text-odds-positive" />
            <OddsCell odds={bestBookmaker?.btts?.no} className="text-odds-negative" />
            <OddsCell odds={bestBookmaker?.ou?.['2.5']?.over} className="text-odds-positive" />
            <OddsCell odds={bestBookmaker?.ou?.['2.5']?.under} className="text-odds-negative" />
          </div>
        );
      })}
    </div>
  );
};