import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to process job match');
    
    // Parse the incoming webhook data
    const { jobTitle, skills } = await req.json();
    console.log('Received job data:', { jobTitle, skills });

    if (!jobTitle) {
      console.error('Missing required field: jobTitle');
      throw new Error('Missing required field: jobTitle is required');
    }

    // Call Adzuna API to search for matching jobs
    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${Deno.env.get('ADZUNA_APP_ID')}&app_key=${Deno.env.get('ADZUNA_API_KEY')}&results_per_page=10&what=${encodeURIComponent(jobTitle)}&content-type=application/json`
    );

    if (!response.ok) {
      console.error('Adzuna API error:', response.status);
      throw new Error('Failed to fetch jobs from Adzuna');
    }

    const data = await response.json();
    console.log('Found jobs:', data.results.length);

    // Process and format job matches
    const matches = data.results.map((job: any) => ({
      title: job.title,
      company: job.company.display_name,
      location: `${job.location.area.join(", ")}`,
      description: job.description,
      url: job.redirect_url,
      match_score: calculateMatchScore(job.description, job.title, jobTitle, skills || []),
    }));

    console.log('Processed matches:', matches.length);
    return new Response(JSON.stringify(matches), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing job match:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

function calculateMatchScore(jobDescription: string, jobTitle: string, searchedTitle: string, skills: string[]): number {
  // Convert all text to lowercase for better matching
  const description = jobDescription.toLowerCase();
  const actualTitle = jobTitle.toLowerCase();
  const searchTitle = searchedTitle.toLowerCase();

  // Calculate title similarity (30% of score)
  const titleScore = searchTitle.split(' ').filter(word => 
    actualTitle.includes(word)
  ).length / searchTitle.split(' ').length * 30;

  // Calculate skills match (40% of score)
  const skillsScore = skills.length > 0 ? 
    skills.filter(skill => 
      description.includes(skill.toLowerCase())
    ).length / skills.length * 40 : 40;

  // Calculate description relevance (30% of score)
  const searchTerms = searchTitle.split(' ');
  const descriptionScore = searchTerms.filter(term => 
    description.includes(term)
  ).length / searchTerms.length * 30;

  // Combine scores and ensure minimum 85%
  const totalScore = Math.max(85, Math.min(100, titleScore + skillsScore + descriptionScore));
  return Math.round(totalScore);
}