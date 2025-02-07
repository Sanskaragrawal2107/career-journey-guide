
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download } from "lucide-react";
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
  url: string;
  match_score: number;
}

interface JobMatchRequest {
  jobTitle: string;
  skills: string[];
}

export const JobMatcher = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matchedJobs, setMatchedJobs] = useState<JobMatch[] | null>(null);
  const { toast } = useToast();

  // This function will be triggered by the webhook from Make.com
  const processJobMatch = async (jobData: JobMatchRequest) => {
    setLoading(true);
    setProgress(10);
    setMatchedJobs(null);

    try {
      console.log('Processing job match with data:', jobData);
      
      const { data: jobMatches, error } = await supabase.functions.invoke('process-job-match', {
        method: 'POST',
        body: jobData
      });

      if (error) {
        console.error("Error processing job match:", error);
        throw error;
      }

      setProgress(100);
      setMatchedJobs(jobMatches);
      toast({
        title: "Success",
        description: `Found matching jobs for ${jobData.jobTitle}`,
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
      "Job Title,Company,Location,Match Score,URL\n" +
      matchedJobs.map(job => 
        `"${job.title}","${job.company}","${job.location}",${job.match_score},"${job.url}"`
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
      <div className="space-y-6">
        {loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        
        {matchedJobs && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchedJobs.map((job, index) => (
                  <TableRow key={index}>
                    <TableCell>{job.title}</TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {job.description}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {job.match_score}%
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
      </div>
    </Card>
  );
};
