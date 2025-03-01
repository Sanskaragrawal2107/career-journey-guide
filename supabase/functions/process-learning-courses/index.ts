
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
    
    // Step 1: Forward the PDF URL to the Make.com webhook
    console.log('Sending PDF to Make.com webhook for processing')
    const makeResponse = await fetch("https://hook.eu2.make.com/jicw1ich9q4hds3fqvy1fit0khzb9zsj", {
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

    // Parse the Make.com response which contains extracted data
    const makeData = await makeResponse.json()
    console.log('Received data from Make.com:', JSON.stringify(makeData))
    
    // Step 2: Call Coursera API to search for courses
    const courseraCourses = await searchCourseraCourses(makeData)
    
    // Step 3: Store course recommendations in database
    if (courseraCourses && courseraCourses.length > 0) {
      const courseInserts = courseraCourses.map(course => ({
        resume_id: resumeId,
        title: course.name,
        description: course.description,
        url: course.courseUrl,
        instructor: course.instructors?.[0]?.name || null,
        skill_tags: course.skills || []
      }))
      
      const { error: insertError } = await supabase
        .from('coursera_recommendations')
        .upsert(courseInserts)
      
      if (insertError) {
        console.error('Error storing course recommendations:', insertError)
        throw new Error(`Failed to store course recommendations: ${insertError.message}`)
      }
      
      console.log(`Successfully stored ${courseraCourses.length} course recommendations`)
    } else {
      console.log('No courses found or empty response from Coursera API')
    }

    return new Response(
      JSON.stringify({
        message: 'Resume processed and courses recommended successfully',
        courseCount: courseraCourses?.length || 0
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

async function searchCourseraCourses(resumeData: any) {
  try {
    console.log('Searching Coursera courses based on resume data')
    
    const apiKey = Deno.env.get('COURSERA_API_KEY')
    if (!apiKey) {
      throw new Error('Coursera API key not configured')
    }
    
    // Extract skills and job title from resume data
    const skills = resumeData.skills || []
    const jobTitle = resumeData.jobTitle || ''
    
    if (!skills.length && !jobTitle) {
      throw new Error('Resume data contains no skills or job title')
    }
    
    // Prepare search query - combine job title with top skills
    const searchTerms = [jobTitle, ...skills.slice(0, 3)].filter(Boolean)
    const query = searchTerms.join(' ')
    
    console.log(`Searching Coursera for: ${query}`)
    
    // Call Coursera API
    const response = await fetch(`https://api.coursera.org/api/courses.v1?q=search&query=${encodeURIComponent(query)}&fields=name,description,instructors,skills&includes=instructors,skills`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Coursera API error: ${response.status} ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`Found ${data.elements?.length || 0} courses from Coursera`)
    
    // Format and return courses (limit to top 10 results)
    return (data.elements || []).slice(0, 10).map((course: any) => ({
      name: course.name,
      description: course.description,
      courseUrl: `https://www.coursera.org/learn/${course.slug}`,
      instructors: course.instructors?.map((inst: any) => ({
        name: inst.fullName,
      })),
      skills: course.skills?.map((skill: any) => skill.name) || []
    }))
  } catch (error) {
    console.error('Error searching Coursera courses:', error)
    return []
  }
}
