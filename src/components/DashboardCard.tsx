import { useState, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    console.log('Checking if profile exists for user:', userId);
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select()
      .eq('id', userId)
      .single();

    if (!profile) {
      console.log('Profile not found, creating new profile');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
        });

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        throw new Error('Failed to create profile');
      }
      console.log('Profile created successfully');
    } else if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError);
      throw fetchError;
    }
    console.log('Profile check completed');
  };

  const getSignedUrl = async (filePath: string): Promise<string> => {
    // Create signed URL with 1 hour expiration
    const { data, error } = await supabase.storage
      .from("resumes")
      .createSignedUrl(filePath, 3600);

    if (error || !data?.signedUrl) {
      throw new Error('Failed to generate signed URL');
    }

    return data.signedUrl;
  };

  const verifyFileAccess = async (filePath: string, retries = 3): Promise<string> => {
    console.log('Starting file verification process for path:', filePath);
    
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        // Wait between retries
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Get signed URL
        const signedUrl = await getSignedUrl(filePath);
        console.log('Generated signed URL, attempting verification...');

        // Verify URL is accessible
        const response = await fetch(signedUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`File not accessible, status: ${response.status}`);
        }

        console.log('File verified accessible');
        return signedUrl;
      } catch (error) {
        console.log(`Attempt ${i + 1} failed:`, error);
        lastError = error;
        continue;
      }
    }
    
    throw lastError || new Error('Failed to verify file access');
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
      console.log('Starting file upload process');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      console.log('User authenticated, ensuring profile exists');
      await ensureProfileExists(user.id, user.email || '');

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      // Upload file
      console.log('Uploading file to storage:', filePath);
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error("Failed to upload file to storage");
      }
      console.log('File uploaded successfully');

      // Create database record
      console.log('Creating resume record in database');
      const { data: resumeData, error: dbError } = await supabase
        .from("resumes")
        .insert({
          file_path: filePath,
          user_id: user.id,
        })
        .select()
        .single();

      if (dbError || !resumeData) {
        console.error('Database error:', dbError);
        throw new Error("Failed to create resume record");
      }

      // Wait a moment for the file to be fully processed
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        // Get and verify the signed URL
        console.log('Getting signed URL and verifying access...');
        const signedUrl = await verifyFileAccess(filePath);

        console.log('Sending to Make.com webhook');
        const makeResponse = await fetch(
          "https://hook.eu2.make.com/mbwx1e992a7xe5j3aur164vyb63pfji3",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              fileUrl: signedUrl,
              resumeId: resumeData.id 
            }),
          }
        );

        if (!makeResponse.ok) {
          const responseText = await makeResponse.text();
          console.error('Make.com error response:', responseText);
          throw new Error("Failed to process resume via Make.com");
        }
        
        console.log('Make.com webhook called successfully');
        toast({
          title: "Success",
          description: "Resume uploaded successfully. Check the Previous Resumes section once optimization is complete.",
        });
      } catch (error) {
        console.error('Error in verification or webhook process:', error);
        toast({
          title: "Partial Success",
          description: "Resume uploaded but processing may be delayed. Please check back later.",
          variant: "destructive",
        });
      }
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
