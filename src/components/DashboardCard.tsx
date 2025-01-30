import { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Configuration constants
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

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

  const ensureProfileExists = async (userId: string, userEmail: string) => {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select()
      .eq('id', userId)
      .single();

    if (!profile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, email: userEmail });
      if (insertError) throw new Error('Profile creation failed');
    } else if (fetchError?.code !== 'PGRST116') {
      throw fetchError;
    }
  };

  const verifyFileAccess = async (filePath: string): Promise<string> => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Generate fresh signed URL each attempt
        const { data: signedUrlData, error } = await supabase.storage
          .from("resumes")
          .createSignedUrl(filePath, 1800); // 30 minutes expiration

        if (error || !signedUrlData?.signedUrl) {
          throw error || new Error('Signed URL generation failed');
        }

        // Verify URL accessibility
        const response = await fetch(signedUrlData.signedUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log(`File verified on attempt ${attempt + 1}`);
          return signedUrlData.signedUrl;
        }
        
        console.log(`Attempt ${attempt + 1}: URL not accessible (Status: ${response.status})`);
      } catch (error) {
        console.log(`Attempt ${attempt + 1} failed:`, error.message);
      }

      // Wait before next attempt
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
    throw new Error('File verification failed after multiple attempts');
  };

  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      toast({ title: "Error", description: "Please upload a valid PDF file", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error("Authentication required");

      // Ensure user profile exists
      await ensureProfileExists(user.id, user.email || '');

      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);
      if (uploadError) throw new Error("File upload failed");

      // Create database record
      const { data: resumeData, error: dbError } = await supabase
        .from("resumes")
        .insert({ file_path: filePath, user_id: user.id })
        .select()
        .single();
      if (dbError || !resumeData) throw new Error("Database record creation failed");

      // Verify file access with retries
      const verifiedUrl = await verifyFileAccess(filePath);

      // Send to Make.com webhook
      const makeResponse = await fetch(
        "https://hook.eu2.make.com/mbwx1e992a7xe5j3aur164vyb63pfji3",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            fileUrl: verifiedUrl,
            resumeId: resumeData.id,
            userId: user.id
          }),
        }
      );

      if (!makeResponse.ok) {
        throw new Error("Make.com integration failed");
      }

      toast({
        title: "Success!",
        description: "Resume uploaded and processing started successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (loading || isProcessing) return;
    acceptFile ? fileInputRef.current?.click() : onClick();
  };

  return (
    <>
      <Card
        className={cn(
          "p-6 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
          (loading || isProcessing) && "opacity-70 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-primary-50 rounded-lg">
            {loading || isProcessing ? (
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
