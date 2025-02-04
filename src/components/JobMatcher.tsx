import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Download } from "lucide-react";

export const JobMatcher = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matchedJobs, setMatchedJobs] = useState<any[] | null>(null);
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

      // Replace with your Make.com webhook URL for job matching
      const response = await fetch(
        "YOUR_MAKE_WEBHOOK_URL_FOR_JOB_MATCHING",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: signedUrlData.signedUrl,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to process job matching");
      }

      const jobs = await response.json();
      setMatchedJobs(jobs);
      setProgress(100);

      toast({
        title: "Success",
        description: "Job matches found! You can now download the results.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to process job matching",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadResults = () => {
    if (!matchedJobs) return;

    const csvContent = "data:text/csv;charset=utf-8," + 
      "Job Title,Company,Location,Match Score\n" +
      matchedJobs.map(job => 
        `${job.title},${job.company},${job.location},${job.match_score}`
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
          <Button onClick={downloadResults} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Matches CSV
          </Button>
        )}
      </form>
    </Card>
  );
};