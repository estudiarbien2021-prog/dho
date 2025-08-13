import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Download, 
  Copy, 
  Filter, 
  TrendingUp, 
  Target, 
  BarChart3,
  Zap,
  Trophy,
  Clock,
  MapPin,
  DollarSign
} from 'lucide-react';
import { NewFilterState, NewSortState } from '@/types/filters';
import { FilterAnalyzer } from '@/services/filterAnalyzer';

interface NewFiltersPanelProps {
  filters: NewFilterState;
  sort: NewSortState;
  onFiltersChange: (filters: NewFilterState) => void;
  onSortChange: (sort: NewSortState) => void;
  onRefresh: () => void;
  onExportCSV: () => void;
  onCopyTable: () => void;
  loading: boolean;
}

export const NewFiltersPanel: React.FC<NewFiltersPanelProps> = ({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onRefresh,
  onExportCSV,
  onCopyTable,
  loading
}) => {
  const [availableOptions, setAvailableOptions] = useState<{
    countries: string[];
    competitions: string[];
    availableOddsTypes: string[];
    sampleOddsRanges: any;
  }>({
    countries: [],
    competitions: [],
    availableOddsTypes: [],
    sampleOddsRanges: {}
  });

  // Charger les options disponibles au montage
  useEffect(() => {
    const loadOptions = async () => {
      const options = await FilterAnalyzer.analyzeCSVOptions();
      setAvailableOptions(options);
    };
    loadOptions();
  }, []);

  const updateFilters = (updates: Partial<NewFilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const resetFilters = () => {
    const defaultFilters: NewFilterState = {
      countries: [],
      competitions: [],
      matchStatus: ['complete'],
      odds1X2: {},
      overUnder: {},
      btts: { enabled: false },
      corners: { enabled: false },
      advanced: {
        excludeNAOdds: true,
        onlyValueBets: false,
        valueBetThreshold: 3.0,
        favoriteThreshold: 2.0,
        underdogThreshold: 3.0,
        balancedMatchRange: [1.8, 2.5]
      },
      dateRange: { enabled: false },
      quickFilters: {
        favoritesOnly: false,
        underdogsOnly: false,
        balancedMatches: false,
        highValueBets: false,
        completedMatchesOnly: true
      }
    };
    onFiltersChange(defaultFilters);
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres Avancés
          </CardTitle>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Actions principales */}
        <div className="space-y-2">
          <Button 
            onClick={onRefresh} 
            disabled={loading}
            className="w-full"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Chargement...' : 'Actualiser données'}
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExportCSV} className="flex-1">
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onCopyTable} className="flex-1">
              <Copy className="h-4 w-4 mr-1" />
              Copier
            </Button>
          </div>
        </div>

        <Separator />

        {/* Quick Filters */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 font-semibold">
            <Zap className="h-4 w-4" />
            Filtres Rapides
          </Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="favorites"
                checked={filters.quickFilters.favoritesOnly}
                onCheckedChange={(checked) => 
                  updateFilters({ 
                    quickFilters: { 
                      ...filters.quickFilters, 
                      favoritesOnly: checked as boolean,
                      underdogsOnly: false // Mutuellement exclusif
                    }
                  })
                }
              />
              <Label htmlFor="favorites" className="text-sm">Favoris</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="underdogs"
                checked={filters.quickFilters.underdogsOnly}
                onCheckedChange={(checked) => 
                  updateFilters({ 
                    quickFilters: { 
                      ...filters.quickFilters, 
                      underdogsOnly: checked as boolean,
                      favoritesOnly: false // Mutuellement exclusif
                    }
                  })
                }
              />
              <Label htmlFor="underdogs" className="text-sm">Outsiders</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="balanced"
                checked={filters.quickFilters.balancedMatches}
                onCheckedChange={(checked) => 
                  updateFilters({ 
                    quickFilters: { 
                      ...filters.quickFilters, 
                      balancedMatches: checked as boolean
                    }
                  })
                }
              />
              <Label htmlFor="balanced" className="text-sm">Équilibrés</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="valueBets"
                checked={filters.quickFilters.highValueBets}
                onCheckedChange={(checked) => 
                  updateFilters({ 
                    quickFilters: { 
                      ...filters.quickFilters, 
                      highValueBets: checked as boolean
                    }
                  })
                }
              />
              <Label htmlFor="valueBets" className="text-sm">Value Bets</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Filtres détaillés dans un accordéon */}
        <Accordion type="multiple" className="w-full">
          
          {/* Filtres de base */}
          <AccordionItem value="basic">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Localisation & Compétitions
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              
              {/* Pays */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pays</Label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {availableOptions.countries.map(country => (
                    <Badge
                      key={country}
                      variant={filters.countries.includes(country) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const newCountries = filters.countries.includes(country)
                          ? filters.countries.filter(c => c !== country)
                          : [...filters.countries, country];
                        updateFilters({ countries: newCountries });
                      }}
                    >
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Compétitions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Compétitions</Label>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {availableOptions.competitions.slice(0, 20).map(comp => (
                    <Badge
                      key={comp}
                      variant={filters.competitions.includes(comp) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const newCompetitions = filters.competitions.includes(comp)
                          ? filters.competitions.filter(c => c !== comp)
                          : [...filters.competitions, comp];
                        updateFilters({ competitions: newCompetitions });
                      }}
                    >
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>

            </AccordionContent>
          </AccordionItem>

          {/* Cotes 1X2 */}
          <AccordionItem value="odds1x2">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cotes 1X2
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              
              {/* Cotes Home */}
              <div className="space-y-2">
                <Label className="text-sm">Cotes Victoire Domicile</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Min"
                    value={filters.odds1X2.homeMin || ''}
                    onChange={(e) => updateFilters({
                      odds1X2: { 
                        ...filters.odds1X2, 
                        homeMin: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Max"
                    value={filters.odds1X2.homeMax || ''}
                    onChange={(e) => updateFilters({
                      odds1X2: { 
                        ...filters.odds1X2, 
                        homeMax: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Cotes Draw */}
              <div className="space-y-2">
                <Label className="text-sm">Cotes Match Nul</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Min"
                    value={filters.odds1X2.drawMin || ''}
                    onChange={(e) => updateFilters({
                      odds1X2: { 
                        ...filters.odds1X2, 
                        drawMin: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Max"
                    value={filters.odds1X2.drawMax || ''}
                    onChange={(e) => updateFilters({
                      odds1X2: { 
                        ...filters.odds1X2, 
                        drawMax: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Cotes Away */}
              <div className="space-y-2">
                <Label className="text-sm">Cotes Victoire Extérieur</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Min"
                    value={filters.odds1X2.awayMin || ''}
                    onChange={(e) => updateFilters({
                      odds1X2: { 
                        ...filters.odds1X2, 
                        awayMin: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    className="text-xs"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Max"
                    value={filters.odds1X2.awayMax || ''}
                    onChange={(e) => updateFilters({
                      odds1X2: { 
                        ...filters.odds1X2, 
                        awayMax: e.target.value ? parseFloat(e.target.value) : undefined 
                      }
                    })}
                    className="text-xs"
                  />
                </div>
              </div>

            </AccordionContent>
          </AccordionItem>

          {/* Over/Under & BTTS */}
          <AccordionItem value="markets">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Marchés Spéciaux
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              
              {/* Over/Under 2.5 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Over/Under 2.5 Buts</Label>
                <Select 
                  value={filters.overUnder.goals25 || ''} 
                  onValueChange={(value) => updateFilters({
                    overUnder: { 
                      ...filters.overUnder, 
                      goals25: value as 'over' | 'under' | 'both' | undefined
                    }
                  })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="over">Over 2.5</SelectItem>
                    <SelectItem value="under">Under 2.5</SelectItem>
                    <SelectItem value="both">Les deux</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* BTTS */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="btts-enabled"
                    checked={filters.btts.enabled}
                    onCheckedChange={(checked) => updateFilters({
                      btts: { ...filters.btts, enabled: checked }
                    })}
                  />
                  <Label htmlFor="btts-enabled" className="text-sm font-medium">
                    Both Teams To Score
                  </Label>
                </div>

                {filters.btts.enabled && (
                  <div className="space-y-2 pl-6">
                    <Select 
                      value={filters.btts.preference || ''} 
                      onValueChange={(value) => updateFilters({
                        btts: { 
                          ...filters.btts, 
                          preference: value as 'yes' | 'no' | 'both' | undefined
                        }
                      })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Préférence..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Les deux</SelectItem>
                        <SelectItem value="yes">BTTS Oui</SelectItem>
                        <SelectItem value="no">BTTS Non</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

            </AccordionContent>
          </AccordionItem>

          {/* Paramètres avancés */}
          <AccordionItem value="advanced">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Paramètres Avancés
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              
              {/* Exclure N/A */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="exclude-na"
                  checked={filters.advanced.excludeNAOdds}
                  onCheckedChange={(checked) => updateFilters({
                    advanced: { ...filters.advanced, excludeNAOdds: checked }
                  })}
                />
                <Label htmlFor="exclude-na" className="text-sm">
                  Exclure les cotes N/A
                </Label>
              </div>

              {/* Value Bets */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="value-bets"
                    checked={filters.advanced.onlyValueBets}
                    onCheckedChange={(checked) => updateFilters({
                      advanced: { ...filters.advanced, onlyValueBets: checked }
                    })}
                  />
                  <Label htmlFor="value-bets" className="text-sm">
                    Value Bets uniquement
                  </Label>
                </div>
                
                {filters.advanced.onlyValueBets && (
                  <div className="pl-6 space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Seuil minimum: {filters.advanced.valueBetThreshold}
                    </Label>
                    <Slider
                      value={[filters.advanced.valueBetThreshold]}
                      onValueChange={([value]) => updateFilters({
                        advanced: { ...filters.advanced, valueBetThreshold: value }
                      })}
                      min={2.0}
                      max={10.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

            </AccordionContent>
          </AccordionItem>

        </Accordion>

        <Separator />

        {/* Tri */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 font-semibold">
            <Trophy className="h-4 w-4" />
            Tri
          </Label>
          
          <div className="grid grid-cols-2 gap-2">
            <Select 
              value={sort.field} 
              onValueChange={(value) => onSortChange({ 
                ...sort, 
                field: value as NewSortState['field'] 
              })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Heure</SelectItem>
                <SelectItem value="competition">Compétition</SelectItem>
                <SelectItem value="country">Pays</SelectItem>
                <SelectItem value="homeOdds">Cotes Home</SelectItem>
                <SelectItem value="drawOdds">Cotes Nul</SelectItem>
                <SelectItem value="awayOdds">Cotes Away</SelectItem>
                <SelectItem value="bttsYes">BTTS Oui</SelectItem>
                <SelectItem value="over25">Over 2.5</SelectItem>
                <SelectItem value="value">Value</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={sort.direction} 
              onValueChange={(value) => onSortChange({ 
                ...sort, 
                direction: value as 'asc' | 'desc' 
              })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Croissant</SelectItem>
                <SelectItem value="desc">Décroissant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};