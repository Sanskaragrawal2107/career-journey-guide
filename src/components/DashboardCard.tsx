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
  routeNumber?: number | null;
}

export const DashboardCard = ({
  title,
  description,
  icon,
  onClick,
  className,
  isProcessing = false,
  acceptFile = false,
  routeNumber = null,
}: DashboardCardProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ensureProfileExists = async (userId: string, userEmail: string) => {
    // Check if profile exists
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select()
      .eq('id', userId)
      .single();

    if (!profile) {
      // Create profile if it doesn't exist
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
        });

      if (insertError) throw new Error('Failed to create profile');
    } else if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is expected if profile doesn't exist
      throw fetchError;
    }
  };

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
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Ensure profile exists before proceeding
      await ensureProfileExists(user.id, user.email || '');

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

      // Generate a Signed URL valid for 2 minutes
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 120); // 120 seconds = 2 minutes

      if (signedUrlError || !signedUrlData) {
        throw new Error("Failed to generate Signed URL");
      }

      const signedUrl = signedUrlData.signedUrl;

      // Send both the Signed URL, resume ID, and route number to Make.com
      const response = await fetch(
        "https://hook.eu2.make.com/mbwx1e992a7xe5j3aur164vyb63pfji3",
        {
          method: "POST",
          body: JSON.stringify({ 
            fileUrl: signedUrl,
            resumeId: resumeData.id,
            routeNumber: routeNumber || 1 // Default to 1 for file upload
          }),
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
    } else if (routeNumber && title !== "Previous Resumes" && title !== "Learning Courses") {
      // Send request to Make.com for non-file actions
      fetch("https://hook.eu2.make.com/mbwx1e992a7xe5j3aur164vyb63pfji3", {
        method: "POST",
        body: JSON.stringify({ routeNumber }),
        headers: { "Content-Type": "application/json" },
      });
      onClick();
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