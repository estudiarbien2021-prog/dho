import React from 'react';
import { Language, useTranslation } from '@/lib/i18n';
import { ProcessedMatch } from '@/types/match';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { VigorishChart } from '@/components/charts/VigorishChart';

interface DashboardProps {
  currentLang: Language;
  matches: ProcessedMatch[];
}

export function Dashboard({ currentLang, matches }: DashboardProps) {
  const t = useTranslation(currentLang);

  // Calculate KPIs
  const kpis = React.useMemo(() => {
    const total = matches.length;
    const lowVig = matches.filter(m => m.is_low_vig_1x2).length;
    const watchBtts = matches.filter(m => m.watch_btts).length;
    const watchOver25 = matches.filter(m => m.watch_over25).length;

    return { total, lowVig, watchBtts, watchOver25 };
  }, [matches]);

  // Top leagues
  const topLeagues = React.useMemo(() => {
    const leagueCounts = matches.reduce((acc, match) => {
      acc[match.league] = (acc[match.league] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(leagueCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }, [matches]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{t.dashboard}</h1>
        {matches.length > 0 && (
          <div className="text-sm text-text-mute">
            Dernière mise à jour: {new Date().toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US')}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-sm font-medium text-text-weak mb-2">{t.totalMatches}</h3>
          <p className="text-2xl font-bold text-text">{kpis.total.toLocaleString()}</p>
        </div>
        
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-sm font-medium text-text-weak mb-2">{t.lowVigMatches}</h3>
          <p className="text-2xl font-bold text-brand">{kpis.lowVig.toLocaleString()}</p>
          {kpis.total > 0 && (
            <p className="text-xs text-text-mute mt-1">
              {((kpis.lowVig / kpis.total) * 100).toFixed(1)}%
            </p>
          )}
        </div>
        
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-sm font-medium text-text-weak mb-2">{t.watchBtts}</h3>
          <p className="text-2xl font-bold text-brand">{kpis.watchBtts.toLocaleString()}</p>
          {kpis.total > 0 && (
            <p className="text-xs text-text-mute mt-1">
              {((kpis.watchBtts / kpis.total) * 100).toFixed(1)}%
            </p>
          )}
        </div>
        
        <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
          <h3 className="text-sm font-medium text-text-weak mb-2">{t.watchOver25}</h3>
          <p className="text-2xl font-bold text-brand">{kpis.watchOver25.toLocaleString()}</p>
          {kpis.total > 0 && (
            <p className="text-xs text-text-mute mt-1">
              {((kpis.watchOver25 / kpis.total) * 100).toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-surface-soft rounded-xl p-12 text-center border border-surface-strong">
          <div className="w-16 h-16 mx-auto mb-4 bg-brand-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-text mb-2">Aucune donnée disponible</h3>
          <p className="text-text-mute mb-4">Importez votre premier fichier CSV pour voir les analyses</p>
        </div>
      ) : (
        /* Charts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
            <h3 className="text-lg font-semibold text-text mb-4">{t.matchesByCategory}</h3>
            <div className="h-64">
              <CategoryChart matches={matches} currentLang={currentLang} />
            </div>
          </div>

          <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
            <h3 className="text-lg font-semibold text-text mb-4">{t.vigorishDistribution}</h3>
            <div className="h-64">
              <VigorishChart matches={matches} />
            </div>
          </div>

          <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
            <h3 className="text-lg font-semibold text-text mb-4">{t.topLeagues}</h3>
            <div className="h-64 overflow-y-auto">
              <div className="space-y-3">
                {topLeagues.map(([league, count], index) => (
                  <div key={league} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700">
                        {index + 1}
                      </div>
                      <span className="text-sm text-text truncate">{league}</span>
                    </div>
                    <span className="text-sm font-medium text-text">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-surface-soft rounded-xl p-6 border border-surface-strong">
            <h3 className="text-lg font-semibold text-text mb-4">Statistiques rapides</h3>
            <div className="h-64 flex flex-col justify-center space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-surface-strong">
                <span className="text-text-weak">Moyenne vig 1X2</span>
                <span className="font-medium text-text">
                  {matches.length > 0 
                    ? `${((matches.reduce((sum, m) => sum + m.vig_1x2, 0) / matches.length) * 100).toFixed(1)}%`
                    : '-'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-strong">
                <span className="text-text-weak">Matches avec BTTS</span>
                <span className="font-medium text-text">
                  {matches.filter(m => m.odds_btts_yes).length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-strong">
                <span className="text-text-weak">Matches avec O/U</span>
                <span className="font-medium text-text">
                  {matches.filter(m => m.odds_over_2_5).length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-text-weak">Compétitions uniques</span>
                <span className="font-medium text-text">
                  {new Set(matches.map(m => m.league)).size}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}