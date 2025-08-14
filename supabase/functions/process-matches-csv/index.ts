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
    
    const { csvUrl, matchDate, filename } = await req.json();
    
    if (!csvUrl) {
      return new Response(JSON.stringify({ error: 'csvUrl requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const uploadDate = matchDate || new Date().toISOString().split('T')[0];
    const uploadFilename = filename || `matches-${uploadDate}.csv`;
    
    // Convert GitHub URL to raw URL if needed
    let actualCsvUrl = csvUrl;
    if (csvUrl.includes('github.com') && csvUrl.includes('/blob/')) {
      actualCsvUrl = csvUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    
    console.log(`📥 Téléchargement du CSV depuis: ${actualCsvUrl}`);
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
    
    // Download CSV
    const response = await fetch(actualCsvUrl);
    if (!response.ok) {
      throw new Error(`Erreur téléchargement CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`📊 CSV téléchargé, taille: ${csvText.length} caractères`);
    
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
    
    for (const row of csvRows) {
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
        
        // Take first 3 numerical values as odds (common in betting CSVs)
        const oddsHome = potentialOddsKeys[0] ? row[potentialOddsKeys[0]] : '';
        const oddsDraw = potentialOddsKeys[1] ? row[potentialOddsKeys[1]] : '';  
        const oddsAway = potentialOddsKeys[2] ? row[potentialOddsKeys[2]] : '';
        
        // Fallback: if we have exactly 2 team names in the row, use them
        const teamValues = allKeys.filter(key => {
          const value = row[key];
          return value && typeof value === 'string' && value.length > 2 && 
                 !value.includes('.') && !value.match(/^\d/);
        }).slice(0, 2);
        
        const finalHomeTeam = homeTeam || (teamValues[0] ? row[teamValues[0]] : '');
        const finalAwayTeam = awayTeam || (teamValues[1] ? row[teamValues[1]] : '');
        const finalLeague = league || 'Unknown League';

        console.log(`🎯 Valeurs extraites:`, { 
          finalHomeTeam, finalAwayTeam, finalLeague, country, 
          oddsHome, oddsDraw, oddsAway,
          potentialOddsKeys 
        });

        // Be VERY lenient - accept if we have at least 2 team names
        if (!finalHomeTeam || !finalAwayTeam) {
          console.log(`⚠️ LIGNE REJETÉE - Pas assez d'équipes trouvées`);
          console.log(`   - Home: "${finalHomeTeam}"`);
          console.log(`   - Away: "${finalAwayTeam}"`);
          console.log(`   - Clés: ${Object.keys(row).join(', ')}`);
          continue;
        }
        
        const matchData = {
          match_date: uploadDate,
          league: finalLeague,
          home_team: finalHomeTeam,
          away_team: finalAwayTeam,
          country: country || null,
          kickoff_utc: new Date().toISOString(),
          kickoff_local: new Date().toISOString(),
          category: getCategoryFromLeague(finalLeague),
          
          // Default values for missing data - adapt to actual CSV structure
          p_home_fair: 0, // Not available in this CSV format
          p_draw_fair: 0,
          p_away_fair: 0,
          p_btts_yes_fair: 0,
          p_btts_no_fair: 0,
          p_over_2_5_fair: 0,
          p_under_2_5_fair: 0,
          
          // Default vigorish values
          vig_1x2: 0,
          vig_btts: 0,
          vig_ou_2_5: 0,
          
          // Default flags
          is_low_vig_1x2: false,
          watch_btts: (row['Odds_BTTS_Yes'] && parseFloat(row['Odds_BTTS_Yes']) > 0) || false,
          watch_over25: (row['Odds_Over25'] && parseFloat(row['Odds_Over25']) > 0) || false,
          
          // Odds from CSV (with fallbacks)
          odds_home: oddsHome ? parseFloat(oddsHome) : 2.0,
          odds_draw: oddsDraw ? parseFloat(oddsDraw) : 3.0, 
          odds_away: oddsAway ? parseFloat(oddsAway) : 2.5,
          odds_btts_yes: row['Odds_BTTS_Yes'] ? parseFloat(row['Odds_BTTS_Yes']) : null,
          odds_btts_no: row['Odds_BTTS_No'] ? parseFloat(row['Odds_BTTS_No']) : null,
          odds_over_2_5: row['Odds_Over25'] ? parseFloat(row['Odds_Over25']) : null,
          odds_under_2_5: row['Odds_Under25'] ? parseFloat(row['Odds_Under25']) : null,
        };
        
        processedMatches.push(matchData);
        
      } catch (error) {
        console.error(`❌ Erreur traitement ligne: ${row.home_team} vs ${row.away_team}:`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ ${processedMatches.length} matchs traités avec succès`);
    console.log(`❌ ${errorCount} erreurs de traitement`);
    
    // Bulk insert matches (preserving historical data - only update if same date)
    if (processedMatches.length > 0) {
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