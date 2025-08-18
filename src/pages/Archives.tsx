import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Archive, TrendingUp } from 'lucide-react';
import { useDatabaseMatches } from '@/hooks/useDatabaseMatches';
import { MatchesTable } from '@/components/dashboard/MatchesTable';
import { MatchDetailModal } from '@/components/dashboard/MatchDetailModal';
import { KPIHeader } from '@/components/dashboard/KPIHeader';
import { TopPicks } from '@/components/dashboard/TopPicks';
import { ProcessedMatch } from '@/types/match';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { leagueToFlag } from '@/lib/leagueCountry';

// Helper function to convert country codes to readable names
const getCountryName = (countryCode?: string): string | null => {
  if (!countryCode) return null;
  
  const countryNames: { [key: string]: string } = {
    'BR': 'Brésil',
    'AR': 'Argentine',
    'UY': 'Uruguay',
    'CL': 'Chili',
    'CO': 'Colombie',
    'PE': 'Pérou',
    'EC': 'Équateur',
    'PY': 'Paraguay',
    'BO': 'Bolivie',
    'VE': 'Venezuela',
    'MX': 'Mexique',
    'US': 'États-Unis',
    'CA': 'Canada',
    'CR': 'Costa Rica',
    'ES': 'Espagne',
    'IT': 'Italie',
    'GB': 'Angleterre',
    'DE': 'Allemagne',
    'FR': 'France',
    'PT': 'Portugal',
    'NL': 'Pays-Bas',
    'BE': 'Belgique',
    'TR': 'Turquie',
    'GR': 'Grèce',
    'CZ': 'République tchèque',
    'NO': 'Norvège',
    'SE': 'Suède',
    'PL': 'Pologne',
    'UA': 'Ukraine',
    'BG': 'Bulgarie',
    'AT': 'Autriche',
    'RO': 'Roumanie',
    'CY': 'Chypre',
    'IL': 'Israël',
    'RS': 'Serbie',
    'AZ': 'Azerbaïdjan',
    'SI': 'Slovénie',
    'AM': 'Arménie',
    'HU': 'Hongrie',
    'LV': 'Lettonie',
    'CH': 'Suisse',
    'DK': 'Danemark',
    'EG': 'Égypte',
    'MA': 'Maroc',
    'DZ': 'Algérie',
    'JP': 'Japon',
    'KR': 'Corée du Sud',
    'SA': 'Arabie saoudite',
    'BT': 'Bhoutan',
    'AU': 'Australie',
    'RU': 'Russie',
    'SK': 'Slovaquie',
    'EE': 'Estonie'
  };
  
  return countryNames[countryCode] || null;
};

interface ArchiveDate {
  date: string;
  count: number;
}

export function Archives() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<ArchiveDate[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { 
    matches, 
    isLoading, 
    error, 
    filters, 
    setFilters, 
    availableLeagues, 
    stats,
    matchRecommendations
  } = useDatabaseMatches(selectedDate);

  // Load available archive dates
  useEffect(() => {
    loadAvailableDates();
  }, []);

  const loadAvailableDates = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // Date actuelle au format YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('matches')
        .select('match_date')
        .lt('match_date', today) // Seulement les dates antérieures à aujourd'hui
        .order('match_date', { ascending: false });

      if (error) throw error;

      // Group by date and count matches
      const dateMap = new Map<string, number>();
      data?.forEach(match => {
        const date = match.match_date;
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      });

      const dates: ArchiveDate[] = Array.from(dateMap.entries()).map(([date, count]) => ({
        date,
        count
      }));

      setAvailableDates(dates);
      
      // Auto-select the most recent date if no date is selected
      if (!selectedDate && dates.length > 0) {
        setSelectedDate(dates[0].date);
      }
    } catch (error) {
      console.error('Error loading available dates:', error);
    }
  };

  const handleMatchClick = (match: ProcessedMatch) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const updateFilters = (updates: Partial<typeof filters>) => {
    setFilters({ ...filters, ...updates });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      leagues: [],
      timeWindow: 'all',
      groupBy: 'time',
      marketFilters: []
    });
  };

  const hasActiveFilters = filters.search || filters.leagues.length > 0 || 
    (filters.marketFilters && filters.marketFilters.length > 0);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-brand to-brand-400 bg-clip-text text-transparent mb-2">
          Archives des Matchs
        </h1>
        <p className="text-text-weak">
          Consultez l'historique complet des matchs par date
        </p>
      </div>

      {/* Date Selection & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date Selection */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-brand" />
            <h3 className="font-semibold">Sélectionner une date</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="archiveDate">Date des matchs</Label>
              <Input
                id="archiveDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // Hier au maximum
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Dates récentes disponibles</Label>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {availableDates.slice(0, 10).map(({ date, count }) => (
                  <Button
                    key={date}
                    variant={selectedDate === date ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDate(date)}
                    className="justify-between"
                  >
                    <span>{format(new Date(date), 'dd/MM/yyyy', { locale: fr })}</span>
                    <Badge variant="secondary" className="ml-2">
                      {count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="lg:col-span-2">
          {selectedDate && !isLoading && (
            <KPIHeader
              stats={stats}
            />
          )}
        </div>
      </div>

      {/* Top 3 Picks */}
      {selectedDate && !isLoading && matches.length > 0 && (
        <TopPicks 
          matches={matches} 
          onMatchClick={handleMatchClick} 
          selectedDate={new Date(selectedDate + 'T00:00:00.000Z')}
        />
      )}

      {/* Filters */}
      {selectedDate && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Filtres</h3>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Reset
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Équipes, ligues..."
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Market Filters */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Marchés</Label>
              <Select 
                value={filters.marketFilters && filters.marketFilters.length > 0 ? filters.marketFilters[0] : "all"} 
                onValueChange={(value) => {
                  if (value === "all") {
                    updateFilters({ marketFilters: [] });
                  } else {
                    updateFilters({ marketFilters: [value] });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un marché" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les marchés</SelectItem>
                  <SelectItem value="btts_yes">Les Deux Équipes Marquent - Oui</SelectItem>
                  <SelectItem value="btts_no">Les Deux Équipes Marquent - Non</SelectItem>
                  <SelectItem value="over25">Plus de 2.5 Buts</SelectItem>
                  <SelectItem value="under25">Moins de 2.5 Buts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pays */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pays</Label>
              <Select 
                value={filters.leagues.length > 0 ? filters.leagues[0] : "all"} 
                onValueChange={(value) => {
                  if (value === "all") {
                    updateFilters({ leagues: [] });
                  } else {
                    updateFilters({ leagues: [value] });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="all">Tous les pays</SelectItem>
                  {availableLeagues.map(league => {
                    const { code: countryCode } = leagueToFlag(league);
                    const countryName = getCountryName(countryCode);
                    const displayText = countryName || league;
                    
                    return (
                      <SelectItem key={league} value={league}>
                        {displayText}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {!selectedDate ? (
        <Card className="p-12 text-center">
          <Archive className="h-16 w-16 mx-auto mb-4 text-text-weak" />
          <h3 className="text-xl font-semibold mb-2">Sélectionnez une date</h3>
          <p className="text-text-weak">
            Choisissez une date dans le calendrier pour voir les matchs archivés
          </p>
        </Card>
      ) : isLoading ? (
        <Card className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-text-weak">Chargement des matchs...</p>
        </Card>
      ) : error ? (
        <Card className="p-12 text-center">
          <p className="text-red-600 mb-4">Erreur: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-brand" />
              Matchs du {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}
            </h2>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {matches.length} match{matches.length > 1 ? 's' : ''}
            </Badge>
          </div>
          
          <MatchesTable 
            matches={matches} 
            onMatchClick={handleMatchClick}
            marketFilters={filters.marketFilters}
            matchRecommendations={matchRecommendations}
          />
        </div>
      )}

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
