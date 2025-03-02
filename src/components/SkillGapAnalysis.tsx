
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SkillGap {
  current_skills: string[];
  missing_skills: string[];
  recommended_skills: string[];
}

export const SkillGapAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skillGap, setSkillGap] = useState<SkillGap | null>(null);
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

      console.log("Sending PDF URL to Make.com webhook");
      // Send to Make.com webhook and wait for response
      const makeResponse = await fetch("https://hook.eu2.make.com/lb8ciads0w7jgqg9h1iiswzbzggshpd1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: signedUrl }),
      });

      if (!makeResponse.ok) {
        throw new Error("Failed to process resume");
      }

      // Parse the JSON response from Make.com
      const skillGapData: SkillGap = await makeResponse.json();
      console.log("Received skill gap data:", skillGapData);
      setSkillGap(skillGapData);

      setProgress(80);
      toast({
        title: "Success",
        description: "Resume processed successfully. Check out your skill gaps below!",
      });

      // Delete the file after processing
      await supabase.storage
        .from('job_pdfs')
        .remove([filePath]);

      setProgress(100);
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const downloadResults = () => {
    if (!skillGap) return;

    const csvContent = "data:text/csv;charset=utf-8," +
      "Current Skills,Missing Skills,Recommended Skills\n" +
      skillGap.current_skills.join(", ") + "," +
      skillGap.missing_skills.join(", ") + "," +
      skillGap.recommended_skills.join(", ");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "skill_gaps.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={loading}
              className="max-w-sm"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-4">
              <div className="space-y-2">
                <p className="font-medium">How to download your LinkedIn resume:</p>
                <ol className="list-decimal pl-4 text-sm space-y-1">
                  <li>Go to your LinkedIn profile</li>
                  <li>Click on "More..." button below your profile header</li>
                  <li>Select "Save to PDF"</li>
                  <li>Upload the downloaded PDF here for better skill analysis</li>
                </ol>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-yellow-800 text-sm flex items-center">
            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
            For best results, upload your LinkedIn resume. It contains structured skill information that improves analysis accuracy.
          </p>
        </div>

        {loading && progress > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500 text-center">
              Processing your resume...
            </p>
          </div>
        )}

        {skillGap && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Skill Gap Analysis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-green-50 border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Current Skills</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {skillGap.current_skills.map((skill, i) => (
                    <li key={i} className="text-sm">{skill}</li>
                  ))}
                </ul>
              </Card>
              
              <Card className="p-4 bg-red-50 border-red-200">
                <h4 className="font-medium text-red-800 mb-2">Missing Skills</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {skillGap.missing_skills.map((skill, i) => (
                    <li key={i} className="text-sm">{skill}</li>
                  ))}
                </ul>
              </Card>
              
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Recommended Skills</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {skillGap.recommended_skills.map((skill, i) => (
                    <li key={i} className="text-sm">{skill}</li>
                  ))}
                </ul>
              </Card>
            </div>
            
            <Button onClick={downloadResults} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Skill Gap Analysis
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
