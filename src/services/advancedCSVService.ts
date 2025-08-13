import { MatchOdds } from "@/components/OddsTable";
import { NewFilterState } from "@/types/filters";

export class AdvancedCSVService {
  /**
   * Appliquer tous les nouveaux filtres avancés
   */
  static filterMatchesAdvanced(matches: MatchOdds[], filters: NewFilterState): MatchOdds[] {
    console.log('🔍 Début du filtrage avancé avec:', filters);
    console.log('📊 Matches à filtrer:', matches.length);
    
    let filtered = [...matches];

    // 1. Filtres de base
    filtered = this.applyBasicFilters(filtered, filters);
    
    // 2. Filtres par cotes 1X2
    filtered = this.applyOdds1X2Filters(filtered, filters);
    
    // 3. Filtres Over/Under
    filtered = this.applyOverUnderFilters(filtered, filters);
    
    // 4. Filtres BTTS
    filtered = this.applyBTTSFilters(filtered, filters);
    
    // 5. Filtres Corners
    filtered = this.applyCornersFilters(filtered, filters);
    
    // 6. Filtres avancés
    filtered = this.applyAdvancedFilters(filtered, filters);
    
    // 7. Quick filters
    filtered = this.applyQuickFilters(filtered, filters);
    
    console.log('✅ Résultat final du filtrage avancé:', filtered.length, 'matches');
    return filtered;
  }

  /**
   * Filtres de base: pays, compétitions, statut
   */
  private static applyBasicFilters(matches: MatchOdds[], filters: NewFilterState): MatchOdds[] {
    let filtered = matches;
    
    // Filtre par pays
    if (filters.countries.length > 0) {
      const before = filtered.length;
      filtered = filtered.filter(match =>
        match.tournament.country && 
        filters.countries.some(country =>
          match.tournament.country!.toLowerCase().includes(country.toLowerCase())
        )
      );
      console.log(`🌍 Filtre pays: ${before} → ${filtered.length}`);
    }
    
    // Filtre par compétitions
    if (filters.competitions.length > 0) {
      const before = filtered.length;
      filtered = filtered.filter(match => 
        filters.competitions.some(comp => 
          match.tournament.name.toLowerCase().includes(comp.toLowerCase())
        )
      );
      console.log(`🏆 Filtre compétitions: ${before} → ${filtered.length}`);
    }
    
    return filtered;
  }

  /**
   * Filtres par cotes 1X2
   */
  private static applyOdds1X2Filters(matches: MatchOdds[], filters: NewFilterState): MatchOdds[] {
    const { odds1X2 } = filters;
    if (!this.hasOdds1X2Filters(odds1X2)) return matches;
    
    const before = matches.length;
    const filtered = matches.filter(match => {
      const bookmaker = match.bookmakers[0];
      if (!bookmaker?.oneX2) return false;
      
      const { home, draw, away } = bookmaker.oneX2;
      
      // Vérifier les cotes home
      if (odds1X2.homeMin && home && home < odds1X2.homeMin) return false;
      if (odds1X2.homeMax && home && home > odds1X2.homeMax) return false;
      
      // Vérifier les cotes draw
      if (odds1X2.drawMin && draw && draw < odds1X2.drawMin) return false;
      if (odds1X2.drawMax && draw && draw > odds1X2.drawMax) return false;
      
      // Vérifier les cotes away
      if (odds1X2.awayMin && away && away < odds1X2.awayMin) return false;
      if (odds1X2.awayMax && away && away > odds1X2.awayMax) return false;
      
      return true;
    });
    
    console.log(`💰 Filtre cotes 1X2: ${before} → ${filtered.length}`);
    return filtered;
  }

  /**
   * Filtres Over/Under buts
   */
  private static applyOverUnderFilters(matches: MatchOdds[], filters: NewFilterState): MatchOdds[] {
    const { overUnder } = filters;
    if (!this.hasOverUnderFilters(overUnder)) return matches;
    
    const before = matches.length;
    const filtered = matches.filter(match => {
      const bookmaker = match.bookmakers[0];
      if (!bookmaker?.ou) return false;
      
      // Vérifier O/U 2.5 (le plus commun)
      if (overUnder.goals25) {
        const line25 = bookmaker.ou['2.5'];
        if (!line25) return false;
        
        if (overUnder.goals25 === 'over' && !line25.over) return false;
        if (overUnder.goals25 === 'under' && !line25.under) return false;
      }
      
      return true;
    });
    
    console.log(`⚽ Filtre O/U: ${before} → ${filtered.length}`);
    return filtered;
  }

  /**
   * Filtres BTTS
   */
  private static applyBTTSFilters(matches: MatchOdds[], filters: NewFilterState): MatchOdds[] {
    const { btts } = filters;
    if (!btts.enabled) return matches;
    
    const before = matches.length;
    const filtered = matches.filter(match => {
      const bookmaker = match.bookmakers[0];
      if (!bookmaker?.btts) return false;
      
      const { yes, no } = bookmaker.btts;
      
      // Préférence BTTS
      if (btts.preference === 'yes' && !yes) return false;
      if (btts.preference === 'no' && !no) return false;
      
      // Range de cotes BTTS
      if (btts.minOdds || btts.maxOdds) {
        const relevantOdds = btts.preference === 'no' ? no : yes;
        if (!relevantOdds) return false;
        
        if (btts.minOdds && relevantOdds < btts.minOdds) return false;
        if (btts.maxOdds && relevantOdds > btts.maxOdds) return false;
      }
      
      return true;
    });
    
    console.log(`🥅 Filtre BTTS: ${before} → ${filtered.length}`);
    return filtered;  
  }

  /**
   * Filtres Corners (si disponible)
   */
  private static applyCornersFilters(matches: MatchOdds[], filters: NewFilterState): MatchOdds[] {
    const { corners } = filters;
    if (!corners.enabled) return matches;
    
    // Pour l'instant, retourner tous les matchs car les cotes corners ne sont pas toujours disponibles
    console.log('🚩 Filtre corners: pas encore implémenté pour ce dataset');
    return matches;
  }

  /**
   * Filtres avancés
   */
  private static applyAdvancedFilters(matches: MatchOdds[], filters: NewFilterState): MatchOdds[] {
    const { advanced } = filters;
    let filtered = matches;
    
    // Exclure les cotes N/A
    if (advanced.excludeNAOdds) {
      const before = filtered.length;
      filtered = filtered.filter(match => {
        const bookmaker = match.bookmakers[0];
        return bookmaker?.oneX2?.home && 
               bookmaker?.oneX2?.draw && 
               bookmaker?.oneX2?.away;
      });
      console.log(`🚫 Exclusion N/A: ${before} → ${filtered.length}`);
    }
    
    // Value bets (cotes élevées avec bonne probabilité implicite)
    if (advanced.onlyValueBets) {
      const before = filtered.length;
      filtered = filtered.filter(match => {
        const bookmaker = match.bookmakers[0];
        if (!bookmaker?.oneX2) return false;
        
        const maxOdds = Math.max(
          bookmaker.oneX2.home || 0,
          bookmaker.oneX2.draw || 0, 
          bookmaker.oneX2.away || 0
        );
        
        return maxOdds >= advanced.valueBetThreshold;
      });
      console.log(`💎 Value bets (>${advanced.valueBetThreshold}): ${before} → ${filtered.length}`);
    }
    
    return filtered;
  }

  /**
   * Quick filters presets
   */
  private static applyQuickFilters(matches: MatchOdds[], filters: NewFilterState): MatchOdds[] {
    const { quickFilters } = filters;
    let filtered = matches;
    
    // Favoris uniquement (cotes home < seuil)
    if (quickFilters.favoritesOnly) {
      const before = filtered.length;
      filtered = filtered.filter(match => {
        const bookmaker = match.bookmakers[0];
        return bookmaker?.oneX2?.home && bookmaker.oneX2.home < 2.0;
      });
      console.log(`⭐ Favoris uniquement: ${before} → ${filtered.length}`);
    }
    
    // Outsiders uniquement
    if (quickFilters.underdogsOnly) {
      const before = filtered.length;
      filtered = filtered.filter(match => {
        const bookmaker = match.bookmakers[0];
        return bookmaker?.oneX2?.home && bookmaker.oneX2.home > 3.0;
      });
      console.log(`🐎 Outsiders uniquement: ${before} → ${filtered.length}`);
    }
    
    // Matchs équilibrés
    if (quickFilters.balancedMatches) {
      const before = filtered.length;
      filtered = filtered.filter(match => {
        const bookmaker = match.bookmakers[0];
        if (!bookmaker?.oneX2) return false;
        
        const { home, away } = bookmaker.oneX2;
        return home && away && 
               home >= 1.8 && home <= 2.5 && 
               away >= 1.8 && away <= 2.5;
      });
      console.log(`⚖️ Matchs équilibrés: ${before} → ${filtered.length}`);
    }
    
    // Matchs terminés uniquement
    if (quickFilters.completedMatchesOnly) {
      // Cette info n'est pas directement dans le MatchOdds, on assume que tous sont valides
      console.log('✅ Matchs terminés: filtre pas applicable sur ce dataset');
    }
    
    return filtered;
  }

  /**
   * Helpers pour vérifier si des filtres sont actifs
   */
  private static hasOdds1X2Filters(odds1X2: NewFilterState['odds1X2']): boolean {
    return !!(odds1X2.homeMin || odds1X2.homeMax || 
              odds1X2.drawMin || odds1X2.drawMax ||
              odds1X2.awayMin || odds1X2.awayMax);
  }
  
  private static hasOverUnderFilters(overUnder: NewFilterState['overUnder']): boolean {
    return !!(overUnder.goals15 || overUnder.goals25 || overUnder.goals35 || overUnder.goals45);
  }
}