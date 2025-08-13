import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { MatchFilters } from '@/hooks/useMatchesData';

interface FilterPanelProps {
  filters: MatchFilters;
  onFiltersChange: (filters: MatchFilters) => void;
  availableLeagues: string[];
  availableCategories: string[];
}

export function FilterPanel({ filters, onFiltersChange, availableLeagues, availableCategories }: FilterPanelProps) {
  const updateFilters = (updates: Partial<MatchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      leagues: [],
      categories: [],
      flags: [],
      vigRange: [0, 0.15],
      timeWindow: 'all'
    });
  };

  const hasActiveFilters = filters.search || filters.leagues.length > 0 || 
    filters.categories.length > 0 || filters.flags.length > 0 || filters.timeWindow !== 'all';

  return (
    <Card className="p-6 h-fit">
      <div className="flex items-center justify-between mb-6">
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

      <div className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Recherche</Label>
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
          <Label>Période</Label>
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

        {/* Categories */}
        <div className="space-y-3">
          <Label>Catégories</Label>
          <div className="space-y-2">
            {availableCategories.map(category => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${category}`}
                  checked={filters.categories.includes(category)}
                  onCheckedChange={(checked) => {
                    const newCategories = checked
                      ? [...filters.categories, category]
                      : filters.categories.filter(c => c !== category);
                    updateFilters({ categories: newCategories });
                  }}
                />
                <Label htmlFor={`cat-${category}`} className="text-sm capitalize">
                  {category.replace('_', ' ')}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Flags */}
        <div className="space-y-3">
          <Label>Signaux</Label>
          <div className="space-y-2">
            {[
              { id: 'low_vig', label: 'Low Vig (≤12%)' },
              { id: 'watch_btts', label: 'Watch BTTS' },
              { id: 'watch_over25', label: 'Watch Over 2.5' }
            ].map(flag => (
              <div key={flag.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`flag-${flag.id}`}
                  checked={filters.flags.includes(flag.id)}
                  onCheckedChange={(checked) => {
                    const newFlags = checked
                      ? [...filters.flags, flag.id]
                      : filters.flags.filter(f => f !== flag.id);
                    updateFilters({ flags: newFlags });
                  }}
                />
                <Label htmlFor={`flag-${flag.id}`} className="text-sm">
                  {flag.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Vig Range */}
        <div className="space-y-3">
          <Label>Marge (Vig) 1X2</Label>
          <div className="px-2">
            <Slider
              value={filters.vigRange}
              onValueChange={(value) => updateFilters({ vigRange: value as [number, number] })}
              max={0.2}
              min={0}
              step={0.01}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{(filters.vigRange[0] * 100).toFixed(0)}%</span>
              <span>{(filters.vigRange[1] * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Top Leagues Quick Filter */}
        <div className="space-y-3">
          <Label>Ligues populaires</Label>
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
                className="text-xs"
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