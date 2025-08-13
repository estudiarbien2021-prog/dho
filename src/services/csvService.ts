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
      const response = await fetch('/matchs.csv');
      if (!response.ok) {
        throw new Error('Impossible de charger le fichier CSV');
      }
      
      const csvText = await response.text();
      return this.parseCSV(csvText);
    } catch (error) {
      console.error('Error loading CSV:', error);
      throw error;
    }
  }

  /**
   * Parser le CSV et convertir au format MatchOdds
   */
  private static parseCSV(csvText: string): MatchOdds[] {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    const matches: MatchOdds[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;
      
      const row: CSVRow = {} as CSVRow;
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      
      // Ignorer les matchs sans données essentielles
      if (!row.date_unix || !row['Home Team'] || !row['Away Team']) continue;
      
      // Ignorer les matchs annulés ou incomplets
      if (row['Match Status'] === 'canceled' || row['Match Status'] === 'incomplete') continue;
      
      const match = this.convertRowToMatch(row, i.toString());
      if (match) {
        matches.push(match);
      }
    }
    
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
    let filtered = [...matches];

    // Filtre par compétitions
    if (filters.competitions && filters.competitions.length > 0) {
      filtered = filtered.filter(match => 
        filters.competitions!.some(comp => 
          match.tournament.name.toLowerCase().includes(comp.toLowerCase())
        )
      );
    }

    // Filtre par pays
    if (filters.countries && filters.countries.length > 0) {
      filtered = filtered.filter(match =>
        match.tournament.country && 
        filters.countries!.some(country =>
          match.tournament.country!.toLowerCase().includes(country.toLowerCase())
        )
      );
    }

    // Filtre par fenêtre horaire
    if (filters.timeWindow && filters.timeWindow !== 'all') {
      const now = Math.floor(Date.now() / 1000);
      const hoursLimit = filters.timeWindow === '6h' ? 6 : 12;
      const timeLimit = now + (hoursLimit * 3600);
      
      filtered = filtered.filter(match => match.startTimestamp <= timeLimit);
    }

    // Filtre par cotes
    if (filters.minOdds || filters.maxOdds) {
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
    }

    return filtered;
  }
}