import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COUNTRIES = [
  "gb",
  "us",
  "ca",
  "de",
  "fr",
  "in",
  "it",
  "nl",
  "pl",
  "ru",
  "sg",
]; // Supported Adzuna countries

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received request to process job match");
    
    // Parse the incoming webhook data
    const { jobTitle, skills } = await req.json();
    console.log("Received job data:", { jobTitle, skills });

    if (!jobTitle) {
      console.error("Missing required field: jobTitle");
      throw new Error("Missing required field: jobTitle is required");
    }

    // Fetch jobs from all supported countries
    let allJobs: any[] = [];
    const appId = Deno.env.get("ADZUNA_APP_ID");
    const apiKey = Deno.env.get("ADZUNA_API_KEY");

    for (const country of COUNTRIES) {
      try {
        // Increased results_per_page to 20 to get more jobs per country
        const apiUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${apiKey}&results_per_page=20&what=${encodeURIComponent(jobTitle)}&content-type=application/json`;
        console.log(`Calling Adzuna API for country ${country}:`, apiUrl);

        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          allJobs = [...allJobs, ...data.results];
          console.log(`Found ${data.results.length} jobs in ${country}`);
        } else {
          console.warn(`Failed to fetch jobs for ${country}:`, response.status);
        }
      } catch (error) {
        console.error(`Error fetching jobs for ${country}:`, error);
        // Continue with other countries even if one fails
        continue;
      }
    }

    console.log("Total jobs found across all countries:", allJobs.length);

    // Process and format job matches
    const matches = allJobs.map((job: any) => ({
      title: job.title,
      company: job.company.display_name,
      location: job.location.area ? job.location.area.join(", ") : job.location.display_name,
      description: job.description,
      url: job.redirect_url,
      match_score: calculateMatchScore(job.description, job.title, jobTitle, skills || []),
    }));

    // Filter out jobs with a match score below 75%, sort descending, and take top 100
    const topMatches = matches
      .filter((job) => job.match_score >= 75)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 100);

    console.log("Processed matches:", topMatches.length);

    const finalResponse = new Response(JSON.stringify(topMatches), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
    console.log("Sending response back to client");
    return finalResponse;
  } catch (error: any) {
    console.error("Error processing job match:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});

function calculateMatchScore(
  jobDescription: string,
  jobTitle: string,
  searchedTitle: string,
  skills: string[]
): number {
  // Convert all text to lowercase for better matching
  const description = jobDescription.toLowerCase();
  const actualTitle = jobTitle.toLowerCase();
  const searchTitle = searchedTitle.toLowerCase();

  // Calculate title similarity (30% of score)
  const searchTitleWords = searchTitle.split(" ").filter((word) => word.length > 0);
  const titleMatches = searchTitleWords.filter((word) =>
    actualTitle.includes(word)
  ).length;
  const titleScore = (titleMatches / searchTitleWords.length) * 30;

  // Calculate skills match (40% of score)
  let skillsScore = 0;
  if (skills.length > 0) {
    const lowerSkills = skills.map((skill) => skill.toLowerCase());
    const skillMatches = lowerSkills.filter((skill) =>
      description.includes(skill)
    ).length;
    skillsScore = (skillMatches / skills.length) * 40;
  }

  // Calculate description relevance (30% of score)
  const descriptionMatches = searchTitleWords.filter((word) =>
    description.includes(word)
  ).length;
  const descriptionScore = (descriptionMatches / searchTitleWords.length) * 30;

  // Combine scores and ensure maximum is 100
  const totalScore = Math.min(100, titleScore + skillsScore + descriptionScore);
  return Math.round(totalScore);
}
