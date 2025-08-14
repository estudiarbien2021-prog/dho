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

    // Supprimer les entrées match_uploads
    const { error: deleteError } = await supabaseClient
      .from('match_uploads')
      .delete()
      .in('id', uploadIds)

    if (deleteError) {
      throw deleteError
    }

    console.log('✅ Uploads supprimés avec succès')

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: uploadIds.length,
        message: `${uploadIds.length} upload(s) supprimé(s) avec succès`
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