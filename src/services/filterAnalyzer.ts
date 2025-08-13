// Service pour analyser le CSV et extraire les options de filtres disponibles

export class FilterAnalyzer {
  /**
   * Analyser le CSV et extraire toutes les options disponibles
   */
  static async analyzeCSVOptions(): Promise<{
    countries: string[];
    competitions: string[];
    availableOddsTypes: string[];
    dateRange: { min: number; max: number };
    sampleOddsRanges: {
      home: { min: number; max: number };
      draw: { min: number; max: number };
      away: { min: number; max: number };
      btts: { min: number; max: number };
      over25: { min: number; max: number };
    };
  }> {
    try {
      const response = await fetch('/matchs.csv');
      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',');
      
      const countries = new Set<string>();
      const competitions = new Set<string>();
      const availableOddsTypes = new Set<string>();
      
      let minDate = Infinity;
      let maxDate = -Infinity;
      
      const oddsRanges = {
        home: { min: Infinity, max: -Infinity },
        draw: { min: Infinity, max: -Infinity },
        away: { min: Infinity, max: -Infinity },
        btts: { min: Infinity, max: -Infinity },
        over25: { min: Infinity, max: -Infinity }
      };
      
      for (let i = 1; i < Math.min(lines.length, 200); i++) { // Analyser échantillon de 200 lignes
        const values = this.parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;
        
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });
        
        // Extraire pays et compétitions (exclure Esports automatiquement)
        if (row.Country && row.Country.toLowerCase() !== 'esports') {
          countries.add(row.Country);
        }
        if (row.League && !row.League.toLowerCase().includes('esoccer')) {
          competitions.add(row.League);
        }
        
        // Analyser les dates
        const timestamp = parseInt(row.date_unix);
        if (!isNaN(timestamp)) {
          minDate = Math.min(minDate, timestamp);
          maxDate = Math.max(maxDate, timestamp);
        }
        
        // Analyser les cotes disponibles
        if (row.Odds_Home_Win && row.Odds_Home_Win !== 'N/A') {
          availableOddsTypes.add('1X2');
          const homeOdds = parseFloat(row.Odds_Home_Win);
          if (!isNaN(homeOdds)) {
            oddsRanges.home.min = Math.min(oddsRanges.home.min, homeOdds);
            oddsRanges.home.max = Math.max(oddsRanges.home.max, homeOdds);
          }
        }
        
        if (row.Odds_Draw && row.Odds_Draw !== 'N/A') {
          const drawOdds = parseFloat(row.Odds_Draw);
          if (!isNaN(drawOdds)) {
            oddsRanges.draw.min = Math.min(oddsRanges.draw.min, drawOdds);
            oddsRanges.draw.max = Math.max(oddsRanges.draw.max, drawOdds);
          }
        }
        
        if (row.Odds_Away_Win && row.Odds_Away_Win !== 'N/A') {
          const awayOdds = parseFloat(row.Odds_Away_Win);
          if (!isNaN(awayOdds)) {
            oddsRanges.away.min = Math.min(oddsRanges.away.min, awayOdds);
            oddsRanges.away.max = Math.max(oddsRanges.away.max, awayOdds);
          }
        }
        
        if (row.Odds_BTTS_Yes && row.Odds_BTTS_Yes !== 'N/A') {
          availableOddsTypes.add('BTTS');
          const bttsOdds = parseFloat(row.Odds_BTTS_Yes);
          if (!isNaN(bttsOdds)) {
            oddsRanges.btts.min = Math.min(oddsRanges.btts.min, bttsOdds);
            oddsRanges.btts.max = Math.max(oddsRanges.btts.max, bttsOdds);
          }
        }
        
        if (row.Odds_Over25 && row.Odds_Over25 !== 'N/A') {
          availableOddsTypes.add('Over/Under');
          const over25Odds = parseFloat(row.Odds_Over25);
          if (!isNaN(over25Odds)) {
            oddsRanges.over25.min = Math.min(oddsRanges.over25.min, over25Odds);
            oddsRanges.over25.max = Math.max(oddsRanges.over25.max, over25Odds);
          }
        }
        
        // Vérifier les autres types de cotes
        if (row.Odds_Corners_Over95 && row.Odds_Corners_Over95 !== 'N/A') {
          availableOddsTypes.add('Corners');
        }
      }
      
      console.log('📊 Analyse CSV terminée:');
      console.log('- Pays:', Array.from(countries).sort());
      console.log('- Compétitions:', Array.from(competitions).sort());
      console.log('- Types de cotes:', Array.from(availableOddsTypes));
      console.log('- Ranges de cotes:', oddsRanges);
      
      return {
        countries: Array.from(countries).sort(),
        competitions: Array.from(competitions).sort(),
        availableOddsTypes: Array.from(availableOddsTypes),
        dateRange: { min: minDate, max: maxDate },
        sampleOddsRanges: oddsRanges
      };
      
    } catch (error) {
      console.error('❌ Erreur analyse CSV:', error);
      return {
        countries: [],
        competitions: [],
        availableOddsTypes: [],
        dateRange: { min: 0, max: 0 },
        sampleOddsRanges: {
          home: { min: 1, max: 10 },
          draw: { min: 1, max: 10 },
          away: { min: 1, max: 10 },
          btts: { min: 1, max: 5 },
          over25: { min: 1, max: 5 }
        }
      };
    }
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
}