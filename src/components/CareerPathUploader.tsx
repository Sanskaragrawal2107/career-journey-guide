import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";
import { CareerPathProgress } from "./CareerPathProgress";

export const CareerPathUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [existingResumeId, setExistingResumeId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkExistingResumes();
  }, []);

  const checkExistingResumes = async () => {
    try {
      const { data: resumes, error } = await supabase
        .from("resumes")
        .select(`
          id,
          career_paths (
            recommendations
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (resumes && resumes.length > 0) {
        console.log("Found existing resume:", resumes[0]);
        const careerPath = resumes[0].career_paths?.[0];
        if (careerPath?.recommendations) {
          setExistingResumeId(resumes[0].id);
        }
      }
    } catch (error) {
      console.error("Error checking existing resumes:", error);
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select()
        .eq("id", user.id)
        .single();

      if (!profile) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
          });

        if (insertError) throw new Error("Failed to create profile");
      } else if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

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

      const { data: resumeData, error: resumeError } = await supabase
        .from("resumes")
        .insert({
          file_path: filePath,
          user_id: user.id,
        })
        .select()
        .single();

      if (resumeError || !resumeData) throw new Error("Failed to create resume record");

      const { data: careerPathData, error: careerPathError } = await supabase
        .from("career_paths")
        .insert({
          user_id: user.id,
          resume_id: resumeData.id,
          recommendations: { recommendations: { days: [] } },
          days_to_complete: days,
        })
        .select()
        .single();

      if (careerPathError || !careerPathData) throw careerPathError;

      setProgress(90);

      try {
        const response = await fetch(
          "https://hook.eu2.make.com/hq2vblqddu8mdnr8cez7n51x9gh4x7fu",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileUrl: signedUrlData.signedUrl,
              resumeId: resumeData.id,
              careerPathId: careerPathData.id,
              daysToComplete: days,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to process career path");
        }

        try {
          const makeResponse = await response.json();
          console.log('Response from Make.com:', makeResponse);

          if (makeResponse.days) {
            const recommendations = {
              recommendations: {
                days: makeResponse.days
              }
            };
            
            console.log('Updating career path with recommendations for ID:', careerPathData.id);
            const { error: updateError } = await supabase
              .from("career_paths")
              .update({ recommendations })
              .eq('id', careerPathData.id);

            if (updateError) {
              console.error('Error updating recommendations:', updateError);
              throw new Error('Failed to update recommendations');
            }
            console.log('Successfully updated career path recommendations');
          
          setExistingResumeId(resumeData.id);
        } else {
          console.warn('No recommendations found in Make.com response');
        }
      } catch (error) {
        console.error('Error processing Make.com response:', error);
        throw new Error('Failed to process Make.com response');
      }

      setProgress(100);
      toast({
        title: "Processing",
        description: "Your career path is being generated. Please wait a moment.",
      });

    } catch (error) {
      console.error('Error in verification or webhook process:', error);
      toast({
        title: "Processing",
        description: "Your request is being processed. Please wait a moment.",
      });
    }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Processing",
        description: "Your request is being processed. Please wait a moment.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (existingResumeId) {
    return <CareerPathProgress resumeId={existingResumeId} />;
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleUpload} className="space-y-6">
        <div>
          <Label htmlFor="resume">Upload Resume (PDF)</Label>
          <Input
            id="resume"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="days">Days to Complete</Label>
          <Input
            id="days"
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
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
              Get Career Path
            </>
          )}
        </Button>
        {loading && <Progress value={progress} className="w-full" />}
      </form>
    </Card>
  );
};