
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
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

export const JobMatcher = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matchedJobs, setMatchedJobs] = useState<JobMatch[] | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setProgress(20);

      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload file to Supabase
      const fileName = `${crypto.randomUUID()}.pdf`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('job_pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setProgress(40);

      // Get signed URL
      const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
        .from('job_pdfs')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (signedUrlError || !signedUrl) throw new Error("Failed to generate signed URL");

      setProgress(60);

      // Send to Make.com webhook
      const makeResponse = await fetch("https://hook.eu2.make.com/lb8ciads0w7jgqg9h1iiswzbzggshpd1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: signedUrl }),
      });

      if (!makeResponse.ok) {
        throw new Error("Failed to process resume");
      }

      setProgress(80);
      toast({
        title: "Success",
        description: "Resume uploaded and being processed. Results will appear shortly.",
      });

      // Delete the file after sending to Make.com
      await supabase.storage
        .from('job_pdfs')
        .remove([filePath]);

      setProgress(100);
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(0);
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
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading}
            className="max-w-sm"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {loading && progress > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500 text-center">
              Processing your resume...
            </p>
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
