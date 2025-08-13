import React, { useState } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Brain, ExternalLink } from 'lucide-react';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MatchesTableProps {
  matches: ProcessedMatch[];
  onMatchClick: (match: ProcessedMatch) => void;
}

export function MatchesTable({ matches, onMatchClick }: MatchesTableProps) {
  const [sortField, setSortField] = useState<keyof ProcessedMatch>('kickoff_utc');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedMatches = [...matches].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    if (aVal instanceof Date && bVal instanceof Date) {
      return sortDirection === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
    }
    
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  const handleSort = (field: keyof ProcessedMatch) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: fr });
  };

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM', { locale: fr });
  };

  if (matches.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucun match trouvé avec les filtres actuels.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 min-w-[200px]"
                onClick={() => handleSort('league')}
              >
                Compétition
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 min-w-[250px]"
                onClick={() => handleSort('home_team')}
              >
                Match
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('kickoff_utc')}
              >
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Heure
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('vig_1x2')}
              >
                Évaluation
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Brain className="h-4 w-4" />
                  Recommandation IA
                </div>
              </TableHead>
              <TableHead>Probas</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMatches.map((match) => {
              const flagInfo = leagueToFlag(match.league);
              
              return (
                <TableRow 
                  key={match.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onMatchClick(match)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
                      <div>
                        <p className="font-medium text-sm">{match.league}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {match.category.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{match.home_team}</p>
                      <p className="text-muted-foreground">vs {match.away_team}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-center">
                      <p className="font-medium">{formatTime(match.kickoff_utc)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(match.kickoff_utc)}</p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={match.vig_1x2 <= 0.12 ? "default" : "destructive"}
                      className="font-medium"
                    >
                      {match.vig_1x2 <= 0.12 ? "Idéal" : "À éviter"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      {match.is_low_vig_1x2 && (
                        <p className="text-xs text-brand-500 font-medium">
                          ✓ Match recommandé (faible marge)
                        </p>
                      )}
                      {match.watch_btts && (
                        <p className="text-xs text-surface-soft">
                          • Opportunité BTTS détectée
                        </p>
                      )}
                      {match.watch_over25 && (
                        <p className="text-xs text-surface-soft">
                          • Potentiel Over 2.5 buts
                        </p>
                      )}
                      {!match.is_low_vig_1x2 && !match.watch_btts && !match.watch_over25 && (
                        <p className="text-xs text-text-mute">
                          Aucune recommandation spéciale
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>H:</span>
                        <span className="font-mono">{(match.p_home_fair * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>D:</span>
                        <span className="font-mono">{(match.p_draw_fair * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>A:</span>
                        <span className="font-mono">{(match.p_away_fair * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMatchClick(match);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}