import React, { useState } from 'react';
import { useDatabaseMatches } from '@/hooks/useDatabaseMatches';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { MatchesTable } from '@/components/dashboard/MatchesTable';
import { MatchDetailModal } from '@/components/dashboard/MatchDetailModal';
import { KPIHeader } from '@/components/dashboard/KPIHeader';
import { ProcessedMatch } from '@/types/match';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, LogOut, Settings, Archive, Calendar, RefreshCw } from 'lucide-react';
import { Language } from '@/lib/i18n';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardProps {
  currentLang: Language;
  matches: ProcessedMatch[];
}

export function Dashboard({ currentLang }: DashboardProps) {
  const { signOut } = useAuth();
  const { matches, isLoading, error, filters, setFilters, availableLeagues, stats } = useDatabaseMatches();
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMatchClick = (match: ProcessedMatch) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const exportToCSV = () => {
    if (matches.length === 0) return;

    const csvHeaders = [
      'League', 'Home Team', 'Away Team', 'Country', 'Kickoff UTC', 'Category',
      'P Home Fair', 'P Draw Fair', 'P Away Fair', 'P BTTS Yes Fair', 'P BTTS No Fair',
      'P Over 2.5 Fair', 'P Under 2.5 Fair', 'Vig 1X2', 'Vig BTTS', 'Vig OU 2.5',
      'Is Low Vig 1X2', 'Watch BTTS', 'Watch Over25', 'Odds Home', 'Odds Draw', 'Odds Away',
      'Odds BTTS Yes', 'Odds BTTS No', 'Odds Over 2.5', 'Odds Under 2.5'
    ];

    const csvRows = matches.map(match => [
      match.league,
      match.home_team,
      match.away_team,
      match.country || '',
      match.kickoff_utc.toISOString(),
      match.category,
      match.p_home_fair,
      match.p_draw_fair,
      match.p_away_fair,
      match.p_btts_yes_fair,
      match.p_btts_no_fair,
      match.p_over_2_5_fair,
      match.p_under_2_5_fair,
      match.vig_1x2,
      match.vig_btts,
      match.vig_ou_2_5,
      match.is_low_vig_1x2,
      match.watch_btts,
      match.watch_over25,
      match.odds_home,
      match.odds_draw,
      match.odds_away,
      match.odds_btts_yes || '',
      match.odds_btts_no || '',
      match.odds_over_2_5 || '',
      match.odds_under_2_5 || ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `matches-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="p-12 text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-brand" />
          <p className="text-text-weak text-lg">Chargement des matchs depuis la base de données...</p>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <p className="text-red-600 mb-4 text-lg">Erreur: {error}</p>
          <p className="text-text-weak mb-6">
            Impossible de charger les matchs. Vérifiez qu'un CSV a été traité aujourd'hui.
          </p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/admin'} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Aller à l'administration
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-soft border-b border-surface-strong">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent">
                ⚽ Analytics Dashboard
              </h1>
              <div className="hidden lg:flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/dashboard'}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Aujourd'hui
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/archives'}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archives
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/admin'}>
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={matches.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="flex-1 sm:flex-none">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
          
          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center space-x-2 mt-4 overflow-x-auto">
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/dashboard'}>
              <Calendar className="h-4 w-4 mr-2" />
              Aujourd'hui
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/archives'}>
              <Archive className="h-4 w-4 mr-2" />
              Archives
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/admin'}>
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* KPIs */}
        <KPIHeader stats={stats} />

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          availableLeagues={availableLeagues}
        />

        {/* Matches Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              📊 Matchs d'aujourd'hui
              <span className="text-sm text-text-weak">
                ({format(new Date(), 'dd MMMM yyyy', { locale: fr })})
              </span>
            </h2>
          </div>
          <MatchesTable 
            matches={matches} 
            onMatchClick={handleMatchClick}
            marketFilters={filters.marketFilters}
            groupBy={filters.groupBy}
          />
        </div>
      </div>

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={selectedMatch}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMatch(null);
        }}
        marketFilters={filters.marketFilters}
      />
    </div>
  );
}