
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Info, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SkillGapResponse {
  skillGaps: string[];
}

export const FreeSkillGapAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [skillGaps, setSkillGaps] = useState<string[] | null>(null);
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
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate uploading
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(50);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProgress(80);
      
      // Demo data for free version
      const demoSkillGaps = [
        "React Native",
        "GraphQL",
        "Docker Containerization",
        "AWS Cloud Services",
        "CI/CD Pipeline Management"
      ];
      
      setSkillGaps(demoSkillGaps);
      
      toast({
        title: "Success",
        description: "Resume processed successfully. Check out your skill gaps below!",
      });
      
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
      setTimeout(() => setProgress(0), 500);
    }
  };

  const downloadResults = () => {
    if (!skillGaps) return;

    const csvContent = "data:text/csv;charset=utf-8," +
      "Skill Gaps\n" +
      skillGaps.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "skill_gaps_demo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6 space-x-2">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Free Skill Gap Analysis</h1>
        </div>
        
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-600/10 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2 bronze-text">Try our AI-powered Skill Gap Analysis</h2>
          <p className="text-gray-400">
            Upload your resume and get instant insights about which skills you should develop to advance your career.
            This free trial provides a sample of our full analysis available in the premium version.
          </p>
        </div>
        
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
              <TooltipProvider>
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
              </TooltipProvider>
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

            {skillGaps && skillGaps.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Your Skill Gap Analysis</h3>
                
                <Card className="p-4 bg-red-50 border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">Skills You Should Learn</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {skillGaps.map((skill, i) => (
                      <li key={i} className="text-sm">{skill}</li>
                    ))}
                  </ul>
                </Card>
                
                <div className="flex flex-col space-y-4">
                  <Button onClick={downloadResults} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download Skill Gap Analysis
                  </Button>
                  
                  <div className="text-center p-4 border border-dashed border-primary/20 rounded-lg">
                    <p className="mb-2 text-gray-500">Want more detailed analysis with learning resources?</p>
                    <Link to="/pricing">
                      <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700">
                        Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
