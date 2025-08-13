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

  // Donut chart data with futuristic colors
  const results1x2Data = [
    { name: 'Domicile', value: match.p_home_fair * 100, color: '#06b6d4' },
    { name: 'Nul', value: match.p_draw_fair * 100, color: '#8b5cf6' },
    { name: 'Extérieur', value: match.p_away_fair * 100, color: '#ec4899' },
  ];

  const bttsData = match.p_btts_yes_fair > 0 ? [
    { name: 'BTTS Oui', value: match.p_btts_yes_fair * 100, color: '#06b6d4' },
    { name: 'BTTS Non', value: match.p_btts_no_fair * 100, color: '#ec4899' },
  ] : [];

  const over25Data = match.p_over_2_5_fair > 0 ? [
    { name: 'Over 2.5', value: match.p_over_2_5_fair * 100, color: '#06b6d4' },
    { name: 'Under 2.5', value: match.p_under_2_5_fair * 100, color: '#ec4899' },
  ] : [];

  const DonutChart = ({ data, title }: { data: any[], title: string }) => (
    <Card className="relative p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-lg" />
      <h4 className="font-semibold text-center mb-6 text-lg text-cyan-100 relative z-10 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        {title}
      </h4>
      <div className="h-56 relative z-10">
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
              animationDuration={1200}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '8px',
                color: 'rgb(203, 213, 225)',
                backdropFilter: 'blur(8px)'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              wrapperStyle={{ color: 'rgb(203, 213, 225)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <DialogHeader className="pb-6 relative z-10">
          <DialogTitle className="flex items-center gap-4 text-2xl">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-400/20 to-purple-400/20 border border-cyan-400/30">
              <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {match.home_team} vs {match.away_team}
              </span>
              <span className="text-sm font-normal text-cyan-300/70">{match.league}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 relative z-10">
          {/* Match Info */}
          <Card className="relative p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              <div className="text-center md:text-left">
                <p className="text-sm text-cyan-300/70 mb-2">Catégorie</p>
                <Badge variant="secondary" className="capitalize bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-400/30 text-cyan-100">
                  {match.category.replace('_', ' ')}
                </Badge>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-cyan-300/70 mb-2">Heure UTC</p>
                <p className="font-medium flex items-center justify-center md:justify-start gap-2 text-cyan-100">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  {format(match.kickoff_utc, 'dd/MM HH:mm', { locale: fr })}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-cyan-300/70 mb-2">Heure São Paulo</p>
                <p className="font-medium flex items-center justify-center md:justify-start gap-2 text-cyan-100">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  {format(match.kickoff_local, 'dd/MM HH:mm', { locale: fr })}
                </p>
              </div>
              <div className="text-center md:text-left">
                <p className="text-sm text-cyan-300/70 mb-2">Vig 1X2</p>
                <Badge variant={match.vig_1x2 <= 0.12 ? "default" : "secondary"} className="font-mono bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 text-purple-100">
                  {(match.vig_1x2 * 100).toFixed(2)}%
                </Badge>
              </div>
            </div>
          </Card>

          {/* Flags */}
          <div className="flex gap-3 flex-wrap">
            {match.is_low_vig_1x2 && (
              <Badge variant="default" className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-400/40 text-emerald-100 hover:from-emerald-500/30 hover:to-green-500/30 transition-all duration-300">
                <TrendingDown className="h-3 w-3 mr-1" />
                Low Vig (≤12%)
              </Badge>
            )}
            {match.watch_btts && (
              <Badge variant="secondary" className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/40 text-cyan-100 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-300">
                <Target className="h-3 w-3 mr-1" />
                Watch BTTS
              </Badge>
            )}
            {match.watch_over25 && (
              <Badge variant="outline" className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/40 text-purple-100 hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300">
                <Eye className="h-3 w-3 mr-1" />
                Watch Over 2.5
              </Badge>
            )}
          </div>

          {/* Donut Charts */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-cyan-400 to-purple-400 rounded-full"></div>
              Analyse des Probabilités IA
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DonutChart data={results1x2Data} title="Résultat 1X2" />
              {bttsData.length > 0 && <DonutChart data={bttsData} title="Both Teams To Score" />}
              {over25Data.length > 0 && <DonutChart data={over25Data} title="Over/Under 2.5" />}
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          {/* Odds & Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Odds */}
            <Card className="relative p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-lg" />
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-cyan-100 relative z-10">
                <TrendingDown className="h-5 w-5 text-cyan-400" />
                Cotes Originales
              </h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-cyan-500/20">
                  <span className="font-medium text-cyan-100">Domicile:</span>
                  <span className="font-mono text-lg text-cyan-400">{match.odds_home.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-purple-500/20">
                  <span className="font-medium text-cyan-100">Nul:</span>
                  <span className="font-mono text-lg text-purple-400">{match.odds_draw.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-pink-500/20">
                  <span className="font-medium text-cyan-100">Extérieur:</span>
                  <span className="font-mono text-lg text-pink-400">{match.odds_away.toFixed(2)}</span>
                </div>
                {match.odds_btts_yes && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                    <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-cyan-500/20">
                      <span className="font-medium text-cyan-100">BTTS Oui:</span>
                      <span className="font-mono text-lg text-cyan-400">{match.odds_btts_yes.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {match.odds_over_2_5 && (
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-cyan-500/20">
                    <span className="font-medium text-cyan-100">Over 2.5:</span>
                    <span className="font-mono text-lg text-cyan-400">{match.odds_over_2_5.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Vigorish */}
            <Card className="relative p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-lg" />
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-cyan-100 relative z-10">
                <Target className="h-5 w-5 text-purple-400" />
                Marges (Vigorish)
              </h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-purple-500/20">
                  <span className="font-medium text-cyan-100">1X2:</span>
                  <Badge variant={match.vig_1x2 <= 0.12 ? "default" : "secondary"} className="text-sm bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/40 text-purple-100">
                    {(match.vig_1x2 * 100).toFixed(2)}%
                  </Badge>
                </div>
                {match.vig_btts > 0 && (
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-purple-500/20">
                    <span className="font-medium text-cyan-100">BTTS:</span>
                    <Badge variant={match.vig_btts <= 0.15 ? "default" : "secondary"} className="text-sm bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/40 text-purple-100">
                      {(match.vig_btts * 100).toFixed(2)}%
                    </Badge>
                  </div>
                )}
                {match.vig_ou_2_5 > 0 && (
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-purple-500/20">
                    <span className="font-medium text-cyan-100">O/U 2.5:</span>
                    <Badge variant={match.vig_ou_2_5 <= 0.15 ? "default" : "secondary"} className="text-sm bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-400/40 text-purple-100">
                      {(match.vig_ou_2_5 * 100).toFixed(2)}%
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Fair Probabilities */}
            <Card className="relative p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 rounded-lg" />
              <h4 className="font-semibold mb-4 flex items-center gap-2 text-cyan-100 relative z-10">
                <Eye className="h-5 w-5 text-emerald-400" />
                Probabilités Fair IA
              </h4>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center p-3 bg-cyan-500/10 rounded-lg border border-cyan-400/30">
                  <span className="font-medium text-cyan-100">Domicile:</span>
                  <span className="font-mono text-lg font-bold text-cyan-400">
                    {(match.p_home_fair * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-400/30">
                  <span className="font-medium text-cyan-100">Nul:</span>
                  <span className="font-mono text-lg font-bold text-purple-400">
                    {(match.p_draw_fair * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-pink-500/10 rounded-lg border border-pink-400/30">
                  <span className="font-medium text-cyan-100">Extérieur:</span>
                  <span className="font-mono text-lg font-bold text-pink-400">
                    {(match.p_away_fair * 100).toFixed(1)}%
                  </span>
                </div>
                {match.p_btts_yes_fair > 0 && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                    <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-emerald-500/20">
                      <span className="font-medium text-cyan-100">BTTS Oui:</span>
                      <span className="font-mono text-lg font-bold text-emerald-400">
                        {(match.p_btts_yes_fair * 100).toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
                {match.p_over_2_5_fair > 0 && (
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-emerald-500/20">
                    <span className="font-medium text-cyan-100">Over 2.5:</span>
                    <span className="font-mono text-lg font-bold text-emerald-400">
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
              className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 border-cyan-500/30 text-cyan-100 hover:from-slate-600/50 hover:to-slate-700/50 hover:border-cyan-400/50 transition-all duration-300"
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
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 border-0 text-white font-medium px-6 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
              onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}