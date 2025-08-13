import { MatchOdds } from "@/components/OddsTable";

interface CSVRow {
  date_unix: string;
  date_GMT: string;
  Country: string;
  League: string;
  'Home Team': string;
  'Away Team': string;
  'Match Status': string;
  Odds_Home_Win: string;
  Odds_Draw: string;
  Odds_Away_Win: string;
  Odds_Over25: string;
  Odds_Under25: string;
  Odds_Over35: string;
  Odds_Under35: string;
  Odds_BTTS_Yes: string;
  Odds_BTTS_No: string;
  [key: string]: string;
}

export class CSVService {
  /**
   * Charger les données du fichier CSV local
   */
  static async loadMatches(): Promise<MatchOdds[]> {
    try {
      console.log('🔄 Début du chargement du CSV...');
      const response = await fetch('/matchs.csv');
      console.log('📡 Réponse fetch:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Impossible de charger le fichier CSV: ${response.status}`);
      }
      
      const csvText = await response.text();
      console.log('📄 Taille du CSV:', csvText.length, 'caractères');
      console.log('📄 Premières lignes:', csvText.split('\n').slice(0, 3));
      
      const matches = this.parseCSV(csvText);
      console.log('✅ Matches parsés:', matches.length);
      console.log('📊 Premier match:', matches[0]);
      
      return matches;
    } catch (error) {
      console.error('❌ Error loading CSV:', error);
      throw error;
    }
  }

  /**
   * Parser le CSV et convertir au format MatchOdds
   */
  private static parseCSV(csvText: string): MatchOdds[] {
    console.log('🔍 Début du parsing CSV...');
    const lines = csvText.trim().split('\n');
    console.log('📊 Nombre total de lignes:', lines.length);
    
    const headers = lines[0].split(',');
    console.log('📋 Headers trouvés:', headers.length, headers.slice(0, 10));
    
    const matches: MatchOdds[] = [];
    let skippedCount = 0;
    let canceledCount = 0;
    let incompleteCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        skippedCount++;
        continue;
      }
      
      const row: CSVRow = {} as CSVRow;
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      
      // Log quelques échantillons
      if (i <= 5) {
        console.log(`📄 Ligne ${i}:`, {
          date_unix: row.date_unix,
          homeTeam: row['Home Team'],
          awayTeam: row['Away Team'],
          status: row['Match Status'],
          homeOdds: row.Odds_Home_Win
        });
      }
      
      // Ignorer les matchs sans données essentielles
      if (!row.date_unix || !row['Home Team'] || !row['Away Team']) {
        skippedCount++;
        continue;
      }
      
      // Ignorer les matchs annulés ou incomplets
      if (row['Match Status'] === 'canceled') {
        canceledCount++;
        continue;
      }
      if (row['Match Status'] === 'incomplete') {
        incompleteCount++;
        continue;
      }
      
      const match = this.convertRowToMatch(row, i.toString());
      if (match) {
        matches.push(match);
      } else {
        skippedCount++;
      }
    }
    
    console.log('📊 Résumé du parsing:');
    console.log('- Total lignes:', lines.length - 1);
    console.log('- Matches valides:', matches.length);
    console.log('- Skippés:', skippedCount);
    console.log('- Annulés:', canceledCount);
    console.log('- Incomplets:', incompleteCount);
    
    return matches;
  }

  /**
   * Parser une ligne CSV en tenant compte des guillemets
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Convertir une ligne CSV en objet MatchOdds
   */
  private static convertRowToMatch(row: CSVRow, id: string): MatchOdds | null {
    try {
      const timestamp = parseInt(row.date_unix);
      if (isNaN(timestamp)) return null;

      // Parser les cotes
      const homeOdds = this.parseFloat(row.Odds_Home_Win);
      const drawOdds = this.parseFloat(row.Odds_Draw);
      const awayOdds = this.parseFloat(row.Odds_Away_Win);
      const over25 = this.parseFloat(row.Odds_Over25);
      const under25 = this.parseFloat(row.Odds_Under25);
      const bttsYes = this.parseFloat(row.Odds_BTTS_Yes);
      const bttsNo = this.parseFloat(row.Odds_BTTS_No);

      return {
        id,
        startTimestamp: timestamp,
        tournament: {
          name: row.League || 'Unknown League',
          country: row.Country || undefined
        },
        homeTeam: {
          name: row['Home Team']
        },
        awayTeam: {
          name: row['Away Team']
        },
        bookmakers: [{
          name: 'CSV Data',
          oneX2: {
            home: homeOdds,
            draw: drawOdds,
            away: awayOdds
          },
          btts: {
            yes: bttsYes,
            no: bttsNo
          },
          ou: {
            '2.5': {
              over: over25,
              under: under25
            }
          }
        }]
      };
    } catch (error) {
      console.error('Error converting row to match:', error, row);
      return null;
    }
  }

  /**
   * Parser un float avec vérification
   */
  private static parseFloat(value: string): number | undefined {
    if (!value || value === 'N/A' || value === '') return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Filtrer les matchs selon les critères
   */
  static filterMatches(matches: MatchOdds[], filters: {
    competitions?: string[];
    countries?: string[];
    timeWindow?: 'all' | '6h' | '12h';
    minOdds?: number;
    maxOdds?: number;
  }): MatchOdds[] {
    console.log('🔍 Début du filtrage avec:', filters);
    console.log('📊 Matches à filtrer:', matches.length);
    
    let filtered = [...matches];

    // Filtre par compétitions
    if (filters.competitions && filters.competitions.length > 0) {
      const beforeCompetitions = filtered.length;
      filtered = filtered.filter(match => 
        filters.competitions!.some(comp => 
          match.tournament.name.toLowerCase().includes(comp.toLowerCase())
        )
      );
      console.log(`🏆 Filtre compétitions: ${beforeCompetitions} → ${filtered.length}`);
      console.log('🏆 Compétitions recherchées:', filters.competitions);
      console.log('🏆 Échantillon compétitions trouvées:', filtered.slice(0, 3).map(m => m.tournament.name));
    }

    // Filtre par pays
    if (filters.countries && filters.countries.length > 0) {
      const beforeCountries = filtered.length;
      filtered = filtered.filter(match =>
        match.tournament.country && 
        filters.countries!.some(country =>
          match.tournament.country!.toLowerCase().includes(country.toLowerCase())
        )
      );
      console.log(`🌍 Filtre pays: ${beforeCountries} → ${filtered.length}`);
    }

    // Filtre par fenêtre horaire
    if (filters.timeWindow && filters.timeWindow !== 'all') {
      const beforeTime = filtered.length;
      const now = Math.floor(Date.now() / 1000);
      const hoursLimit = filters.timeWindow === '6h' ? 6 : 12;
      const timeLimit = now + (hoursLimit * 3600);
      
      filtered = filtered.filter(match => match.startTimestamp <= timeLimit);
      console.log(`⏰ Filtre temps (${filters.timeWindow}): ${beforeTime} → ${filtered.length}`);
      console.log(`⏰ Limite timestamp: ${timeLimit}, now: ${now}`);
    }

    // Filtre par cotes
    if (filters.minOdds || filters.maxOdds) {
      const beforeOdds = filtered.length;
      filtered = filtered.filter(match => {
        const bookmaker = match.bookmakers[0];
        if (!bookmaker?.oneX2) return false;

        const odds = [bookmaker.oneX2.home, bookmaker.oneX2.draw, bookmaker.oneX2.away].filter(Boolean) as number[];
        
        return odds.some(odd => {
          if (filters.minOdds && odd < filters.minOdds) return false;
          if (filters.maxOdds && odd > filters.maxOdds) return false;
          return true;
        });
      });
      console.log(`💰 Filtre cotes (${filters.minOdds}-${filters.maxOdds}): ${beforeOdds} → ${filtered.length}`);
    }

    console.log('✅ Résultat final du filtrage:', filtered.length, 'matches');
    return filtered;
  }
}