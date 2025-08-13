import React from 'react';
import { ProcessedMatch } from '@/types/match';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FlagMini } from '@/components/Flag';
import { leagueToFlag } from '@/lib/leagueCountry';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, TrendingDown, Target, Eye, Download } from 'lucide-react';

interface MatchDetailModalProps {
  match: ProcessedMatch | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MatchDetailModal({ match, isOpen, onClose }: MatchDetailModalProps) {
  if (!match) return null;

  const flagInfo = leagueToFlag(match.league);

  // Donut chart data
  const results1x2Data = [
    { name: 'Domicile', value: match.p_home_fair * 100, color: '#22c55e' },
    { name: 'Nul', value: match.p_draw_fair * 100, color: '#eab308' },
    { name: 'Extérieur', value: match.p_away_fair * 100, color: '#ef4444' },
  ];

  const bttsData = match.p_btts_yes_fair > 0 ? [
    { name: 'BTTS Oui', value: match.p_btts_yes_fair * 100, color: '#22c55e' },
    { name: 'BTTS Non', value: match.p_btts_no_fair * 100, color: '#ef4444' },
  ] : [];

  const over25Data = match.p_over_2_5_fair > 0 ? [
    { name: 'Over 2.5', value: match.p_over_2_5_fair * 100, color: '#22c55e' },
    { name: 'Under 2.5', value: match.p_under_2_5_fair * 100, color: '#ef4444' },
  ] : [];

  const DonutChart = ({ data, title }: { data: any[], title: string }) => (
    <Card className="p-4">
      <h4 className="font-medium text-center mb-4">{title}</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
            <span>{match.home_team} vs {match.away_team}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Info */}
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Compétition</p>
                <p className="font-medium">{match.league}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Catégorie</p>
                <p className="font-medium capitalize">{match.category.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Heure UTC</p>
                <p className="font-medium">
                  {format(match.kickoff_utc, 'dd/MM/yyyy HH:mm', { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Heure locale</p>
                <p className="font-medium">
                  {format(match.kickoff_local, 'dd/MM/yyyy HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          </Card>

          {/* Flags */}
          <div className="flex gap-2 flex-wrap">
            {match.is_low_vig_1x2 && (
              <Badge variant="default">
                <TrendingDown className="h-3 w-3 mr-1" />
                Low Vig (≤12%)
              </Badge>
            )}
            {match.watch_btts && (
              <Badge variant="secondary">
                <Target className="h-3 w-3 mr-1" />
                Watch BTTS
              </Badge>
            )}
            {match.watch_over25 && (
              <Badge variant="outline">
                <Eye className="h-3 w-3 mr-1" />
                Watch Over 2.5
              </Badge>
            )}
          </div>

          {/* Donut Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DonutChart data={results1x2Data} title="Résultat 1X2" />
            {bttsData.length > 0 && <DonutChart data={bttsData} title="Both Teams To Score" />}
            {over25Data.length > 0 && <DonutChart data={over25Data} title="Over/Under 2.5" />}
          </div>

          <Separator />

          {/* Odds & Probabilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Odds */}
            <Card className="p-4">
              <h4 className="font-medium mb-4">Cotes Originales</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Domicile:</span>
                  <span className="font-mono">{match.odds_home.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nul:</span>
                  <span className="font-mono">{match.odds_draw.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extérieur:</span>
                  <span className="font-mono">{match.odds_away.toFixed(2)}</span>
                </div>
                <Separator />
                {match.odds_btts_yes && (
                  <div className="flex justify-between">
                    <span>BTTS Oui:</span>
                    <span className="font-mono">{match.odds_btts_yes.toFixed(2)}</span>
                  </div>
                )}
                {match.odds_over_2_5 && (
                  <div className="flex justify-between">
                    <span>Over 2.5:</span>
                    <span className="font-mono">{match.odds_over_2_5.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Vigorish */}
            <Card className="p-4">
              <h4 className="font-medium mb-4">Marges (Vigorish)</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>1X2:</span>
                  <Badge variant={match.vig_1x2 <= 0.12 ? "default" : "secondary"}>
                    {(match.vig_1x2 * 100).toFixed(2)}%
                  </Badge>
                </div>
                {match.vig_btts > 0 && (
                  <div className="flex justify-between items-center">
                    <span>BTTS:</span>
                    <Badge variant={match.vig_btts <= 0.15 ? "default" : "secondary"}>
                      {(match.vig_btts * 100).toFixed(2)}%
                    </Badge>
                  </div>
                )}
                {match.vig_ou_2_5 > 0 && (
                  <div className="flex justify-between items-center">
                    <span>O/U 2.5:</span>
                    <Badge variant={match.vig_ou_2_5 <= 0.15 ? "default" : "secondary"}>
                      {(match.vig_ou_2_5 * 100).toFixed(2)}%
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              // Export match data as CSV
              const csvData = `League,Home,Away,Kickoff,Vig_1X2,P_Home,P_Draw,P_Away
${match.league},${match.home_team},${match.away_team},${match.kickoff_utc.toISOString()},${match.vig_1x2},${match.p_home_fair},${match.p_draw_fair},${match.p_away_fair}`;
              
              const blob = new Blob([csvData], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `match-${match.home_team.replace(/\s+/g, '-')}-vs-${match.away_team.replace(/\s+/g, '-')}.csv`;
              a.click();
            }}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}