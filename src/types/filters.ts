// Types pour le nouveau système de filtres basé sur les données CSV réelles

export interface NewFilterState {
  // Filtres de base
  countries: string[];
  competitions: string[];
  matchStatus: ('complete' | 'incomplete' | 'canceled')[];
  
  // Filtres par cotes
  odds1X2: {
    homeMin?: number;
    homeMax?: number;
    drawMin?: number;  
    drawMax?: number;
    awayMin?: number;
    awayMax?: number;
  };
  
  // Over/Under Goals
  overUnder: {
    goals15?: 'over' | 'under' | 'both';
    goals25?: 'over' | 'under' | 'both';
    goals35?: 'over' | 'under' | 'both';
    goals45?: 'over' | 'under' | 'both';
  };
  
  // BTTS (Both Teams To Score)
  btts: {
    enabled: boolean;
    preference?: 'yes' | 'no' | 'both';
    minOdds?: number;
    maxOdds?: number;
  };
  
  // Corners
  corners: {
    enabled: boolean;
    line?: '7.5' | '8.5' | '9.5' | '10.5' | '11.5';
    preference?: 'over' | 'under' | 'both';
  };
  
  // Filtres avancés
  advanced: {
    excludeNAOdds: boolean;
    onlyValueBets: boolean;
    valueBetThreshold: number;
    favoriteThreshold: number; // Cotes < X pour identifier les favoris
    underdogThreshold: number; // Cotes > X pour identifier les outsiders
    balancedMatchRange: [number, number]; // Range pour matchs équilibrés [min, max]
  };
  
  // Filtres temporels
  timeFilters: {
    enabled: boolean;
    showUpcoming?: '2h' | '4h' | '6h' | 'all';
  };
  
  // Quick filters presets
  quickFilters: {
    favoritesOnly: boolean;
    underdogsOnly: boolean;
    balancedMatches: boolean;
    highValueBets: boolean;
    completedMatchesOnly: boolean;
  };  
}

export interface NewSortState {
  field: 'time' | 'competition' | 'country' | 'homeOdds' | 'drawOdds' | 'awayOdds' | 'bttsYes' | 'over25' | 'value';
  direction: 'asc' | 'desc';
}

// Available options extracted from CSV
export interface FilterOptions {
  countries: string[];
  competitions: string[];
  availableOddsTypes: string[];
}