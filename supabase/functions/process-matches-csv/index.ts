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
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
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
    
    console.log(`📥 Téléchargement du CSV depuis: ${csvUrl}`);
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
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Erreur téléchargement CSV: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(`📊 CSV téléchargé, taille: ${csvText.length} caractères`);
    
    // Parse CSV
    const csvRows = parseCSV(csvText);
    console.log(`🔍 ${csvRows.length} lignes trouvées dans le CSV`);
    
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
        // Skip rows with missing critical data
        if (!row.home_team || !row.away_team || !row.league || 
            !row.odds_1x2_home || !row.odds_1x2_draw || !row.odds_1x2_away) {
          console.log(`⚠️ Ligne ignorée - données manquantes: ${row.home_team} vs ${row.away_team}`);
          continue;
        }
        
        const matchData = {
          match_date: uploadDate,
          league: row.league,
          home_team: row.home_team,
          away_team: row.away_team,
          country: row.country || null,
          kickoff_utc: row.kickoff_utc ? new Date(row.kickoff_utc).toISOString() : new Date().toISOString(),
          kickoff_local: row.kickoff_sao_paulo ? new Date(row.kickoff_sao_paulo).toISOString() : new Date().toISOString(),
          category: getCategoryFromLeague(row.league),
          
          // Fair probabilities
          p_home_fair: parseFloat(row.p_home_fair || '0'),
          p_draw_fair: parseFloat(row.p_draw_fair || '0'),
          p_away_fair: parseFloat(row.p_away_fair || '0'),
          p_btts_yes_fair: parseFloat(row.p_btts_yes_fair || '0'),
          p_btts_no_fair: parseFloat(row.p_btts_no_fair || '0'),
          p_over_2_5_fair: parseFloat(row.p_over_2_5_fair || '0'),
          p_under_2_5_fair: parseFloat(row.p_under_2_5_fair || '0'),
          
          // Vigorish
          vig_1x2: parseFloat(row.vig_1x2 || '0'),
          vig_btts: parseFloat(row.vig_btts || '0'),
          vig_ou_2_5: parseFloat(row.vig_ou_2_5 || '0'),
          
          // Flags
          is_low_vig_1x2: row.is_low_vig_1x2 === 'True',
          watch_btts: row.watch_btts === 'True',
          watch_over25: row.watch_over25 === 'True',
          
          // Odds
          odds_home: parseFloat(row.odds_1x2_home),
          odds_draw: parseFloat(row.odds_1x2_draw),
          odds_away: parseFloat(row.odds_1x2_away),
          odds_btts_yes: row.odds_btts_yes ? parseFloat(row.odds_btts_yes) : null,
          odds_btts_no: row.odds_btts_no ? parseFloat(row.odds_btts_no) : null,
          odds_over_2_5: row.odds_over_2_5 ? parseFloat(row.odds_over_2_5) : null,
          odds_under_2_5: row.odds_under_2_5 ? parseFloat(row.odds_under_2_5) : null,
        };
        
        processedMatches.push(matchData);
        
      } catch (error) {
        console.error(`❌ Erreur traitement ligne: ${row.home_team} vs ${row.away_team}:`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ ${processedMatches.length} matchs traités avec succès`);
    console.log(`❌ ${errorCount} erreurs de traitement`);
    
    // Bulk insert matches (using upsert to handle duplicates)
    if (processedMatches.length > 0) {
      // Insert in batches of 100 to avoid timeouts
      const batchSize = 100;
      let totalInserted = 0;
      
      for (let i = 0; i < processedMatches.length; i += batchSize) {
        const batch = processedMatches.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('matches')
          .upsert(batch, {
            onConflict: 'match_date,league,home_team,away_team,kickoff_utc'
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