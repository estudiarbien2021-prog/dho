import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, MapPin, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface SearchableItem {
  type: 'country' | 'competition';
  value: string;
  label: string;
  country?: string; // For competitions, to show which country they belong to
}

interface SearchableCountryCompetitionSelectProps {
  countries: string[];
  competitions: string[];
  selectedCountries: string[];
  selectedCompetitions: string[];
  onCountriesChange: (countries: string[]) => void;
  onCompetitionsChange: (competitions: string[]) => void;
  placeholder?: string;
}

export const SearchableCountryCompetitionSelect: React.FC<SearchableCountryCompetitionSelectProps> = ({
  countries,
  competitions,
  selectedCountries,
  selectedCompetitions,
  onCountriesChange,
  onCompetitionsChange,
  placeholder = "Rechercher pays ou compétition..."
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Combine countries and competitions into searchable items
  const searchableItems = useMemo((): SearchableItem[] => {
    const countryItems: SearchableItem[] = countries.map(country => ({
      type: 'country',
      value: country,
      label: country
    }));

    const competitionItems: SearchableItem[] = competitions.map(competition => ({
      type: 'competition',
      value: competition,
      label: competition
    }));

    return [...countryItems, ...competitionItems];
  }, [countries, competitions]);

  // Filter items based on search - works for start and middle of text
  const filteredItems = useMemo(() => {
    if (!searchValue) return searchableItems;
    
    const search = searchValue.toLowerCase();
    return searchableItems.filter(item => 
      item.label.toLowerCase().includes(search)
    );
  }, [searchableItems, searchValue]);

  const handleSelect = (item: SearchableItem) => {
    if (item.type === 'country') {
      const isSelected = selectedCountries.includes(item.value);
      if (isSelected) {
        onCountriesChange(selectedCountries.filter(c => c !== item.value));
      } else {
        onCountriesChange([...selectedCountries, item.value]);
      }
    } else {
      const isSelected = selectedCompetitions.includes(item.value);
      if (isSelected) {
        onCompetitionsChange(selectedCompetitions.filter(c => c !== item.value));
      } else {
        onCompetitionsChange([...selectedCompetitions, item.value]);
      }
    }
  };

  const clearSelection = () => {
    onCountriesChange([]);
    onCompetitionsChange([]);
  };

  const totalSelected = selectedCountries.length + selectedCompetitions.length;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {totalSelected > 0 ? (
                <span>{totalSelected} sélectionné{totalSelected > 1 ? 's' : ''}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Tapez pour rechercher..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
              
              {/* Group countries */}
              {filteredItems.some(item => item.type === 'country') && (
                <CommandGroup heading="Pays">
                  {filteredItems
                    .filter(item => item.type === 'country')
                    .map((item) => (
                      <CommandItem
                        key={`country-${item.value}`}
                        value={item.value}
                        onSelect={() => handleSelect(item)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCountries.includes(item.value) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {/* Group competitions */}
              {filteredItems.some(item => item.type === 'competition') && (
                <CommandGroup heading="Compétitions">
                  {filteredItems
                    .filter(item => item.type === 'competition')
                    .map((item) => (
                      <CommandItem
                        key={`competition-${item.value}`}
                        value={item.value}
                        onSelect={() => handleSelect(item)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCompetitions.includes(item.value) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <Trophy className="mr-2 h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected items as badges */}
      {totalSelected > 0 && (
        <div className="space-y-2">
          {selectedCountries.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Pays sélectionnés:</div>
              <div className="flex flex-wrap gap-1">
                {selectedCountries.map(country => (
                  <Badge
                    key={country}
                    variant="default"
                    className="text-xs cursor-pointer"
                    onClick={() => onCountriesChange(selectedCountries.filter(c => c !== country))}
                  >
                    <MapPin className="mr-1 h-3 w-3" />
                    {country}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {selectedCompetitions.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Compétitions sélectionnées:</div>
              <div className="flex flex-wrap gap-1">
                {selectedCompetitions.map(competition => (
                  <Badge
                    key={competition}
                    variant="secondary"
                    className="text-xs cursor-pointer"
                    onClick={() => onCompetitionsChange(selectedCompetitions.filter(c => c !== competition))}
                  >
                    <Trophy className="mr-1 h-3 w-3" />
                    {competition}
                    <span className="ml-1">×</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="h-6 text-xs"
          >
            Tout effacer
          </Button>
        </div>
      )}
    </div>
  );
};