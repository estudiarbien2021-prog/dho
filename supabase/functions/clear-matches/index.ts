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

    console.log('🗑️ Suppression de tous les matchs du dashboard...')

    // Supprimer tous les matchs
    const { data: deletedMatches, error: matchDeleteError } = await supabaseClient
      .from('matches')
      .delete()
      .neq('id', 'non-existent-id') // Supprimer tous les matchs
      .select('id')

    if (matchDeleteError) {
      throw matchDeleteError
    }

    const deletedCount = deletedMatches?.length || 0
    console.log(`✅ ${deletedCount} matchs supprimés du dashboard`)

    // Aussi vider la table match_uploads
    const { error: uploadDeleteError } = await supabaseClient
      .from('match_uploads')
      .delete()
      .neq('id', 'non-existent-id') // Supprimer tous les uploads

    if (uploadDeleteError) {
      console.error('❌ Erreur suppression uploads:', uploadDeleteError)
      // Ne pas échouer si erreur sur les uploads
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedMatches: deletedCount,
        message: `Dashboard vidé: ${deletedCount} matchs supprimés`
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