import React, { useState, useMemo } from 'react';
import { ProcessedMatch } from '@/types/match';
import { Language } from '@/lib/i18n';
import { MatchRow } from '@/components/MatchRow';
import { MatchFilters } from '@/components/MatchFilters';
import { MatchDetail } from './MatchDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

interface DashboardProps {
  currentLang: Language;
  matches: ProcessedMatch[];
}

interface FilterState {
  search: string;
  league: string;
  category: string;
  maxVig: string;
  showLowVig: boolean;
  showWatchBtts: boolean;
  showWatchOver25: boolean;
}

export function Dashboard({ currentLang, matches }: DashboardProps) {
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    league: 'all',
    category: 'all',
    maxVig: 'all',
    showLowVig: false,
    showWatchBtts: false,
    showWatchOver25: false,
  });

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let filtered = matches.filter(match => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!match.home_team.toLowerCase().includes(search) &&
            !match.away_team.toLowerCase().includes(search) &&
            !match.league.toLowerCase().includes(search)) {
          return false;
        }
      }

      // League filter
      if (filters.league !== 'all' && match.league !== filters.league) {
        return false;
      }

      // Category filter
      if (filters.category !== 'all' && match.category !== filters.category) {
        return false;
      }

      // Max vigorish filter
      if (filters.maxVig !== 'all') {
        const maxVig = parseFloat(filters.maxVig);
        if (match.vig_1x2 > maxVig) {
          return false;
        }
      }

      // Flag filters
      if (filters.showLowVig && !match.is_low_vig_1x2) {
        return false;
      }
      if (filters.showWatchBtts && !match.watch_btts) {
        return false;
      }
      if (filters.showWatchOver25 && !match.watch_over25) {
        return false;
      }

      return true;
    });

    // Sort by kickoff time
    return filtered.sort((a, b) => a.kickoff_local.getTime() - b.kickoff_local.getTime());
  }, [matches, filters]);

  // Calculate KPIs for filtered matches
  const kpis = useMemo(() => {
    const totalMatches = filteredMatches.length;
    const lowVigMatches = filteredMatches.filter(m => m.is_low_vig_1x2).length;
    const watchBTTS = filteredMatches.filter(m => m.watch_btts).length;
    const watchOver25 = filteredMatches.filter(m => m.watch_over25).length;
    
    return { totalMatches, lowVigMatches, watchBTTS, watchOver25 };
  }, [filteredMatches]);

  // Show match detail if selected
  if (selectedMatch) {
    return (
      <MatchDetail 
        match={selectedMatch} 
        onBack={() => setSelectedMatch(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Matchs</h1>
          <p className="text-text-mute">
            {kpis.totalMatches} match{kpis.totalMatches !== 1 ? 's' : ''} 
            {matches.length !== filteredMatches.length && ` sur ${matches.length} au total`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-weak">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{kpis.totalMatches}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-weak">Low-vig</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand">{kpis.lowVigMatches}</div>
            <p className="text-xs text-text-mute">
              {kpis.totalMatches > 0 ? ((kpis.lowVigMatches / kpis.totalMatches) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-weak">BTTS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.watchBTTS}</div>
            <p className="text-xs text-text-mute">
              {kpis.totalMatches > 0 ? ((kpis.watchBTTS / kpis.totalMatches) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-weak">Over25</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.watchOver25}</div>
            <p className="text-xs text-text-mute">
              {kpis.totalMatches > 0 ? ((kpis.watchOver25 / kpis.totalMatches) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <MatchFilters 
        filters={filters} 
        onFiltersChange={setFilters} 
        matches={matches}
      />

      {/* Match List */}
      {filteredMatches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-mute">
            {matches.length === 0 
              ? "Aucune donnée de match disponible. Importez un fichier CSV pour commencer."
              : "Aucun match ne correspond aux filtres sélectionnés."
            }
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Liste des matchs</span>
              <span className="text-sm text-text-mute font-normal">
                Triés par heure de début
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-surface-strong">
              {filteredMatches.map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  onClick={() => setSelectedMatch(match)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}