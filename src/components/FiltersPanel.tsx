import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Filter, Settings, Clock, Globe, RefreshCw, Download, Copy, Save, Trash2 } from 'lucide-react';

export interface FilterState {
  competitions: string[];
  countries: string[];
  timeWindow: 'all' | '6h' | '12h';
  bookmakers: string[];
  markets: string[];
  oddsMin: number;
  oddsMax: number;
  enableHypePlus: boolean;
  customWhitelist: string;
}

export interface SortState {
  field: 'time' | 'league' | 'odds' | 'probability' | 'threshold';
  direction: 'asc' | 'desc';
  thresholdPercent: number;
}

interface FiltersPanelProps {
  filters: FilterState;
  sort: SortState;
  showSaoPauloTime: boolean;
  showParisTime: boolean;
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortState) => void;
  onTimeDisplayChange: (sao: boolean, paris: boolean) => void;
  onRefresh: () => void;
  onExportCSV: () => void;
  onCopyTable: () => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (name: string) => void;
  onDeletePreset: (name: string) => void;
  presets: string[];
  loading?: boolean;
}

const DEFAULT_COMPETITIONS = [
  'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1',
  'Champions League', 'Europa League', 'Conference League',
  'Brasileirão Série A', 'Copa Libertadores', 'Copa Sudamericana'
];

const DEFAULT_BOOKMAKERS = [
  'Bet365', 'Unibet', 'Betfair', 'Betclic', 'PMU', 'Winamax'
];

const MARKETS = [
  { value: '1x2', label: '1X2' },
  { value: 'btts', label: 'BTTS' },
  { value: 'ou', label: 'Over/Under' },
  { value: 'ah', label: 'Asian Handicap' }
];

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  filters,
  sort,
  showSaoPauloTime,
  showParisTime,
  onFiltersChange,
  onSortChange,
  onTimeDisplayChange,
  onRefresh,
  onExportCSV,
  onCopyTable,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  presets,
  loading = false
}) => {
  const [presetName, setPresetName] = React.useState('');

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const updateSort = (updates: Partial<SortState>) => {
    onSortChange({ ...sort, ...updates });
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Header avec actions principales */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Filtres & Configuration</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={onRefresh}
            disabled={loading}
            className="bg-gradient-primary"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Charger
          </Button>
          
          <Button variant="outline" onClick={onExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          
          <Button variant="outline" onClick={onCopyTable}>
            <Copy className="h-4 w-4 mr-2" />
            Copier
          </Button>
        </div>
      </div>

      {/* Affichage des heures */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Affichage des heures
        </Label>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={showSaoPauloTime}
              onCheckedChange={(checked) => onTimeDisplayChange(checked, showParisTime)}
            />
            <Label className="text-sm">São Paulo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={showParisTime}
              onCheckedChange={(checked) => onTimeDisplayChange(showSaoPauloTime, checked)}
            />
            <Label className="text-sm">Paris</Label>
          </div>
        </div>
      </div>

      {/* Compétitions */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Compétitions</Label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_COMPETITIONS.map((comp) => (
            <Badge
              key={comp}
              variant={filters.competitions.includes(comp) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                const newComps = filters.competitions.includes(comp)
                  ? filters.competitions.filter(c => c !== comp)
                  : [...filters.competitions, comp];
                updateFilters({ competitions: newComps });
              }}
            >
              {comp}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            checked={filters.enableHypePlus}
            onCheckedChange={(checked) => updateFilters({ enableHypePlus: checked })}
          />
          <Label className="text-sm">Mode Hype+ (Eredivisie, MLS, derbies...)</Label>
        </div>
      </div>

      {/* Whitelist personnalisée */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Whitelist personnalisée</Label>
        <Textarea
          placeholder="Une compétition par ligne..."
          value={filters.customWhitelist}
          onChange={(e) => updateFilters({ customWhitelist: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      {/* Fenêtre horaire */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Fenêtre horaire</Label>
        <Select value={filters.timeWindow} onValueChange={(value: any) => updateFilters({ timeWindow: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les matchs</SelectItem>
            <SelectItem value="6h">Prochaines 6h</SelectItem>
            <SelectItem value="12h">Prochaines 12h</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Marchés */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Marchés</Label>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((market) => (
            <Badge
              key={market.value}
              variant={filters.markets.includes(market.value) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                const newMarkets = filters.markets.includes(market.value)
                  ? filters.markets.filter(m => m !== market.value)
                  : [...filters.markets, market.value];
                updateFilters({ markets: newMarkets });
              }}
            >
              {market.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Plage de cotes */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Plage de cotes: {filters.oddsMin.toFixed(2)} - {filters.oddsMax.toFixed(2)}
        </Label>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Minimum</Label>
            <Slider
              value={[filters.oddsMin]}
              onValueChange={([value]) => updateFilters({ oddsMin: value })}
              min={1.01}
              max={10.0}
              step={0.01}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Maximum</Label>
            <Slider
              value={[filters.oddsMax]}
              onValueChange={([value]) => updateFilters({ oddsMax: value })}
              min={1.01}
              max={50.0}
              step={0.01}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      {/* Tri */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Tri
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Critère</Label>
            <Select value={sort.field} onValueChange={(value: any) => updateSort({ field: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Heure</SelectItem>
                <SelectItem value="league">Ligue</SelectItem>
                <SelectItem value="odds">Cote</SelectItem>
                <SelectItem value="probability">Probabilité</SelectItem>
                <SelectItem value="threshold">Écart vs seuil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Direction</Label>
            <Select value={sort.direction} onValueChange={(value: any) => updateSort({ direction: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Croissant</SelectItem>
                <SelectItem value="desc">Décroissant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {sort.field === 'threshold' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Seuil de référence: {sort.thresholdPercent}%
            </Label>
            <Slider
              value={[sort.thresholdPercent]}
              onValueChange={([value]) => updateSort({ thresholdPercent: value })}
              min={0}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>
        )}
      </div>

      {/* Presets */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Presets</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Nom du preset..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => {
              if (presetName.trim()) {
                onSavePreset(presetName.trim());
                setPresetName('');
              }
            }}
            disabled={!presetName.trim()}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <div key={preset} className="flex items-center gap-1">
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => onLoadPreset(preset)}
              >
                {preset}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeletePreset(preset)}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};