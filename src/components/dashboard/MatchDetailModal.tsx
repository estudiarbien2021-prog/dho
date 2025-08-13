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
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <h4 className="font-semibold text-center mb-6 text-lg">{title}</h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
            <div className="flex flex-col">
              <span className="font-bold">{match.home_team} vs {match.away_team}</span>
              <span className="text-sm font-normal text-muted-foreground">{match.league}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Info */}
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Catégorie</p>
                <Badge variant="secondary" className="capitalize">
                  {match.category.replace('_', ' ')}
                </Badge>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Heure UTC</p>
                <p className="font-medium flex items-center justify-center md:justify-start gap-1">
                  <Clock className="h-4 w-4" />
                  {format(match.kickoff_utc, 'dd/MM HH:mm', { locale: fr })}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Heure São Paulo</p>
                <p className="font-medium flex items-center justify-center md:justify-start gap-1">
                  <Clock className="h-4 w-4" />
                  {format(match.kickoff_local, 'dd/MM HH:mm', { locale: fr })}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground mb-1">Vig 1X2</p>
                <Badge variant={match.vig_1x2 <= 0.12 ? "default" : "secondary"} className="font-mono">
                  {(match.vig_1x2 * 100).toFixed(2)}%
                </Badge>
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
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Analyse des Probabilités</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DonutChart data={results1x2Data} title="Résultat 1X2" />
              {bttsData.length > 0 && <DonutChart data={bttsData} title="Both Teams To Score" />}
              {over25Data.length > 0 && <DonutChart data={over25Data} title="Over/Under 2.5" />}
            </div>
          </div>

          <Separator />

          {/* Odds & Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Odds */}
            <Card className="p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Cotes Originales
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="font-medium">Domicile:</span>
                  <span className="font-mono text-lg">{match.odds_home.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="font-medium">Nul:</span>
                  <span className="font-mono text-lg">{match.odds_draw.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span className="font-medium">Extérieur:</span>
                  <span className="font-mono text-lg">{match.odds_away.toFixed(2)}</span>
                </div>
                {match.odds_btts_yes && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="font-medium">BTTS Oui:</span>
                      <span className="font-mono text-lg">{match.odds_btts_yes.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {match.odds_over_2_5 && (
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="font-medium">Over 2.5:</span>
                    <span className="font-mono text-lg">{match.odds_over_2_5.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Vigorish */}
            <Card className="p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Marges (Vigorish)
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                  <span className="font-medium">1X2:</span>
                  <Badge variant={match.vig_1x2 <= 0.12 ? "default" : "secondary"} className="text-sm">
                    {(match.vig_1x2 * 100).toFixed(2)}%
                  </Badge>
                </div>
                {match.vig_btts > 0 && (
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                    <span className="font-medium">BTTS:</span>
                    <Badge variant={match.vig_btts <= 0.15 ? "default" : "secondary"} className="text-sm">
                      {(match.vig_btts * 100).toFixed(2)}%
                    </Badge>
                  </div>
                )}
                {match.vig_ou_2_5 > 0 && (
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
                    <span className="font-medium">O/U 2.5:</span>
                    <Badge variant={match.vig_ou_2_5 <= 0.15 ? "default" : "secondary"} className="text-sm">
                      {(match.vig_ou_2_5 * 100).toFixed(2)}%
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Fair Probabilities */}
            <Card className="p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Probabilités Fair
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                  <span className="font-medium">Domicile:</span>
                  <span className="font-mono text-lg font-bold text-green-700 dark:text-green-400">
                    {(match.p_home_fair * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <span className="font-medium">Nul:</span>
                  <span className="font-mono text-lg font-bold text-yellow-700 dark:text-yellow-400">
                    {(match.p_draw_fair * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                  <span className="font-medium">Extérieur:</span>
                  <span className="font-mono text-lg font-bold text-red-700 dark:text-red-400">
                    {(match.p_away_fair * 100).toFixed(1)}%
                  </span>
                </div>
                {match.p_btts_yes_fair > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <span className="font-medium">BTTS Oui:</span>
                      <span className="font-mono text-lg font-bold">
                        {(match.p_btts_yes_fair * 100).toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
                {match.p_over_2_5_fair > 0 && (
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="font-medium">Over 2.5:</span>
                    <span className="font-mono text-lg font-bold">
                      {(match.p_over_2_5_fair * 100).toFixed(1)}%
                    </span>
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