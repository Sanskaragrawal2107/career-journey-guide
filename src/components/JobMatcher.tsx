import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JobMatch {
  title: string;
  company: string;
  location: string;
  description: string;
  salary_min: number;
  salary_max: number;
  url: string;
  match_score: number;
}

export const JobMatcher = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matchedJobs, setMatchedJobs] = useState<JobMatch[] | null>(null);
  const { toast } = useToast();

  const calculateMatchScore = (jobDescription: string, jobTitle: string, searchedTitle: string) => {
    // Convert all text to lowercase for better matching
    const description = jobDescription.toLowerCase();
    const actualTitle = jobTitle.toLowerCase();
    const searchTitle = searchedTitle.toLowerCase();

    // Calculate title similarity (50% of score)
    const titleScore = searchTitle.split(' ').filter(word => 
      actualTitle.includes(word)
    ).length / searchTitle.split(' ').length * 50;

    // Calculate description relevance (50% of score)
    const searchTerms = searchTitle.split(' ');
    const descriptionScore = searchTerms.filter(term => 
      description.includes(term)
    ).length / searchTerms.length * 50;

    // Combine scores and ensure minimum 85%
    const totalScore = Math.max(85, Math.min(100, titleScore + descriptionScore));
    return Math.round(totalScore);
  };

  const searchJobs = async (jobTitle: string) => {
    try {
      const response = await fetch(
        `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_API_KEY}&results_per_page=10&what=${encodeURIComponent(
          jobTitle
        )}&content-type=application/json`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await response.json();
      return data.results.map((job: any) => ({
        title: job.title,
        company: job.company.display_name,
        location: `${job.location.area.join(", ")}`,
        description: job.description,
        salary_min: job.salary_min || 0,
        salary_max: job.salary_max || 0,
        url: job.redirect_url,
        match_score: calculateMatchScore(job.description, job.title, jobTitle),
      }));
    } catch (error) {
      console.error("Error fetching jobs:", error);
      throw error;
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      setProgress(30);

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) throw new Error("Failed to upload file");

      setProgress(50);

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 120);

      if (signedUrlError || !signedUrlData) {
        throw new Error("Failed to generate signed URL");
      }

      setProgress(70);

      // Call Make.com webhook with the signed URL
      const makeResponse = await fetch(
        "https://hook.eu2.make.com/lb8ciads0w7jgqg9h1iiswzbzggshpd1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: signedUrlData.signedUrl,
          }),
        }
      );

      if (!makeResponse.ok) {
        throw new Error("Failed to extract job title");
      }

      const { jobTitle, skills } = await makeResponse.json();
      if (!jobTitle) {
        throw new Error("No job title extracted from resume");
      }

      console.log("Extracted job title:", jobTitle);
      console.log("Extracted skills:", skills);

      setProgress(85);

      // Search for matching jobs using Adzuna API
      const jobs = await searchJobs(jobTitle);
      
      // Sort jobs by match score in descending order
      const sortedJobs = jobs.sort((a, b) => b.match_score - a.match_score);
      setMatchedJobs(sortedJobs);
      
      setProgress(100);

      toast({
        title: "Success",
        description: "Job matches found! You can now download the results.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process job matching",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!matchedJobs) return;

    const csvContent = "data:text/csv;charset=utf-8," + 
      "Job Title,Company,Location,Match Score,Salary Range,URL\n" +
      matchedJobs.map(job => 
        `"${job.title}","${job.company}","${job.location}",${job.match_score},"${job.salary_min}-${job.salary_max}","${job.url}"`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "job_matches.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleUpload} className="space-y-6">
        <div>
          <Label htmlFor="resume">Upload Resume for Job Matching (PDF)</Label>
          <Input
            id="resume"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Find Matching Jobs
            </>
          )}
        </Button>
        {loading && <Progress value={progress} className="w-full" />}
        
        {matchedJobs && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Salary Range</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchedJobs.map((job, index) => (
                  <TableRow key={index}>
                    <TableCell>{job.title}</TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {job.match_score}%
                    </TableCell>
                    <TableCell>
                      £{job.salary_min.toLocaleString()} - £{job.salary_max.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(job.url, '_blank')}
                      >
                        View Job
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button onClick={downloadResults} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Matches CSV
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
};