import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface CareerPathUploaderProps {
  resumeId: string;
}

export function CareerPathUploader({ resumeId }: CareerPathUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState("30");
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(Number(days)) || Number(days) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of days",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error("Failed to upload file to storage");
      }

      // Generate a Signed URL valid for 2 minutes
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 120);

      if (signedUrlError || !signedUrlData) {
        throw new Error("Failed to generate Signed URL");
      }

      console.log("Sending to webhook:", {
        fileUrl: signedUrlData.signedUrl,
        resumeId: resumeId,
        daysToComplete: Number(days)
      });

      // Send the Signed URL to Make.com
      const response = await fetch(
        "https://hook.eu2.make.com/mbwx1e992a7xe5j3aur164vyb63pfji3",
        {
          method: "POST",
          body: JSON.stringify({ 
            fileUrl: signedUrlData.signedUrl,
            resumeId: resumeId,
            daysToComplete: Number(days)
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to process resume via Make.com");
      }

      toast({
        title: "Success",
        description: "Career path will be generated shortly.",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">No career path available yet</h3>
        <p className="text-gray-500">Upload your resume to generate a personalized career path</p>
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-xs">
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Number of days"
              min="1"
              className="text-center"
            />
          </div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <label htmlFor="file-upload">
            <Button
              disabled={loading}
              className="cursor-pointer flex items-center gap-2"
              asChild
            >
              <span>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload Resume
              </span>
            </Button>
          </label>
        </div>
      </div>
    </Card>
  );
}