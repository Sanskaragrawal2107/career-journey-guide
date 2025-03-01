
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

    // Get the response from Make.com which should contain course recommendations
    const makeData = await makeResponse.json()
    console.log('Response from Make.com webhook:', makeData)

    // Check if the Make.com response contains course recommendations
    if (makeData && makeData.courses && Array.isArray(makeData.courses)) {
      // Store each course recommendation in the database
      for (const course of makeData.courses) {
        try {
          const { error: insertError } = await supabase
            .from('coursera_recommendations')
            .insert({
              resume_id: resumeId,
              title: course.title || 'Untitled Course',
              description: course.description || '',
              url: course.url || '#',
              instructor: course.instructor || null,
              skill_tags: Array.isArray(course.skill_tags) ? course.skill_tags : []
            })

          if (insertError) {
            console.error('Error inserting course recommendation:', insertError)
          } else {
            console.log('Successfully inserted course recommendation')
          }
        } catch (error) {
          console.error('Exception when inserting course recommendation:', error)
        }
      }
    } else {
      console.log('No courses found in Make.com response or invalid format')
    }

    return new Response(
      JSON.stringify({
        message: 'Resume processed and course recommendations stored',
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
