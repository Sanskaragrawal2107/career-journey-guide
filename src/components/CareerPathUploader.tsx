import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function CareerPathUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create resume record
      const { data: resumeData, error: resumeError } = await supabase
        .from("resumes")
        .insert({
          file_path: filePath,
          user_id: user.id,
        })
        .select()
        .single();

      if (resumeError || !resumeData) throw resumeError;

      // Generate signed URL
      const { data: urlData, error: urlError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 120);

      if (urlError || !urlData) throw urlError;

      // Send to Make.com webhook
      const response = await fetch(
        "https://hook.eu2.make.com/hq2vblqddu8mdnr8cez7n51x9gh4x7fu",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: urlData.signedUrl,
            resumeId: resumeData.id,
            daysToComplete: days,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to process career path");

      toast({
        title: "Success",
        description: "Career path request submitted successfully",
      });

      // Start progress tracking
      setProgress(25);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 25;
        });
      }, 1000);

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process career path",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="resume">Upload Resume (PDF)</Label>
          <Input
            id="resume"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={loading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="days">Days to Complete</Label>
          <Input
            id="days"
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            disabled={loading}
          />
        </div>

        {progress > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500 text-center">
              Processing your career path...
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !file}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : progress === 100 ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Completed
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Get Career Path
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}