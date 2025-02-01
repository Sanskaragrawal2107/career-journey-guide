import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
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
        .select("id, career_paths(recommendations)")
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (resumes && resumes.length > 0 && resumes[0].career_paths?.length > 0) {
        setExistingResumeId(resumes[0].id);
      }
    } catch (error) {
      console.error("Error checking existing resumes:", error);
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    console.log('Getting signed URL for:', filePath);
    const { data, error } = await supabase.storage
      .from("resumes")
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      console.error('Failed to generate signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }

    console.log('Generated signed URL:', data.signedUrl);
    return data.signedUrl;
  };

  const verifyFileAccess = async (filePath: string): Promise<string> => {
    console.log('Verifying file access for:', filePath);
    const signedUrl = await getSignedUrl(filePath);
    
    try {
      const response = await fetch(signedUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.error(`File not accessible, status: ${response.status}`);
        throw new Error(`File not accessible, status: ${response.status}`);
      }
      console.log('File verified accessible at:', signedUrl);
      return signedUrl;
    } catch (error) {
      console.error('Error verifying file access:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
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

      let signedUrl;
      try {
        console.log('Getting signed URL after upload');
        signedUrl = await verifyFileAccess(filePath);
        console.log('Verified signed URL:', signedUrl);
      } catch (error) {
        console.error('Error getting signed URL:', error);
        throw new Error('Failed to generate valid file URL');
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

      const { error: careerPathError } = await supabase
        .from("career_paths")
        .insert({
          user_id: user.id,
          resume_id: resumeData.id,
          recommendations: {},
          days_to_complete: days,
        });

      if (careerPathError) throw careerPathError;

      setProgress(90);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        "https://hook.eu2.make.com/hq2vblqddu8mdnr8cez7n51x9gh4x7fu",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: signedUrl,
            resumeId: resumeData.id,
            daysToComplete: days,
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Failed to process career path");

      setProgress(100);
      setExistingResumeId(resumeData.id);

      toast({
        title: "Success",
        description: "Career path is being generated. Please wait a moment.",
      });

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process career path",
        variant: "destructive",
      });
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  if (existingResumeId) {
    return <CareerPathProgress resumeId={existingResumeId} />;
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
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
            "Get Career Path"
          )}
        </Button>
        {loading && <Progress value={progress} className="w-full" />}
      </form>
    </Card>
  );
};