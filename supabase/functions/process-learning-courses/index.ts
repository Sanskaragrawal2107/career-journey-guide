
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { fileUrl, resumeId } = await req.json()
    
    if (!fileUrl || !resumeId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters (fileUrl or resumeId)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing resume with ID: ${resumeId}, URL: ${fileUrl}`)
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Forward the PDF URL to the Make.com webhook
    console.log('Sending PDF to Make.com webhook for processing')
    const makeResponse = await fetch("https://hook.eu2.make.com/lb8ciads0w7jgqg9h1iiswzbzggshpd1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        fileUrl: fileUrl,
        resumeId: resumeId 
      }),
    })

    if (!makeResponse.ok) {
      const errorText = await makeResponse.text()
      console.error('Error from Make.com webhook:', errorText)
      throw new Error(`Make.com webhook failed: ${makeResponse.status} ${errorText}`)
    }

    console.log('Successfully sent request to Make.com webhook')

    return new Response(
      JSON.stringify({
        message: 'Resume sent to Make.com webhook for processing',
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing learning courses:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
