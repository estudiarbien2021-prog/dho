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

    const { uploadIds } = await req.json()

    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      throw new Error('IDs des uploads requis')
    }

    console.log('🗑️ Suppression des uploads:', uploadIds)

    // D'abord récupérer les informations des uploads à supprimer
    const { data: uploadsToDelete, error: fetchError } = await supabaseClient
      .from('match_uploads')
      .select('upload_date, filename')
      .in('id', uploadIds)

    if (fetchError) {
      throw fetchError
    }

    console.log('📅 Uploads à supprimer:', uploadsToDelete)

    // Supprimer les matchs correspondants
    let totalMatchesDeleted = 0
    for (const upload of uploadsToDelete) {
      const { data: deletedMatches, error: matchDeleteError } = await supabaseClient
        .from('matches')
        .delete()
        .eq('match_date', upload.upload_date)
        .select('id')

      if (matchDeleteError) {
        console.error('❌ Erreur suppression matchs:', matchDeleteError)
        throw matchDeleteError
      }

      console.log(`🗑️ ${deletedMatches?.length || 0} matchs supprimés pour le ${upload.upload_date}`)
      totalMatchesDeleted += deletedMatches?.length || 0
    }

    // Supprimer les entrées match_uploads
    const { error: deleteError } = await supabaseClient
      .from('match_uploads')
      .delete()
      .in('id', uploadIds)

    if (deleteError) {
      throw deleteError
    }

    console.log('✅ Uploads et matchs supprimés avec succès')

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: uploadIds.length,
        deletedMatches: totalMatchesDeleted,
        message: `${uploadIds.length} upload(s) et ${totalMatchesDeleted} match(s) supprimé(s) avec succès`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erreur suppression uploads:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Erreur lors de la suppression des uploads'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})