import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X, ArrowUpDown, Trophy } from 'lucide-react';
import { MatchFilters } from '@/hooks/useMatchesData';

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
              <SelectItem value="6h">Prochaines 6h</SelectItem>
              <SelectItem value="12h">Prochaines 12h</SelectItem>
              <SelectItem value="24h">Prochaines 24h</SelectItem>
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
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'btts_yes', label: 'BTTS Oui' },
              { id: 'btts_no', label: 'BTTS Non' },
              { id: 'over25', label: '+2.5' },
              { id: 'under25', label: '-2.5' }
            ].map(market => (
              <Button
                key={market.id}
                variant={filters.marketFilters && filters.marketFilters.includes(market.id) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const currentMarkets = filters.marketFilters || [];
                  const newMarkets = currentMarkets.includes(market.id)
                    ? currentMarkets.filter(m => m !== market.id)
                    : [...currentMarkets, market.id];
                  updateFilters({ marketFilters: newMarkets });
                }}
                className="text-xs h-8"
              >
                {market.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Top Leagues Quick Filter */}
        <div className="space-y-2 md:col-span-2">
          <Label className="text-sm font-medium">Ligues populaires</Label>
          <div className="flex flex-wrap gap-2">
            {['Copa Libertadores', 'Copa Sudamericana', 'Premier League', 'Serie A', 'La Liga'].filter(league => 
              availableLeagues.includes(league)
            ).map(league => (
              <Button
                key={league}
                variant={filters.leagues.includes(league) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newLeagues = filters.leagues.includes(league)
                    ? filters.leagues.filter(l => l !== league)
                    : [...filters.leagues, league];
                  updateFilters({ leagues: newLeagues });
                }}
                className="text-xs h-8"
              >
                {league}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}