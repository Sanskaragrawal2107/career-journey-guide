
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  url: string;
  instructor: string | null;
  skill_tags: string[] | null;
}

export function CourseRecommendations({ resumeId }: { resumeId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, [resumeId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("coursera_recommendations")
        .select("*")
        .eq("resume_id", resumeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Error",
        description: "Failed to load course recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center p-8">
        <p>No course recommendations available yet. Please upload your resume to get personalized course suggestions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Recommended Courses</h3>
        <p className="text-sm text-gray-500">Personalized course recommendations based on your resume</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((course) => (
          <Card key={course.id} className="p-5 flex flex-col h-full">
            <div className="flex-1">
              <h4 className="font-medium text-base">{course.title}</h4>
              
              {course.instructor && (
                <p className="text-sm text-gray-500 mt-1">
                  Instructor: {course.instructor}
                </p>
              )}
              
              <div className="mt-2">
                {course.skill_tags && course.skill_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {course.skill_tags.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                    {course.skill_tags.length > 3 && (
                      <Badge variant="outline">+{course.skill_tags.length - 3} more</Badge>
                    )}
                  </div>
                )}
              </div>
              
              {course.description && (
                <p className="text-sm text-gray-600 mt-3 line-clamp-3">
                  {course.description}
                </p>
              )}
            </div>
            
            <Button 
              variant="outline" 
              className="mt-4 w-full flex items-center justify-center"
              onClick={() => window.open(course.url, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Course
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
