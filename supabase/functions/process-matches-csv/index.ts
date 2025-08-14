import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  league?: string;
  home_team?: string;
  away_team?: string;
  country?: string;
  kickoff_utc?: string;
  kickoff_sao_paulo?: string;
  p_home_fair?: string;
  p_draw_fair?: string;
  p_away_fair?: string;
  p_btts_yes_fair?: string;
  p_btts_no_fair?: string;
  p_over_2_5_fair?: string;
  p_under_2_5_fair?: string;
  vig_1x2?: string;
  vig_btts?: string;
  vig_ou_2_5?: string;
  is_low_vig_1x2?: string;
  watch_btts?: string;
  watch_over25?: string;
  odds_1x2_home?: string;
  odds_1x2_draw?: string;
  odds_1x2_away?: string;
  odds_btts_yes?: string;
  odds_btts_no?: string;
  odds_over_2_5?: string;
  odds_under_2_5?: string;
  [key: string]: string | undefined;
}

function getCategoryFromLeague(league: string): string {
  const l = league.toLowerCase();
  
  if (l.includes('libertadores') || l.includes('sudamericana') || l.includes('champions league') || 
      l.includes('europa league') || l.includes('conference league') || l.includes('afc cup')) {
    return 'continental_cup';
  }
  
  if (l.includes('cup') || l.includes('copa') || l.includes('coupe') || l.includes('pokal') || 
      l.includes('taça') || l.includes('beker')) {
    return 'national_cup';
  }
  
  if (l.includes('serie b') || l.includes('segunda') || l.includes('championship') || 
      l.includes('2. bundesliga') || l.includes('ligue 2')) {
    return 'second_div';
  }
  
  return 'first_div';
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV doit avoir au moins un header et une ligne de données');
  
  // Improved CSV parsing to handle quoted fields and commas within fields
  function parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    return result;
  }
  
  const headers = parseCSVLine(lines[0]);
  console.log(`📋 Headers détectés: ${JSON.stringify(headers)}`);
  
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
      // Normalize header names for easier matching
      const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
      row[normalizedHeader] = values[index] || '';
      // Also keep original header
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting CSV processing...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { csvContent, csvUrl, matchDate, filename } = await req.json();
    
    if (!csvContent && !csvUrl) {
      return new Response(JSON.stringify({ error: 'Contenu CSV ou URL CSV requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const uploadDate = matchDate || new Date().toISOString().split('T')[0];
    const uploadFilename = filename || `matches-${uploadDate}.csv`;
    
    // Convert GitHub URL to raw URL if needed
    let actualCsvUrl = csvUrl;
    if (csvUrl && csvUrl.includes('github.com') && csvUrl.includes('/blob/')) {
      actualCsvUrl = csvUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    
    let csvText = '';
    
    if (csvContent) {
      // Use provided CSV content directly
      console.log(`📄 Utilisation du contenu CSV fourni`);
      csvText = csvContent;
    } else {
      // Download CSV from URL (rétrocompatibilité)
      console.log(`📥 Téléchargement du CSV depuis: ${actualCsvUrl}`);
      const response = await fetch(actualCsvUrl);
      if (!response.ok) {
        throw new Error(`Erreur téléchargement CSV: ${response.status} ${response.statusText}`);
      }
      csvText = await response.text();
    }
    
    console.log(`📊 CSV traité, taille: ${csvText.length} caractères`);
    
    console.log(`📅 Date des matchs: ${uploadDate}`);
    
    // Create upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('match_uploads')
      .upsert({
        upload_date: uploadDate,
        filename: uploadFilename,
        status: 'processing',
        total_matches: 0,
        processed_matches: 0
      }, {
        onConflict: 'upload_date'
      })
      .select()
      .single();
    
    if (uploadError) {
      console.error('❌ Erreur création upload record:', uploadError);
      throw uploadError;
    }
    
    // Parse CSV
    const csvRows = parseCSV(csvText);
    console.log(`🔍 ${csvRows.length} lignes trouvées dans le CSV`);
    
    // Log first row structure for debugging
    if (csvRows.length > 0) {
      console.log(`📋 Structure de la première ligne:`, JSON.stringify(csvRows[0], null, 2));
      console.log(`🔑 Clés disponibles:`, JSON.stringify(Object.keys(csvRows[0])));
      
      // Test if this looks like HTML instead of CSV
      const firstKey = Object.keys(csvRows[0])[0];
      if (firstKey && firstKey.includes('html')) {
        console.error(`❌ ERREUR: Le CSV semble être du HTML! Première clé: ${firstKey}`);
        throw new Error('Le fichier téléchargé est du HTML, pas un CSV. Vérifiez l\'URL.');
      }
      
      // Show detailed structure of first 3 rows for debugging
      console.log(`🔍 DEBUG - Première ligne complète:`, csvRows[0]);
      if (csvRows.length > 1) {
        console.log(`🔍 DEBUG - Deuxième ligne:`, csvRows[1]);
      }
      if (csvRows.length > 2) {
        console.log(`🔍 DEBUG - Troisième ligne:`, csvRows[2]);
      }
    }
    
    // Update total matches count
    await supabase
      .from('match_uploads')
      .update({ total_matches: csvRows.length })
      .eq('id', uploadRecord.id);
    
    // Process and insert matches
    const processedMatches = [];
    let errorCount = 0;
    let skippedCount = 0;
    
    // Filter out empty rows and duplicates first
    const validRows = [];
    const seenMatches = new Set();
    
    for (const row of csvRows) {
      // Skip rows with too few non-empty values
      const nonEmptyValues = Object.values(row).filter(v => v && v.toString().trim().length > 0);
      if (nonEmptyValues.length < 3) {
        console.log(`⚠️ LIGNE IGNORÉE - Trop peu de données: ${nonEmptyValues.length} valeurs`);
        skippedCount++;
        continue;
      }
      
      // Create a simple match identifier from the first few meaningful values
      const matchKey = nonEmptyValues.slice(0, 3).join('|').toLowerCase();
      
      if (seenMatches.has(matchKey)) {
        console.log(`⚠️ LIGNE IGNORÉE - Doublon détecté: ${matchKey}`);
        skippedCount++;
        continue;
      }
      
      seenMatches.add(matchKey);
      validRows.push(row);
    }
    
    console.log(`📊 ${csvRows.length} lignes totales, ${validRows.length} lignes valides, ${skippedCount} lignes ignorées`);
    
    for (const row of validRows) {
      try {
        // Try to find the right column names (flexible mapping)
        const availableKeys = Object.keys(row);
        console.log(`🔍 Traitement ligne ${csvRows.indexOf(row) + 1}, clés: ${availableKeys.slice(0, 5).join(', ')}...`);
        
        // ULTRA FLEXIBLE column mapping - find any column that looks like what we need
        const allKeys = Object.keys(row);
        
        // Find home team (look for keywords)
        const homeTeam = allKeys.find(key => 
          key.toLowerCase().includes('home') || 
          key.toLowerCase().includes('domicile') ||
          key.toLowerCase().includes('équipe') && key.toLowerCase().includes('1')
        ) ? row[allKeys.find(key => 
          key.toLowerCase().includes('home') || 
          key.toLowerCase().includes('domicile') ||
          key.toLowerCase().includes('équipe') && key.toLowerCase().includes('1')
        )!] : '';
        
        // Find away team
        const awayTeam = allKeys.find(key => 
          key.toLowerCase().includes('away') || 
          key.toLowerCase().includes('extérieur') ||
          key.toLowerCase().includes('équipe') && key.toLowerCase().includes('2')
        ) ? row[allKeys.find(key => 
          key.toLowerCase().includes('away') || 
          key.toLowerCase().includes('extérieur') ||
          key.toLowerCase().includes('équipe') && key.toLowerCase().includes('2')
        )!] : '';
        
        // Find league
        const league = allKeys.find(key => 
          key.toLowerCase().includes('league') || 
          key.toLowerCase().includes('competition') ||
          key.toLowerCase().includes('championnat') ||
          key.toLowerCase().includes('ligue')
        ) ? row[allKeys.find(key => 
          key.toLowerCase().includes('league') || 
          key.toLowerCase().includes('competition') ||
          key.toLowerCase().includes('championnat') ||
          key.toLowerCase().includes('ligue')
        )!] : '';
        
        // Find country
        const country = allKeys.find(key => 
          key.toLowerCase().includes('country') || 
          key.toLowerCase().includes('pays') ||
          key.toLowerCase().includes('nation')
        ) ? row[allKeys.find(key => 
          key.toLowerCase().includes('country') || 
          key.toLowerCase().includes('pays') ||
          key.toLowerCase().includes('nation')
        )!] : '';
        
        // Find odds - try to find numerical columns that look like odds
        const potentialOddsKeys = allKeys.filter(key => {
          const value = row[key];
          return value && !isNaN(parseFloat(value)) && parseFloat(value) > 1 && parseFloat(value) < 50;
        });
        
        // Prioritize exact column names for odds
        const oddsHome = row['odds_1x2_home'] || (potentialOddsKeys[0] ? row[potentialOddsKeys[0]] : '');
        const oddsDraw = row['odds_1x2_draw'] || (potentialOddsKeys[1] ? row[potentialOddsKeys[1]] : '');  
        const oddsAway = row['odds_1x2_away'] || (potentialOddsKeys[2] ? row[potentialOddsKeys[2]] : '');
        
        // Fallback: if we have exactly 2 team names in the row, use them
        let teamValues = allKeys.filter(key => {
          const value = row[key];
          return value && typeof value === 'string' && value.length > 2 && 
                 !value.includes('.') && !value.match(/^\d/);
        });
        
        // If no team values found, try ANY string values
        if (teamValues.length < 2) {
          teamValues = allKeys.filter(key => {
            const value = row[key];
            return value && typeof value === 'string' && value.trim().length > 1;
          });
        }
        
        // Use the first available values as teams
        let finalHomeTeam = homeTeam || (teamValues[0] ? row[teamValues[0]] : '');
        let finalAwayTeam = awayTeam || (teamValues[1] ? row[teamValues[1]] : '');
        
        // Ultra fallback: use ANY non-empty values from the first few columns
        if (!finalHomeTeam || !finalAwayTeam) {
          const allValues = Object.values(row).filter(v => v && v.toString().trim().length > 0);
          if (!finalHomeTeam && allValues[1]) finalHomeTeam = allValues[1].toString().trim();
          if (!finalAwayTeam && allValues[2]) finalAwayTeam = allValues[2].toString().trim();
          // If still no away team, try next value
          if (!finalAwayTeam && allValues[3]) finalAwayTeam = allValues[3].toString().trim();
        }
        
        // Get all values for league fallback
        const allValues = Object.values(row).filter(v => v && v.toString().trim().length > 0);
        const finalLeague = league || (allValues[0] ? allValues[0].toString().trim() : 'Unknown League');

        console.log(`🎯 Valeurs extraites:`, { 
          finalHomeTeam, finalAwayTeam, finalLeague, country, 
          oddsHome, oddsDraw, oddsAway,
          potentialOddsKeys 
        });

        // Be VERY lenient - accept if we have at least 2 team names
        if (!finalHomeTeam || !finalAwayTeam) {
          console.log(`⚠️ LIGNE ${csvRows.indexOf(row) + 1} REJETÉE - Pas assez d'équipes trouvées`);
          console.log(`   - Home: "${finalHomeTeam}"`);
          console.log(`   - Away: "${finalAwayTeam}"`);
          console.log(`   - League: "${finalLeague}"`);
          console.log(`   - Toutes les clés: ${Object.keys(row).join(', ')}`);
          console.log(`   - Valeurs importantes:`, {
            home_team: row.home_team,
            away_team: row.away_team,
            Home_Team: row.Home_Team,
            Away_Team: row.Away_Team,
            HomeTeam: row.HomeTeam,
            AwayTeam: row.AwayTeam
          });
          errorCount++; // Count as error so it's reflected in the stats
          continue;
        }
        
        // Find kickoff time - look for date_gmt column
        const dateGmt = allKeys.find(key => 
          key.toLowerCase().includes('date_gmt') || 
          key.toLowerCase().includes('kickoff') ||
          key.toLowerCase().includes('datetime')
        ) ? row[allKeys.find(key => 
          key.toLowerCase().includes('date_gmt') || 
          key.toLowerCase().includes('kickoff') ||
          key.toLowerCase().includes('datetime')
        )!] : '';

        // Parse date_gmt format like "Aug 14 2025 - 11:00pm"
        let kickoffUtc = new Date();
        let kickoffLocal = new Date();
        
        if (dateGmt) {
          try {
            const dateStr = dateGmt.toString().trim();
            console.log(`📅 Parsing date: "${dateStr}"`);
            
            // More robust parser for format "Aug 14 2025 - 11:00pm"
            const parseCustomDate = (dateString: string): Date | null => {
              console.log(`🔍 Attempting to parse: "${dateString}"`);
              
              // More flexible regex to handle variations
              const match = dateString.match(/^(\w{3})\s+(\d{1,2})\s+(\d{4})\s*-\s*(\d{1,2}):(\d{2})(am|pm)$/i);
              console.log(`🎯 Regex match result:`, match);
              
              if (!match) {
                console.log(`❌ No regex match for: "${dateString}"`);
                return null;
              }
              
              const [fullMatch, monthName, day, year, hour, minute, ampm] = match;
              console.log(`📋 Parsed components:`, { monthName, day, year, hour, minute, ampm });
              
              // Convert month name to number
              const months: { [key: string]: number } = {
                'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
              };
              
              const monthIndex = months[monthName.toLowerCase()];
              console.log(`📅 Month "${monthName}" -> index ${monthIndex}`);
              
              if (monthIndex === undefined) {
                console.log(`❌ Unknown month: "${monthName}"`);
                return null;
              }
              
              // Convert 12-hour to 24-hour format
              let hour24 = parseInt(hour);
              console.log(`🕐 Original hour: ${hour24}, period: ${ampm}`);
              
              if (ampm.toLowerCase() === 'pm' && hour24 !== 12) {
                hour24 += 12;
              } else if (ampm.toLowerCase() === 'am' && hour24 === 12) {
                hour24 = 0;
              }
              
              console.log(`🕐 Converted to 24h: ${hour24}`);
              
              const finalDate = new Date(parseInt(year), monthIndex, parseInt(day), hour24, parseInt(minute), 0, 0);
              console.log(`📅 Final date object:`, finalDate);
              console.log(`📅 Final date ISO:`, finalDate.toISOString());
              
              return finalDate;
            };
            
            const parsedDate = parseCustomDate(dateStr);
            
            if (parsedDate && !isNaN(parsedDate.getTime())) {
              kickoffUtc = parsedDate;
              kickoffLocal = parsedDate;
              console.log(`✅ SUCCESS! Parsed date: ${kickoffUtc.toISOString()}`);
            } else {
              console.log(`❌ FAILED to parse date: "${dateStr}", using current time`);
            }
          } catch (error) {
            console.log(`💥 ERROR parsing date: ${error.message}`);
          }
        } else {
          console.log(`⚠️ No dateGmt found in row`);
        }
        
        const matchData = {
          match_date: uploadDate,
          league: finalLeague,
          home_team: finalHomeTeam,
          away_team: finalAwayTeam,
          country: country || null,
          kickoff_utc: kickoffUtc.toISOString(),
          kickoff_local: kickoffLocal.toISOString(),
          category: getCategoryFromLeague(finalLeague),
          
          // Extract fair probabilities from CSV for AI recommendations
          p_home_fair: row['p_home_fair'] ? parseFloat(row['p_home_fair']) : 0,
          p_draw_fair: row['p_draw_fair'] ? parseFloat(row['p_draw_fair']) : 0,
          p_away_fair: row['p_away_fair'] ? parseFloat(row['p_away_fair']) : 0,
          p_btts_yes_fair: row['p_btts_yes_fair'] ? parseFloat(row['p_btts_yes_fair']) : 0,
          p_btts_no_fair: row['p_btts_no_fair'] ? parseFloat(row['p_btts_no_fair']) : 0,
          p_over_2_5_fair: row['p_over_2_5_fair'] ? parseFloat(row['p_over_2_5_fair']) : 0,
          p_under_2_5_fair: row['p_under_2_5_fair'] ? parseFloat(row['p_under_2_5_fair']) : 0,
          
          // Extract vigorish values from CSV
          vig_1x2: row['vig_1x2'] ? parseFloat(row['vig_1x2']) : 0,
          vig_btts: row['vig_btts'] ? parseFloat(row['vig_btts']) : 0,
          vig_ou_2_5: row['vig_ou_2_5'] ? parseFloat(row['vig_ou_2_5']) : 0,
          
          // Extract flags from CSV
          is_low_vig_1x2: row['is_low_vig_1x2'] === 'True' || row['is_low_vig_1x2'] === 'true' || false,
          watch_btts: row['watch_btts'] === 'True' || row['watch_btts'] === 'true' || false,
          watch_over25: row['watch_over25'] === 'True' || row['watch_over25'] === 'true' || false,
          
          // Odds from CSV (with fallbacks)
          odds_home: oddsHome ? parseFloat(oddsHome) : 2.0,
          odds_draw: oddsDraw ? parseFloat(oddsDraw) : 3.0, 
          odds_away: oddsAway ? parseFloat(oddsAway) : 2.5,
          odds_btts_yes: row['odds_btts_yes'] ? parseFloat(row['odds_btts_yes']) : null,
          odds_btts_no: row['odds_btts_no'] ? parseFloat(row['odds_btts_no']) : null,
          odds_over_2_5: row['odds_over_2_5'] ? parseFloat(row['odds_over_2_5']) : null,
          odds_under_2_5: row['odds_under_2_5'] ? parseFloat(row['odds_under_2_5']) : null,
        };
        
        processedMatches.push(matchData);
        
      } catch (error) {
        console.error(`❌ Erreur traitement ligne: ${row.home_team} vs ${row.away_team}:`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ ${processedMatches.length} matchs traités avec succès`);
    console.log(`❌ ${errorCount} erreurs de traitement`);
    
    // Deduplicate matches to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time" error
    if (processedMatches.length > 0) {
      // Create a map to deduplicate based on the conflict keys
      const matchMap = new Map();
      
      for (const match of processedMatches) {
        // Create a unique key based on the conflict columns
        const key = `${match.match_date}-${match.league}-${match.home_team}-${match.away_team}-${match.kickoff_utc}`;
        // Keep the last occurrence (most recent data)
        matchMap.set(key, match);
      }
      
      // Convert back to array and replace processedMatches content
      const uniqueMatches = Array.from(matchMap.values());
      const duplicatesRemoved = processedMatches.length - uniqueMatches.length;
      
      if (duplicatesRemoved > 0) {
        console.log(`🔄 ${duplicatesRemoved} doublons supprimés, ${uniqueMatches.length} matchs uniques restants`);
        // Clear and refill the array with unique matches
        processedMatches.length = 0;
        processedMatches.push(...uniqueMatches);
      }
      // Insert in batches of 100 to avoid timeouts
      const batchSize = 100;
      let totalInserted = 0;
      
      for (let i = 0; i < processedMatches.length; i += batchSize) {
        const batch = processedMatches.slice(i, i + batchSize);
        
        // Only upsert matches for the current upload date to preserve historical data
        const { data, error } = await supabase
          .from('matches')
          .upsert(batch, {
            onConflict: 'match_date,league,home_team,away_team,kickoff_utc',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`❌ Erreur insertion batch ${i}-${i + batch.length}:`, error);
          throw error;
        }
        
        totalInserted += batch.length;
        console.log(`📥 Batch ${Math.floor(i/batchSize) + 1} inséré: ${batch.length} matchs`);
      }
      
      console.log(`🎉 Total inséré: ${totalInserted} matchs`);
      
      // Filter out matches without AI recommendations
      console.log('🤖 Suppression des matchs sans opportunité AI...');
      const { data: insertedMatches, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('match_date', uploadDate);
      
      if (fetchError) {
        console.error('❌ Erreur récupération matchs:', fetchError);
      } else {
        const matchesToDelete = [];
        
        for (const match of insertedMatches) {
          // Check BTTS AI recommendation
          const bttsYesValid = match.odds_btts_yes && match.odds_btts_yes >= 1.3 && match.p_btts_yes_fair > 0.45;
          const bttsNoValid = match.odds_btts_no && match.odds_btts_no >= 1.3 && match.p_btts_no_fair > 0.45;
          const hasBTTSRecommendation = bttsYesValid || bttsNoValid;
          
          // Check Over/Under AI recommendation
          const overValid = match.odds_over_2_5 && match.odds_over_2_5 >= 1.3 && match.p_over_2_5_fair > 0.45;
          const underValid = match.odds_under_2_5 && match.odds_under_2_5 >= 1.3 && match.p_under_2_5_fair > 0.45;
          const hasOURecommendation = overValid || underValid;
          
          // If no AI recommendation for either market, mark for deletion
          if (!hasBTTSRecommendation && !hasOURecommendation) {
            matchesToDelete.push(match.id);
          }
        }
        
        if (matchesToDelete.length > 0) {
          console.log(`🗑️ Suppression de ${matchesToDelete.length} matchs sans opportunité AI`);
          const { error: deleteError } = await supabase
            .from('matches')
            .delete()
            .in('id', matchesToDelete);
          
          if (deleteError) {
            console.error('❌ Erreur suppression matchs sans AI:', deleteError);
          } else {
            console.log(`✅ ${matchesToDelete.length} matchs sans opportunité AI supprimés`);
            totalInserted -= matchesToDelete.length;
          }
        } else {
          console.log('✅ Aucun match à supprimer - tous ont des opportunités AI');
        }
      }
    }
    
    // Update upload record as completed
    await supabase
      .from('match_uploads')
      .update({
        status: 'completed',
        processed_matches: processedMatches.length,
        error_message: errorCount > 0 ? `${errorCount} erreurs de traitement` : null
      })
      .eq('id', uploadRecord.id);
    
    console.log('🎊 Traitement terminé avec succès !');
    
    // Générer automatiquement les prédictions IA pour les nouveaux matchs
    console.log('🤖 Génération automatique des prédictions IA...');
    try {
      const aiPredictionsResponse = await supabase.functions.invoke('generate-ai-predictions', {
        body: { matchIds: [] } // Traiter tous les matchs sans prédiction
      });

      if (aiPredictionsResponse.error) {
        console.error('❌ Erreur lors de la génération des prédictions IA:', aiPredictionsResponse.error);
      } else {
        console.log('✅ Prédictions IA générées:', aiPredictionsResponse.data);
      }
    } catch (aiError) {
      console.error('❌ Erreur appel fonction génération IA:', aiError);
      // Ne pas faire échouer le processus principal si la génération IA échoue
    }
    
    return new Response(JSON.stringify({
      success: true,
      uploadDate,
      filename: uploadFilename,
      totalRows: csvRows.length,
      processedMatches: processedMatches.length,
      errors: errorCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('💥 Erreur globale:', error);
    
    // Try to update upload record with error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('match_uploads')
        .update({
          status: 'error',
          error_message: error.message
        })
        .eq('upload_date', new Date().toISOString().split('T')[0]);
    } catch (updateError) {
      console.error('Erreur mise à jour status:', updateError);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});