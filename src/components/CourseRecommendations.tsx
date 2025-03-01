
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, BookOpen, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";

interface CourseRecommendation {
  id: string;
  title: string;
  description: string;
  url: string;
  instructor: string | null;
  skill_tags: string[];
}

export function CourseRecommendations() {
  const { toast } = useToast();
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch the latest resume ID to use for course recommendations
  useEffect(() => {
    const fetchLatestResume = async () => {
      try {
        const { data, error } = await supabase
          .from('resumes')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        if (data) {
          console.log('Latest resume ID found:', data.id);
          setSelectedResumeId(data.id);
        }
      } catch (error) {
        console.error('Error fetching latest resume:', error);
      }
    };

    fetchLatestResume();
  }, []);

  // Query to fetch course recommendations
  const { 
    data: courses = [], 
    isLoading, 
    refetch
  } = useQuery({
    queryKey: ['coursera_recommendations', selectedResumeId],
    queryFn: async () => {
      if (!selectedResumeId) return [];

      try {
        console.log('Fetching course recommendations for resume ID:', selectedResumeId);
        const { data, error } = await supabase
          .from('coursera_recommendations')
          .select('*')
          .eq('resume_id', selectedResumeId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        console.log('Course recommendations retrieved:', data);
        return data as CourseRecommendation[];
      } catch (error) {
        console.error('Error fetching course recommendations:', error);
        toast({
          title: "Error",
          description: "Failed to load course recommendations",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!selectedResumeId,
    refetchInterval: 5000, // Poll every 5 seconds to check for new recommendations
  });

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Generate a unique file path
      const filePath = `resumes/${Date.now()}_${file.name}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      setUploadProgress(40);
      
      // Create resume record in database
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .insert([
          { 
            file_path: filePath,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          }
        ])
        .select('id')
        .single();

      if (resumeError) throw resumeError;
      
      const resumeId = resumeData.id;
      setSelectedResumeId(resumeId);
      setUploadProgress(70);
      
      // Get a public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);
      
      // Call the Supabase Edge Function to process the resume
      const { error: fnError } = await supabase.functions.invoke('process-learning-courses', {
        body: { 
          fileUrl: publicUrl,
          resumeId: resumeId
        }
      });

      if (fnError) throw fnError;
      setUploadProgress(100);
      
      toast({
        title: "Success",
        description: "Resume uploaded successfully. Analyzing for course recommendations...",
      });
      
      // Refetch the courses after a short delay
      setTimeout(() => refetch(), 2000);
      
    } catch (error) {
      console.error('Error processing resume for courses:', error);
      toast({
        title: "Error",
        description: "Failed to upload resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [toast, refetch]);

  if (isUploading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-gray-600">Processing your resume... {uploadProgress}%</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-gray-600">Loading course recommendations...</p>
      </div>
    );
  }

  if (!selectedResumeId || courses.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <BookOpen className="h-16 w-16 text-gray-400 mx-auto" />
        <h3 className="text-xl font-medium">No course recommendations yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Upload your resume to get personalized course recommendations based on your skills and career goals.
        </p>
        <div className="mt-6">
          <label htmlFor="resume-upload" className="cursor-pointer">
            <div className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md mx-auto w-fit">
              <Upload className="h-4 w-4" />
              Upload Resume
            </div>
            <input 
              id="resume-upload" 
              type="file" 
              accept=".pdf,.doc,.docx" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
            
            {course.instructor && (
              <p className="text-sm text-gray-600 mb-2">Instructor: {course.instructor}</p>
            )}
            
            <p className="text-gray-700 mb-4 line-clamp-3">{course.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {course.skill_tags && course.skill_tags.map((tag, index) => (
                <Badge key={index} variant="secondary">{tag}</Badge>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2"
              onClick={() => window.open(course.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              View Course
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
