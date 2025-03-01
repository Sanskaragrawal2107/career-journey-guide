
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
    const requestData = await req.json()
    const { fileUrl, resumeId, searchTerm } = requestData
    
    console.log('Request received:', requestData)
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    if (searchTerm) {
      console.log(`Processing search request for term: ${searchTerm}`)
      
      // Forward the search term to the Make.com webhook
      const makeResponse = await fetch("https://hook.eu2.make.com/lb8ciads0w7jgqg9h1iiswzbzggshpd1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          searchTerm: searchTerm,
          resumeId: resumeId 
        }),
      })

      if (!makeResponse.ok) {
        const errorText = await makeResponse.text()
        console.error('Error from Make.com webhook:', errorText)
        throw new Error(`Make.com webhook failed: ${makeResponse.status} ${errorText}`)
      }

      // Get the response from Make.com which should contain course search results
      const makeData = await makeResponse.json()
      console.log('Response from Make.com webhook:', makeData)
      
      return new Response(
        JSON.stringify(makeData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    else if (fileUrl && resumeId) {
      console.log(`Processing resume with ID: ${resumeId}, URL: ${fileUrl}`)
      
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

      // Get the response from Make.com which should contain the suggested title
      const makeData = await makeResponse.json()
      console.log('Response from Make.com webhook:', makeData)

      // Return the Make.com response with the suggested title
      return new Response(
        JSON.stringify(makeData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters (fileUrl and resumeId or searchTerm)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
  } catch (error) {
    console.error('Error processing learning courses:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
