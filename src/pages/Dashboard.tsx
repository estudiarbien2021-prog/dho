import React, { useState } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Language } from '@/lib/i18n';
import { useMatchesData } from '@/hooks/useMatchesData';
import { KPIHeader } from '@/components/dashboard/KPIHeader';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { MatchesTable } from '@/components/dashboard/MatchesTable';

import { MatchDetailModal } from '@/components/dashboard/MatchDetailModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, RefreshCw, AlertCircle, LogOut, Brain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DashboardProps {
  currentLang: Language;
  matches: ProcessedMatch[];
}

export function Dashboard({ currentLang, matches: _matches }: DashboardProps) {
  const { user, signOut } = useAuth();
  const { 
    matches, 
    isLoading, 
    error, 
    filters, 
    setFilters, 
    availableLeagues, 
    stats 
  } = useMatchesData();

  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMatchClick = (match: ProcessedMatch) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const exportToCSV = () => {
    if (matches.length === 0) return;

    const headers = [
      'League', 'Home_Team', 'Away_Team', 'Kickoff_UTC', 'Category',
      'Vig_1X2', 'P_Home_Fair', 'P_Draw_Fair', 'P_Away_Fair',
      'Odds_Home', 'Odds_Draw', 'Odds_Away',
      'Is_Low_Vig', 'Watch_BTTS', 'Watch_Over25'
    ];

    const csvData = [
      headers.join(','),
      ...matches.map(match => [
        `"${match.league}"`,
        `"${match.home_team}"`,
        `"${match.away_team}"`,  
        match.kickoff_utc.toISOString(),
        match.category,
        match.vig_1x2.toFixed(4),
        match.p_home_fair.toFixed(4),
        match.p_draw_fair.toFixed(4),
        match.p_away_fair.toFixed(4),
        match.odds_home.toFixed(2),
        match.odds_draw.toFixed(2),
        match.odds_away.toFixed(2),
        match.is_low_vig_1x2,
        match.watch_btts,
        match.watch_over25
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matches-filtered-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="text-lg">Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center border-destructive/50">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-gradient-to-r from-brand/20 to-brand-400/20 border border-brand/30">
            <Brain className="h-6 w-6 text-brand" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Dashboard Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Analyse des paris sportifs avec données en temps réel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="text-right mr-4">
              <p className="text-sm text-muted-foreground">Connecté en tant que</p>
              <p className="font-medium">{user.email}</p>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={matches.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV ({matches.length})
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={signOut}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <KPIHeader stats={stats} />

      {/* Main Content */}
      <div className="space-y-6">
        {/* Filters Panel */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          availableLeagues={availableLeagues}
        />

        {/* Matches Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Matchs ({matches.length})
            </h2>
          </div>
          <MatchesTable 
            matches={matches} 
            onMatchClick={handleMatchClick}
            marketFilters={filters.marketFilters}
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