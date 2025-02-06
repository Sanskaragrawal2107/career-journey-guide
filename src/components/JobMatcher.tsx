import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

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
    setIsProcessing(true);

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

      // Create resume record in database
      const { data: resumeData, error: dbError } = await supabase
        .from("resumes")
        .insert({
          file_path: filePath,
          user_id: user.id,
        })
        .select()
        .single();

      if (dbError || !resumeData) {
        throw new Error("Failed to create resume record");
      }

      // Call Make.com webhook with the signed URL and resume ID
      const makeResponse = await fetch(
        "https://hook.eu2.make.com/lb8ciads0w7jgqg9h1iiswzbzggshpd1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: signedUrlData.signedUrl,
            resumeId: resumeData.id
          }),
        }
      );

      if (!makeResponse.ok) {
        const errorData = await makeResponse.text();
        console.error("Make.com webhook error:", errorData);
        throw new Error("Failed to process resume");
      }

      setProgress(85);
      
      toast({
        title: "Processing",
        description: "Your resume is being analyzed. Results will appear shortly.",
      });

      // Poll for results from the process-job-match function
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const { data: jobMatches, error } = await supabase.functions.invoke('process-job-match', {
            method: 'POST',
            body: { resumeId: resumeData.id }
          });

          if (error) {
            console.error("Error polling for results:", error);
            throw error;
          }

          if (jobMatches && Array.isArray(jobMatches)) {
            clearInterval(pollInterval);
            setMatchedJobs(jobMatches);
            setIsProcessing(false);
            setProgress(100);
            toast({
              title: "Success",
              description: "Job matches found! You can now view the results.",
            });
          }
        } catch (error) {
          console.error("Error polling for results:", error);
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsProcessing(false);
          toast({
            title: "Processing taking longer than expected",
            description: "Please try refreshing the page in a few moments.",
            variant: "destructive",
          });
        }
      }, 1000);

    } catch (error) {
      console.error("Error:", error);
      setIsProcessing(false);
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
            disabled={loading || isProcessing}
          />
        </div>
        <Button type="submit" disabled={loading || isProcessing} className="w-full">
          {loading || isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isProcessing ? "Processing Resume..." : "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Find Matching Jobs
            </>
          )}
        </Button>
        {(loading || isProcessing) && <Progress value={progress} className="w-full" />}
        
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