
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, BookOpen, Upload, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CourseRecommendation[]>([]);

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

  const searchCourses = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      console.log('Searching for courses with term:', searchTerm);
      
      // Call the Make.com webhook with the search term
      const response = await fetch("https://hook.eu2.make.com/lb8ciads0w7jgqg9h1iiswzbzggshpd1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          searchTerm: searchTerm,
          resumeId: selectedResumeId || "search-only"
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Search results from API:', data);

      if (data && data.courses && Array.isArray(data.courses)) {
        // Transform data if needed to match CourseRecommendation interface
        const formattedResults = data.courses.map((course: any, index: number) => ({
          id: course.id || `search-result-${index}`,
          title: course.title || 'Untitled Course',
          description: course.description || '',
          url: course.url || '#',
          instructor: course.instructor || null,
          skill_tags: Array.isArray(course.skill_tags) ? course.skill_tags : []
        }));

        setSearchResults(formattedResults);
        
        // If we have a resume ID, also store these results
        if (selectedResumeId) {
          await storeSearchResults(formattedResults, selectedResumeId);
        }
      } else {
        setSearchResults([]);
        toast({
          title: "No results",
          description: "No courses found for your search term",
        });
      }
    } catch (error) {
      console.error('Error searching for courses:', error);
      toast({
        title: "Error",
        description: "Failed to search for courses. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const storeSearchResults = async (courses: CourseRecommendation[], resumeId: string) => {
    for (const course of courses) {
      try {
        const { error } = await supabase
          .from('coursera_recommendations')
          .insert({
            resume_id: resumeId,
            title: course.title,
            description: course.description,
            url: course.url,
            instructor: course.instructor,
            skill_tags: course.skill_tags
          });

        if (error) {
          console.error('Error storing course:', error);
        }
      } catch (err) {
        console.error('Exception when storing course:', err);
      }
    }
  };

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

  // Show loader for uploading state
  if (isUploading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-gray-600">Processing your resume... {uploadProgress}%</p>
      </div>
    );
  }

  // Show loader for course fetching state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-gray-600">Loading course recommendations...</p>
      </div>
    );
  }

  const displayCourses = searchResults.length > 0 ? searchResults : courses;

  // First-time experience with search bar or no results
  if (displayCourses.length === 0) {
    return (
      <div className="space-y-6">
        {/* Search bar */}
        <div className="flex space-x-2">
          <Input
            placeholder="Enter course title to search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && searchCourses()}
          />
          <Button onClick={searchCourses} disabled={isSearching}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Search
          </Button>
        </div>

        <div className="text-center py-8 space-y-4">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto" />
          <h3 className="text-xl font-medium">No course recommendations yet</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Search for courses by title, or upload your resume to get personalized course recommendations.
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
      </div>
    );
  }

  // Display course recommendations or search results
  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex space-x-2">
        <Input
          placeholder="Enter course title to search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && searchCourses()}
        />
        <Button onClick={searchCourses} disabled={isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Search
        </Button>
      </div>
      
      {searchResults.length > 0 && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Search Results</h3>
          <Button variant="outline" onClick={() => setSearchResults([])}>
            Clear Results
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayCourses.map((course) => (
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
