import React, { useState } from 'react';
import { ProcessedMatch } from '@/types/match';
import { FlagMini } from '@/components/FlagMini';
import { DonutChart } from '@/components/DonutChart';
import { leagueToFlag } from '@/lib/leagueCountry';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Download } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

interface MatchDetailProps {
  match: ProcessedMatch;
  onBack: () => void;
}

export function MatchDetail({ match, onBack }: MatchDetailProps) {
  const [showParisTime, setShowParisTime] = useState(false);
  const flagInfo = leagueToFlag(match.league);
  
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const displayTime = showParisTime 
    ? formatInTimeZone(match.kickoff_utc, 'Europe/Paris', 'PPP à HH:mm', { locale: fr })
    : format(match.kickoff_local, 'PPP à HH:mm', { locale: fr });

  // Prepare donut data
  const oddsData1x2 = [
    { name: 'Domicile', value: match.p_home_fair, odds: match.odds_home, color: 'hsl(150, 85%, 36%)' },
    { name: 'Nul', value: match.p_draw_fair, odds: match.odds_draw, color: 'hsl(45, 85%, 50%)' },
    { name: 'Extérieur', value: match.p_away_fair, odds: match.odds_away, color: 'hsl(215, 85%, 50%)' }
  ];

  const oddsDataBTTS = [
    { name: 'Oui', value: match.p_btts_yes_fair, odds: match.odds_btts_yes, color: 'hsl(120, 85%, 45%)' },
    { name: 'Non', value: match.p_btts_no_fair, odds: match.odds_btts_no, color: 'hsl(0, 85%, 55%)' }
  ];

  const oddsDataOU25 = [
    { name: 'Plus 2.5', value: match.p_over_2_5_fair, odds: match.odds_over_2_5, color: 'hsl(30, 85%, 50%)' },
    { name: 'Moins 2.5', value: match.p_under_2_5_fair, odds: match.odds_under_2_5, color: 'hsl(200, 85%, 50%)' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-weak">Heure Paris:</span>
          <Switch
            checked={showParisTime}
            onCheckedChange={setShowParisTime}
          />
        </div>
      </div>

      {/* Match Info */}
      <div className="bg-surface p-6 rounded-lg border border-surface-strong">
        <div className="flex items-center gap-4 mb-4">
          <FlagMini code={flagInfo.code} confed={flagInfo.confed} />
          <div>
            <h1 className="text-2xl font-bold text-text">
              {match.home_team} vs {match.away_team}
            </h1>
            <p className="text-text-weak">{match.league}</p>
            <p className="text-sm text-text-mute">
              {displayTime} {showParisTime ? '(Paris)' : `(${localTz})`}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-2">
          {match.is_low_vig_1x2 && (
            <span className="px-2 py-1 bg-brand-50 text-brand-600 rounded text-sm">
              Low-vig 1X2
            </span>
          )}
          {match.watch_btts && (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-sm">
              Watch BTTS
            </span>
          )}
          {match.watch_over25 && (
            <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-sm">
              Watch Over25
            </span>
          )}
        </div>
      </div>

      {/* Donuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DonutChart 
          data={oddsData1x2} 
          title="1X2" 
          centerText={`Marge: ${(match.vig_1x2 * 100).toFixed(1)}%`}
        />
        <DonutChart 
          data={oddsDataBTTS} 
          title="BTTS" 
          centerText={`Marge: ${(match.vig_btts * 100).toFixed(1)}%`}
        />
        <DonutChart 
          data={oddsDataOU25} 
          title="Over/Under 2.5" 
          centerText={`Marge: ${(match.vig_ou_2_5 * 100).toFixed(1)}%`}
        />
      </div>

      {/* Raw Data */}
      <div className="bg-surface p-6 rounded-lg border border-surface-strong">
        <h2 className="text-lg font-semibold text-text mb-4">Données détaillées</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-text mb-2">Cotes originales</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-weak">Domicile:</span>
                <span className="text-text">{match.odds_home.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-weak">Nul:</span>
                <span className="text-text">{match.odds_draw.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-weak">Extérieur:</span>
                <span className="text-text">{match.odds_away.toFixed(2)}</span>
              </div>
              {match.odds_btts_yes && (
                <div className="flex justify-between">
                  <span className="text-text-weak">BTTS Oui:</span>
                  <span className="text-text">{match.odds_btts_yes.toFixed(2)}</span>
                </div>
              )}
              {match.odds_over_2_5 && (
                <div className="flex justify-between">
                  <span className="text-text-weak">Plus 2.5:</span>
                  <span className="text-text">{match.odds_over_2_5.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-text mb-2">Probabilités justes</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-weak">Domicile:</span>
                <span className="text-text">{(match.p_home_fair * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-weak">Nul:</span>
                <span className="text-text">{(match.p_draw_fair * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-weak">Extérieur:</span>
                <span className="text-text">{(match.p_away_fair * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-weak">BTTS Oui:</span>
                <span className="text-text">{(match.p_btts_yes_fair * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-weak">Plus 2.5:</span>
                <span className="text-text">{(match.p_over_2_5_fair * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Over/Under Markets */}
      {match.over_under_markets.length > 0 && (
        <div className="bg-surface p-6 rounded-lg border border-surface-strong">
          <h2 className="text-lg font-semibold text-text mb-4">Marchés Over/Under</h2>
          <div className="space-y-2">
            {match.over_under_markets.map((market, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-surface-strong last:border-b-0">
                <span className="text-text-weak">O/U {market.threshold}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-text">Plus: {market.odds_over.toFixed(2)} ({(market.p_over_fair * 100).toFixed(1)}%)</span>
                  <span className="text-text">Moins: {market.odds_under.toFixed(2)} ({(market.p_under_fair * 100).toFixed(1)}%)</span>
                  <span className="text-text-weak">Marge: {(market.vig * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => {
            // TODO: Export match data to CSV
            console.log('Export match:', match);
          }}
        >
          <Download className="h-4 w-4" />
          Exporter ce match
        </Button>
      </div>
    </div>
  );
}