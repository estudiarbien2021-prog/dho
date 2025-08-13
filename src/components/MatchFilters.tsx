import React from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { ProcessedMatch } from '@/types/match';
import { Search } from 'lucide-react';

interface FilterState {
  search: string;
  league: string;
  category: string;
  maxVig: string;
  showLowVig: boolean;
  showWatchBtts: boolean;
  showWatchOver25: boolean;
}

interface MatchFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  matches: ProcessedMatch[];
}

export function MatchFilters({ filters, onFiltersChange, matches }: MatchFiltersProps) {
  const leagues = Array.from(new Set(matches.map(m => m.league))).sort();
  const categories = Array.from(new Set(matches.map(m => m.category))).sort();

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-surface-soft p-4 rounded-lg border border-surface-strong">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-mute" />
          <Input
            placeholder="Rechercher équipes, ligues..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-9"
          />
        </div>

        {/* League */}
        <Select value={filters.league} onValueChange={(value) => updateFilter('league', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes les ligues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les ligues</SelectItem>
            {leagues.map(league => (
              <SelectItem key={league} value={league}>{league}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category */}
        <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'first_div' ? '1ère division' :
                 cat === 'second_div' ? '2ème division' :
                 cat === 'continental_cup' ? 'Coupe continentale' :
                 cat === 'national_cup' ? 'Coupe nationale' : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Max Vigorish */}
        <Select value={filters.maxVig} onValueChange={(value) => updateFilter('maxVig', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Marge max" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes marges</SelectItem>
            <SelectItem value="0.05">≤ 5%</SelectItem>
            <SelectItem value="0.10">≤ 10%</SelectItem>
            <SelectItem value="0.15">≤ 15%</SelectItem>
            <SelectItem value="0.20">≤ 20%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Flag Checkboxes */}
      <div className="flex gap-6 mt-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="lowvig"
            checked={filters.showLowVig}
            onCheckedChange={(checked) => updateFilter('showLowVig', !!checked)}
          />
          <label htmlFor="lowvig" className="text-sm text-text-weak">
            Low-vig uniquement
          </label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="watchbtts"
            checked={filters.showWatchBtts}
            onCheckedChange={(checked) => updateFilter('showWatchBtts', !!checked)}
          />
          <label htmlFor="watchbtts" className="text-sm text-text-weak">
            Watch BTTS uniquement
          </label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="watchover25"
            checked={filters.showWatchOver25}
            onCheckedChange={(checked) => updateFilter('showWatchOver25', !!checked)}
          />
          <label htmlFor="watchover25" className="text-sm text-text-weak">
            Watch Over25 uniquement
          </label>
        </div>
      </div>
    </div>
  );
}