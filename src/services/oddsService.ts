import { supabase } from "@/integrations/supabase/client";
import { MatchOdds } from "@/components/OddsTable";

interface ScrapeRequest {
  competitions: string[];
  date?: string;
}

interface ScrapeResponse {
  success: boolean;
  matches: MatchOdds[];
  timestamp: string;
  source: string;
  error?: string;
}

export class OddsService {
  
  /**
   * Scraper les cotes en temps réel depuis OddsPedia via Firecrawl
   */
  static async scrapeRealOdds(competitions: string[]): Promise<ScrapeResponse> {
    try {
      console.log('Calling scrape-odds function with competitions:', competitions);

      const { data, error } = await supabase.functions.invoke('scrape-odds', {
        body: {
          competitions: competitions.slice(0, 10), // Limite à 10 compétitions
          date: new Date().toISOString().split('T')[0]
        } as ScrapeRequest
      });

      if (error) {
        console.error('Error calling scrape-odds function:', error);
        throw new Error(error.message || 'Erreur lors de l\'appel à la fonction de scraping');
      }

      if (!data) {
        throw new Error('Aucune donnée reçue du service de scraping');
      }

      console.log('Scraping response:', data);
      
      return data as ScrapeResponse;
      
    } catch (error) {
      console.error('Error in scrapeRealOdds:', error);
      
      return {
        success: false,
        matches: [],
        timestamp: new Date().toISOString(),
        source: 'error',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Filtrer les matchs selon les critères Tier-1
   */
  static filterTier1Matches(matches: MatchOdds[], enableHypePlus = false): MatchOdds[] {
    const tier1Competitions = [
      'Premier League',
      'LaLiga', 
      'Serie A',
      'Bundesliga',
      'Ligue 1',
      'Champions League',
      'Europa League',
      'Conference League',
      'Brasileirão',
      'Copa Libertadores',
      'Copa Sudamericana'
    ];

    const hypePlusCompetitions = [
      'Eredivisie',
      'Primeira Liga',
      'Süper Lig',
      'MLS'
    ];

    const allowedCompetitions = enableHypePlus 
      ? [...tier1Competitions, ...hypePlusCompetitions]
      : tier1Competitions;

    return matches.filter(match => 
      allowedCompetitions.some(comp => 
        match.tournament.name.toLowerCase().includes(comp.toLowerCase())
      )
    );
  }

  /**
   * Appliquer les filtres de fenêtre horaire
   */
  static applyTimeWindowFilter(matches: MatchOdds[], timeWindow: 'all' | '6h' | '12h'): MatchOdds[] {
    if (timeWindow === 'all') return matches;

    const now = Math.floor(Date.now() / 1000);
    const hoursLimit = timeWindow === '6h' ? 6 : 12;
    const timeLimit = now + (hoursLimit * 3600);

    return matches.filter(match => match.startTimestamp <= timeLimit);
  }

  /**
   * Appliquer les filtres de cotes
   */
  static applyOddsFilter(matches: MatchOdds[], market: string, minOdds?: number, maxOdds?: number): MatchOdds[] {
    if (!minOdds && !maxOdds) return matches;

    return matches.filter(match => {
      const bookmaker = match.bookmakers[0];
      if (!bookmaker) return false;

      let oddsToCheck: number[] = [];

      switch (market) {
        case '1x2':
          if (bookmaker.oneX2) {
            oddsToCheck = [
              bookmaker.oneX2.home,
              bookmaker.oneX2.draw,
              bookmaker.oneX2.away
            ].filter(Boolean) as number[];
          }
          break;
        case 'btts':
          if (bookmaker.btts) {
            oddsToCheck = [
              bookmaker.btts.yes,
              bookmaker.btts.no
            ].filter(Boolean) as number[];
          }
          break;
        case 'ou':
          if (bookmaker.ou) {
            Object.values(bookmaker.ou).forEach(line => {
              if (line.over) oddsToCheck.push(line.over);
              if (line.under) oddsToCheck.push(line.under);
            });
          }
          break;
        case 'ah':
          if (bookmaker.ahMain) {
            oddsToCheck = [
              bookmaker.ahMain.home,
              bookmaker.ahMain.away
            ].filter(Boolean) as number[];
          }
          break;
      }

      return oddsToCheck.some(odds => {
        if (minOdds && odds < minOdds) return false;
        if (maxOdds && odds > maxOdds) return false;
        return true;
      });
    });
  }

  /**
   * Trier les matchs selon le critère sélectionné
   */
  static sortMatches(matches: MatchOdds[], sortField: string, direction: 'asc' | 'desc'): MatchOdds[] {
    const sorted = [...matches].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortField) {
        case 'time':
          aValue = a.startTimestamp;
          bValue = b.startTimestamp;
          break;
        case 'league':
          aValue = a.tournament.name;
          bValue = b.tournament.name;
          break;
        case 'odds':
          // Tri par cote 1X2 home par défaut
          aValue = a.bookmakers[0]?.oneX2?.home || 0;
          bValue = b.bookmakers[0]?.oneX2?.home || 0;
          break;
        case 'probability':
          // Tri par probabilité implicite (1/cote)
          const aOdds = a.bookmakers[0]?.oneX2?.home || 1;
          const bOdds = b.bookmakers[0]?.oneX2?.home || 1;
          aValue = 1 / aOdds;
          bValue = 1 / bOdds;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return direction === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }

  /**
   * Formater les données pour l'export CSV
   */
  static formatForCSV(matches: MatchOdds[]): string {
    const headers = [
      'Heure_SP',
      'Heure_Paris', 
      'Competition',
      'Pays',
      'Match',
      'Home',
      'Draw', 
      'Away',
      'BTTS_Yes',
      'BTTS_No',
      'O2.5',
      'U2.5',
      'AH_Line',
      'AH_Home',
      'AH_Away',
      'Bookmaker'
    ];

    const rows = matches.map(match => {
      const bookmaker = match.bookmakers[0];
      
      return [
        new Intl.DateTimeFormat('fr-FR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        }).format(new Date(match.startTimestamp * 1000)),
        new Intl.DateTimeFormat('fr-FR', {
          timeZone: 'Europe/Paris',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        }).format(new Date(match.startTimestamp * 1000)),
        match.tournament.name,
        match.tournament.country || '',
        `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        bookmaker?.oneX2?.home?.toFixed(2) || '',
        bookmaker?.oneX2?.draw?.toFixed(2) || '', 
        bookmaker?.oneX2?.away?.toFixed(2) || '',
        bookmaker?.btts?.yes?.toFixed(2) || '',
        bookmaker?.btts?.no?.toFixed(2) || '',
        bookmaker?.ou?.['2.5']?.over?.toFixed(2) || '',
        bookmaker?.ou?.['2.5']?.under?.toFixed(2) || '',
        bookmaker?.ahMain?.line?.toString() || '',
        bookmaker?.ahMain?.home?.toFixed(2) || '',
        bookmaker?.ahMain?.away?.toFixed(2) || '',
        bookmaker?.name || ''
      ];
    });

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}