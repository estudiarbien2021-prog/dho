import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { targetDate } = await req.json()

    if (!targetDate) {
      throw new Error('Date cible requise')
    }

    console.log('🗑️ Suppression des matchs pour la date:', targetDate)

    // Supprimer les matchs pour cette date spécifique
    const { data: deletedMatches, error: matchDeleteError } = await supabaseClient
      .from('matches')
      .delete()
      .eq('match_date', targetDate)
      .select('id')

    if (matchDeleteError) {
      throw matchDeleteError
    }

    const deletedCount = deletedMatches?.length || 0
    console.log(`✅ ${deletedCount} matchs supprimés pour le ${targetDate}`)

    // Aussi supprimer les uploads correspondants à cette date
    const { error: uploadDeleteError } = await supabaseClient
      .from('match_uploads')
      .delete()
      .eq('upload_date', targetDate)

    if (uploadDeleteError) {
      console.error('❌ Erreur suppression uploads:', uploadDeleteError)
      // Ne pas échouer si erreur sur les uploads
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedMatches: deletedCount,
        targetDate: targetDate,
        message: `${deletedCount} matchs supprimés pour le ${targetDate}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erreur suppression matchs:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Erreur lors de la suppression des matchs'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})