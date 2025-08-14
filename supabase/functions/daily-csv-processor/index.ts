import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Daily CSV processor started...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Processing date: ${today}`);

    // Check if we already processed today
    const { data: existingUpload } = await supabase
      .from('match_uploads')
      .select('id, status')
      .eq('upload_date', today)
      .maybeSingle();

    if (existingUpload && existingUpload.status === 'completed') {
      console.log('✅ Matches already processed for today');
      return new Response(JSON.stringify({
        success: true,
        message: 'Matches already processed for today',
        uploadDate: today
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Configuration pour récupérer les CSV
    // Ces URL peuvent être configurées via des secrets Supabase ou des paramètres
    const csvSources = [
      {
        name: 'Primary CSV Source',
        url: Deno.env.get('PRIMARY_CSV_URL'), // Sera défini comme secret
        priority: 1
      },
      {
        name: 'Backup CSV Source',
        url: Deno.env.get('BACKUP_CSV_URL'), // Sera défini comme secret  
        priority: 2
      }
    ];

    let processedSuccessfully = false;
    let lastError = null;

    // Essayer chaque source CSV par ordre de priorité
    for (const source of csvSources.filter(s => s.url)) {
      try {
        console.log(`🔄 Trying source: ${source.name}`);
        
        // Call our existing process-matches-csv function
        const { data, error } = await supabase.functions.invoke('process-matches-csv', {
          body: {
            csvUrl: source.url,
            matchDate: today,
            filename: `daily-auto-${today}.csv`
          }
        });

        if (error) {
          throw error;
        }

        if (data.success) {
          console.log(`✅ Successfully processed CSV from ${source.name}`);
          console.log(`📊 Processed ${data.processedMatches} matches`);
          processedSuccessfully = true;
          
          return new Response(JSON.stringify({
            success: true,
            source: source.name,
            uploadDate: today,
            processedMatches: data.processedMatches,
            totalRows: data.totalRows,
            errors: data.errors || 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
      } catch (error) {
        console.error(`❌ Failed to process from ${source.name}:`, error);
        lastError = error;
        continue; // Try next source
      }
    }

    // Si aucune source n'a fonctionné
    if (!processedSuccessfully) {
      console.error('💥 All CSV sources failed');
      
      // Update upload record with error
      await supabase
        .from('match_uploads')
        .upsert({
          upload_date: today,
          filename: `daily-auto-${today}.csv`,
          status: 'error',
          error_message: `All sources failed. Last error: ${lastError?.message || 'Unknown error'}`,
          total_matches: 0,
          processed_matches: 0
        }, {
          onConflict: 'upload_date'
        });

      return new Response(JSON.stringify({
        success: false,
        error: 'All CSV sources failed',
        lastError: lastError?.message,
        uploadDate: today
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 Daily processor error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Cette fonction peut être appelée automatiquement avec pg_cron :
/*
SELECT cron.schedule(
  'daily-csv-processing',
  '0 8 * * *', -- Tous les jours à 8h UTC
  $$
  SELECT
    net.http_post(
        url:='https://dnasdyvakwsvngajpuds.supabase.co/functions/v1/daily-csv-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);
*/