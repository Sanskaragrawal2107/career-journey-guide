import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  isProcessing?: boolean;
  acceptFile?: boolean;
}

export const DashboardCard = ({
  title,
  description,
  icon,
  onClick,
  className,
  isProcessing = false,
  acceptFile = false,
}: DashboardCardProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setLoading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, file);

      if (uploadError) {
        throw new Error("Failed to upload file to storage");
      }

      // Generate a Signed URL valid for 2 minutes
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(fileName, 120); // 120 seconds = 2 minutes

      if (signedUrlError || !signedUrlData) {
        throw new Error("Failed to generate Signed URL");
      }

      const signedUrl = signedUrlData.signedUrl;

      // Send the Signed URL to Make.com
      const response = await fetch(
        "https://hook.eu2.make.com/mbwx1e992a7xe5j3aur164vyb63pfji3",
        {
          method: "POST",
          body: JSON.stringify({ fileUrl: signedUrl }),
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to process resume via Make.com");
      }

      toast({
        title: "Success",
        description: "Resume uploaded successfully. Check the Previous Resumes section once optimization is complete.",
      });
    } catch (error) {
      console.error("Error uploading resume:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (loading) return;

    if (title === "Create New Resume" && acceptFile) {
      fileInputRef.current?.click();
    } else {
      onClick();
    }
  };

  return (
    <>
      <Card
        className={cn(
          "p-6 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-primary-50 rounded-lg">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : title === "Create New Resume" ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              icon
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
        </div>
      </Card>
      {acceptFile && (
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      )}
    </>
  );
};