import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Trash2, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type CareerPathData = {
  recommendations: {
    days: Array<{
      day: number;
      tasks: Array<{
        id: string;
        title: string;
        description: string;
      }>;
    }>;
  };
};

type CareerPathRecord = {
  recommendations: CareerPathData;
  progress: string[];
};

export function CareerPathProgress({ resumeId }: { resumeId: string }) {
  const [careerPath, setCareerPath] = useState<CareerPathData | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [days, setDays] = useState<number>(30);
  const { toast } = useToast();

  useEffect(() => {
    fetchCareerPath();

    const channel = supabase
      .channel('career-path-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'career_paths',
          filter: `resume_id=eq.${resumeId}`
        },
        (payload: RealtimePostgresChangesPayload<CareerPathRecord>) => {
          console.log('Real-time update received:', payload);
          const newData = payload.new as CareerPathRecord;
          if (newData?.recommendations) {
            setCareerPath(newData.recommendations);
            setCompletedTasks(newData.progress || []);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resumeId]);

  const fetchCareerPath = async () => {
    try {
      console.log('Fetching career path for resume:', resumeId);
      const { data: pathData, error } = await supabase
        .from("career_paths")
        .select("recommendations, progress")
        .eq("resume_id", resumeId)
        .single();

      if (error) {
        console.error("Error fetching career path:", error);
        throw error;
      }

      console.log('Received career path data:', pathData);
      if (pathData?.recommendations) {
        setCareerPath(pathData.recommendations as CareerPathData);
        setCompletedTasks(pathData.progress as string[] || []);
      }
    } catch (error) {
      console.error("Error fetching career path:", error);
      toast({
        title: "Error",
        description: "Failed to fetch career path data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("career_paths")
        .delete()
        .eq("resume_id", resumeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Career path deleted successfully",
      });
      setCareerPath(null);
    } catch (error) {
      console.error("Error deleting career path:", error);
      toast({
        title: "Error",
        description: "Failed to delete career path",
        variant: "destructive",
      });
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

    setUploading(true);
    try {
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Generate a signed URL valid for 2 minutes
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 120);

      if (signedUrlError || !signedUrlData) {
        throw new Error("Failed to generate signed URL");
      }

      // Send to Make.com webhook
      const response = await fetch(
        "https://hook.eu2.make.com/hq2vblqddu8mdnr8cez7n51x9gh4x7fu",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUrl: signedUrlData.signedUrl,
            resumeId: resumeId,
            daysToComplete: days
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to process career path");

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
    } finally {
      setUploading(false);
    }
  };

  const handleTaskCompletion = async (taskId: string, completed: boolean) => {
    if (!completed) return;

    try {
      const newCompletedTasks = [...completedTasks, taskId];
      
      const { error } = await supabase
        .from("career_paths")
        .update({ progress: newCompletedTasks })
        .eq("resume_id", resumeId);

      if (error) throw error;

      setCompletedTasks(newCompletedTasks);
      toast({
        title: "Progress Updated",
        description: "Task marked as completed",
      });
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!careerPath?.recommendations?.days || careerPath.recommendations.days.length === 0) {
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
              disabled={uploading}
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
              disabled={uploading}
            />
          </div>
          <Button type="submit" disabled={uploading} className="w-full">
            {uploading ? (
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
        </form>
      </Card>
    );
  }

  const totalTasks = careerPath.recommendations.days.reduce(
    (acc, day) => acc + (day.tasks?.length || 0),
    0
  );
  const progress = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-2 flex-1">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Overall Progress</h3>
            <div className="flex items-center gap-2">
              {progress === 100 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  Completed
                </Badge>
              )}
              <Badge variant="secondary">
                {completedTasks.length} / {totalTasks} Tasks
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
        <Button
          variant="destructive"
          size="icon"
          className="ml-4"
          onClick={handleDelete}
          title="Delete Career Path"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {careerPath.recommendations.days.map((day) => (
        <Card key={day.day} className="p-6">
          <h3 className="text-lg font-semibold mb-4">Day {day.day}</h3>
          <div className="space-y-4">
            {day.tasks?.map((task) => (
              <div key={task.id} className="flex items-start space-x-3">
                <Checkbox
                  id={task.id}
                  checked={completedTasks.includes(task.id)}
                  onCheckedChange={(checked) =>
                    handleTaskCompletion(task.id, checked as boolean)
                  }
                />
                <div>
                  <label
                    htmlFor={task.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {task.title}
                  </label>
                  <p className="text-sm text-gray-500">{task.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}