import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X, ArrowUpDown, Trophy } from 'lucide-react';
import { MatchFilters } from '@/hooks/useDatabaseMatches';

interface FilterPanelProps {
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  availableLeagues: string[];
}

export function FilterPanel({ filters, onFiltersChange, availableLeagues }: FilterPanelProps) {
  const updateFilters = (updates: Partial<MatchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      leagues: [],
      timeWindow: 'all',
      groupBy: 'time',
      marketFilters: []
    });
  };

  const hasActiveFilters = filters.search || filters.leagues.length > 0 || 
    filters.timeWindow !== 'all' || (filters.marketFilters && filters.marketFilters.length > 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filtres</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
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

        {/* Time Window */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Période</Label>
          <Select value={filters.timeWindow} onValueChange={(value) => updateFilters({ timeWindow: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les matchs</SelectItem>
              <SelectItem value="1h">Prochaine 1h</SelectItem>
              <SelectItem value="2h">Prochaines 2h</SelectItem>
              <SelectItem value="4h">Prochaines 4h</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Group By */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Regroupement</Label>
          <Select value={filters.groupBy} onValueChange={(value) => updateFilters({ groupBy: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Par heure
                </div>
              </SelectItem>
              <SelectItem value="competition">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Par compétition
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
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

        {/* Leagues Dropdown */}
        <div className="space-y-2 md:col-span-2">
          <Label className="text-sm font-medium">Compétitions</Label>
          <Select 
            value={filters.leagues.length > 0 ? filters.leagues[0] : "all"} 
            onValueChange={(value) => {
              if (value === "all") {
                updateFilters({ leagues: [] });
              } else {
                const newLeagues = filters.leagues.includes(value)
                  ? filters.leagues.filter(l => l !== value)
                  : [...filters.leagues, value];
                updateFilters({ leagues: newLeagues });
              }
            }}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Sélectionner une compétition" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-md z-50 max-h-[300px] overflow-y-auto">
              <SelectItem value="all">Toutes les compétitions</SelectItem>
              {availableLeagues.map(league => (
                <SelectItem key={league} value={league} className="cursor-pointer hover:bg-muted">
                  <div className="flex items-center justify-between w-full">
                    <span>{league}</span>
                    {filters.leagues.includes(league) && (
                      <div className="w-2 h-2 bg-primary rounded-full ml-2" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filters.leagues.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.leagues.map(league => (
                <Button
                  key={league}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const newLeagues = filters.leagues.filter(l => l !== league);
                    updateFilters({ leagues: newLeagues });
                  }}
                  className="text-xs h-6 px-2"
                >
                  {league.length > 20 ? `${league.substring(0, 17)}...` : league}
                  <X className="h-3 w-3 ml-1" />
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}