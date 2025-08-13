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

  // Donut chart data with brand colors
  const results1x2Data = [
    { name: 'Domicile', value: match.p_home_fair * 100, color: 'hsl(150 85% 36%)' },
    { name: 'Nul', value: match.p_draw_fair * 100, color: 'hsl(150 60% 65%)' },
    { name: 'Extérieur', value: match.p_away_fair * 100, color: 'hsl(150 70% 50%)' },
  ];

  const bttsData = match.p_btts_yes_fair > 0 ? [
    { name: 'BTTS Oui', value: match.p_btts_yes_fair * 100, color: 'hsl(150 85% 36%)' },
    { name: 'BTTS Non', value: match.p_btts_no_fair * 100, color: 'hsl(150 60% 65%)' },
  ] : [];

  const over25Data = match.p_over_2_5_fair > 0 ? [
    { name: 'Over 2.5', value: match.p_over_2_5_fair * 100, color: 'hsl(150 85% 36%)' },
    { name: 'Under 2.5', value: match.p_under_2_5_fair * 100, color: 'hsl(150 60% 65%)' },
  ] : [];

  const DonutChart = ({ data, title }: { data: any[], title: string }) => (
    <Card className="group relative p-6 bg-gradient-to-br from-surface-soft to-surface-strong border border-brand/30 hover:border-brand/50 transition-all duration-500 hover:shadow-xl hover:shadow-brand/20 backdrop-blur-sm transform hover:scale-[1.02]">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-brand-300/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-transparent via-brand/5 to-transparent animate-pulse" />
      <h4 className="font-semibold text-center mb-6 text-lg text-text relative z-10 bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent transform group-hover:scale-105 transition-transform duration-300">
        {title}
      </h4>
      <div className="h-56 relative z-10 transform group-hover:scale-105 transition-transform duration-500">
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
              animationDuration={1500}
              animationEasing="ease-in-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  stroke={entry.color} 
                  strokeWidth={2}
                  className="drop-shadow-lg hover:drop-shadow-xl transition-all duration-300"
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
              contentStyle={{
                backgroundColor: 'hsl(var(--surface))',
                border: '1px solid hsl(var(--brand) / 0.3)',
                borderRadius: '12px',
                color: 'hsl(var(--text))',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px hsl(var(--brand) / 0.2)'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              wrapperStyle={{ color: 'hsl(var(--text))' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-surface via-surface-soft to-surface border border-brand/30 shadow-2xl shadow-brand/20 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-brand-300/10 pointer-events-none animate-pulse" />
        <div className="absolute inset-0 rounded-lg border border-brand/20 shadow-inner" />
        <DialogHeader className="pb-6 relative z-10">
          <DialogTitle className="flex items-center gap-4 text-2xl animate-fade-in">
            <div className="p-3 rounded-xl bg-gradient-to-r from-brand/20 to-brand-400/20 border border-brand/30 hover:border-brand/50 transition-all duration-300 hover:scale-105">
              <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent">
                {match.home_team} vs {match.away_team}
              </span>
              <span className="text-sm font-normal text-text-weak">{match.league}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 relative z-10">
          {/* Match Info */}
          <Card className="group relative p-6 bg-gradient-to-r from-surface-soft to-surface-strong border border-brand/30 hover:border-brand/50 transition-all duration-500 backdrop-blur-sm hover:shadow-xl hover:shadow-brand/20 transform hover:scale-[1.01]">
            <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-brand-300/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              <div className="text-center md:text-left">
                <p className="text-sm text-text-weak mb-2">Catégorie</p>
                <Badge variant="secondary" className="capitalize bg-gradient-to-r from-brand/20 to-brand-300/20 border-brand/30 text-text hover:from-brand/30 hover:to-brand-300/30 transition-all duration-300">
                  {match.category.replace('_', ' ')}
                </Badge>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-text-weak mb-2">Heure UTC</p>
                <p className="font-medium flex items-center justify-center md:justify-start gap-2 text-text">
                  <Clock className="h-4 w-4 text-brand" />
                  {format(match.kickoff_utc, 'dd/MM HH:mm', { locale: fr })}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-text-weak mb-2">Heure São Paulo</p>
                <p className="font-medium flex items-center justify-center md:justify-start gap-2 text-text">
                  <Clock className="h-4 w-4 text-brand" />
                  {format(match.kickoff_local, 'dd/MM HH:mm', { locale: fr })}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-text-weak mb-2">Vig 1X2</p>
                <Badge variant={match.vig_1x2 <= 0.12 ? "default" : "secondary"} className="font-mono bg-gradient-to-r from-brand-400/20 to-brand-600/20 border-brand-400/30 text-text hover:from-brand-400/30 hover:to-brand-600/30 transition-all duration-300">
                  {(match.vig_1x2 * 100).toFixed(2)}%
                </Badge>
              </div>
            </div>
          </Card>

          {/* Flags */}
          <div className="flex gap-3 flex-wrap">
            {match.is_low_vig_1x2 && (
              <Badge variant="default" className="bg-gradient-to-r from-brand/20 to-brand-400/20 border-brand/40 text-text hover:from-brand/30 hover:to-brand-400/30 transition-all duration-300 hover:scale-105">
                <TrendingDown className="h-3 w-3 mr-1" />
                Low Vig (≤12%)
              </Badge>
            )}
            {match.watch_btts && (
              <Badge variant="secondary" className="bg-gradient-to-r from-brand-300/20 to-brand-500/20 border-brand-300/40 text-text hover:from-brand-300/30 hover:to-brand-500/30 transition-all duration-300 hover:scale-105">
                <Target className="h-3 w-3 mr-1" />
                Watch BTTS
              </Badge>
            )}
            {match.watch_over25 && (
              <Badge variant="outline" className="bg-gradient-to-r from-brand-400/20 to-brand-600/20 border-brand-400/40 text-text hover:from-brand-400/30 hover:to-brand-600/30 transition-all duration-300 hover:scale-105">
                <Eye className="h-3 w-3 mr-1" />
                Watch Over 2.5
              </Badge>
            )}
          </div>

          {/* Donut Charts */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent flex items-center gap-3 animate-fade-in">
              <div className="w-1 h-8 bg-gradient-to-b from-brand to-brand-400 rounded-full animate-pulse"></div>
              Analyse des Probabilités IA
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DonutChart data={results1x2Data} title="Résultat 1X2" />
              {bttsData.length > 0 && <DonutChart data={bttsData} title="Both Teams To Score" />}
              {over25Data.length > 0 && <DonutChart data={over25Data} title="Over/Under 2.5" />}
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

          {/* Odds & Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Odds */}
            <Card className="group relative p-6 bg-gradient-to-br from-surface-soft to-surface-strong border border-brand/30 hover:border-brand/50 transition-all duration-500 hover:shadow-xl hover:shadow-brand/20 backdrop-blur-sm transform hover:scale-[1.01]">
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-brand-300/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-text relative z-10">
                <TrendingDown className="h-5 w-5 text-brand" />
                Cotes Originales
              </h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand/20 hover:border-brand/30 transition-colors duration-300">
                  <span className="font-medium text-text">Domicile:</span>
                  <span className="font-mono text-lg text-brand font-bold">{match.odds_home.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-300/20 hover:border-brand-300/30 transition-colors duration-300">
                  <span className="font-medium text-text">Nul:</span>
                  <span className="font-mono text-lg text-brand-300 font-bold">{match.odds_draw.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-400/20 hover:border-brand-400/30 transition-colors duration-300">
                  <span className="font-medium text-text">Extérieur:</span>
                  <span className="font-mono text-lg text-brand-400 font-bold">{match.odds_away.toFixed(2)}</span>
                </div>
                {match.odds_btts_yes && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
                    <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand/20 hover:border-brand/30 transition-colors duration-300">
                      <span className="font-medium text-text">BTTS Oui:</span>
                      <span className="font-mono text-lg text-brand font-bold">{match.odds_btts_yes.toFixed(2)}</span>
                    </div>
                    {match.odds_btts_no && (
                      <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-300/20 hover:border-brand-300/30 transition-colors duration-300">
                        <span className="font-medium text-text">BTTS Non:</span>
                        <span className="font-mono text-lg text-brand-300 font-bold">{match.odds_btts_no.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                {match.odds_over_2_5 && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand/20 hover:border-brand/30 transition-colors duration-300">
                      <span className="font-medium text-text">Over 2.5:</span>
                      <span className="font-mono text-lg text-brand font-bold">{match.odds_over_2_5.toFixed(2)}</span>
                    </div>
                    {match.odds_under_2_5 && (
                      <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-300/20 hover:border-brand-300/30 transition-colors duration-300">
                        <span className="font-medium text-text">Under 2.5:</span>
                        <span className="font-mono text-lg text-brand-300 font-bold">{match.odds_under_2_5.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Vigorish */}
            <Card className="group relative p-6 bg-gradient-to-br from-surface-soft to-surface-strong border border-brand-300/30 hover:border-brand-300/50 transition-all duration-500 hover:shadow-xl hover:shadow-brand-300/20 backdrop-blur-sm transform hover:scale-[1.01]">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-300/5 to-brand-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-text relative z-10">
                <Target className="h-5 w-5 text-brand-300" />
                Marges (Vigorish)
              </h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-300/20 hover:border-brand-300/30 transition-colors duration-300">
                  <span className="font-medium text-text">1X2:</span>
                  <Badge variant={match.vig_1x2 <= 0.12 ? "default" : "secondary"} className="text-sm bg-gradient-to-r from-brand-300/30 to-brand-400/30 border-brand-300/40 text-text font-bold">
                    {(match.vig_1x2 * 100).toFixed(2)}%
                  </Badge>
                </div>
                {match.vig_btts > 0 && (
                  <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-300/20 hover:border-brand-300/30 transition-colors duration-300">
                    <span className="font-medium text-text">BTTS:</span>
                    <Badge variant={match.vig_btts <= 0.15 ? "default" : "secondary"} className="text-sm bg-gradient-to-r from-brand-300/30 to-brand-400/30 border-brand-300/40 text-text font-bold">
                      {(match.vig_btts * 100).toFixed(2)}%
                    </Badge>
                  </div>
                )}
                {match.vig_ou_2_5 > 0 && (
                  <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-300/20 hover:border-brand-300/30 transition-colors duration-300">
                    <span className="font-medium text-text">O/U 2.5:</span>
                    <Badge variant={match.vig_ou_2_5 <= 0.15 ? "default" : "secondary"} className="text-sm bg-gradient-to-r from-brand-300/30 to-brand-400/30 border-brand-300/40 text-text font-bold">
                      {(match.vig_ou_2_5 * 100).toFixed(2)}%
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Fair Probabilities */}
            <Card className="group relative p-6 bg-gradient-to-br from-surface-soft to-surface-strong border border-brand-400/30 hover:border-brand-400/50 transition-all duration-500 hover:shadow-xl hover:shadow-brand-400/20 backdrop-blur-sm transform hover:scale-[1.01]">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-400/5 to-brand-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-text relative z-10">
                <Eye className="h-5 w-5 text-brand-400" />
                Probabilités Fair IA
              </h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center p-3 bg-brand/10 rounded-lg border border-brand/30 hover:border-brand/40 transition-colors duration-300">
                  <span className="font-medium text-text">Domicile:</span>
                  <span className="font-mono text-lg font-bold text-brand">
                    {(match.p_home_fair * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-brand-300/10 rounded-lg border border-brand-300/30 hover:border-brand-300/40 transition-colors duration-300">
                  <span className="font-medium text-text">Nul:</span>
                  <span className="font-mono text-lg font-bold text-brand-300">
                    {(match.p_draw_fair * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-brand-400/10 rounded-lg border border-brand-400/30 hover:border-brand-400/40 transition-colors duration-300">
                  <span className="font-medium text-text">Extérieur:</span>
                  <span className="font-mono text-lg font-bold text-brand-400">
                    {(match.p_away_fair * 100).toFixed(1)}%
                  </span>
                </div>
                {match.p_btts_yes_fair > 0 && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-brand-400/30 to-transparent" />
                    <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-400/20 hover:border-brand-400/30 transition-colors duration-300">
                      <span className="font-medium text-text">BTTS Oui:</span>
                      <span className="font-mono text-lg font-bold text-brand-400">
                        {(match.p_btts_yes_fair * 100).toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
                {match.p_over_2_5_fair > 0 && (
                  <div className="flex justify-between items-center p-3 bg-surface-strong/50 rounded-lg border border-brand-400/20 hover:border-brand-400/30 transition-colors duration-300">
                    <span className="font-medium text-text">Over 2.5:</span>
                    <span className="font-mono text-lg font-bold text-brand-400">
                      {(match.p_over_2_5_fair * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" 
              className="bg-gradient-to-r from-surface-soft to-surface-strong border-brand/30 text-text hover:from-surface-strong hover:to-surface border-brand/40 transition-all duration-300"
              onClick={() => {
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
            <Button 
              className="bg-gradient-to-r from-brand to-brand-400 hover:from-brand-600 hover:to-brand-700 border-0 text-brand-fg font-medium px-6 transition-all duration-300 hover:shadow-lg hover:shadow-brand/20"
              onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}