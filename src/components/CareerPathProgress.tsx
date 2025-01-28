import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2 } from "lucide-react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type CareerPathData = {
  days: Array<{
    day: number;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
    }>;
  }>;
};

type CareerPathRecord = {
  recommendations: CareerPathData;
  progress: string[];
  last_completed_at?: string;
};

export function CareerPathProgress({ resumeId }: { resumeId: string }) {
  const [careerPath, setCareerPath] = useState<CareerPathData | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
          const newData = payload.new;
          if (newData?.recommendations) {
            setCareerPath(newData.recommendations);
            setCompletedTasks(newData.progress || []);
            setLastCompletedAt(newData.last_completed_at || null);
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
      const { data: pathData, error } = await supabase
        .from("career_paths")
        .select("recommendations, progress, last_completed_at")
        .eq("resume_id", resumeId)
        .single();

      if (error) throw error;

      if (pathData) {
        setCareerPath(pathData.recommendations as CareerPathData);
        setCompletedTasks(pathData.progress as string[] || []);
        setLastCompletedAt(pathData.last_completed_at || null);
      }
    } catch (error) {
      console.error("Error fetching career path:", error);
      toast({
        title: "Error",
        description: "Failed to load career path data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCompletion = async (taskId: string, dayNumber: number, completed: boolean) => {
    if (!completed) return;

    // Check if this is not day 1 and previous day is not completed
    if (dayNumber > 1) {
      const previousDayTasks = careerPath?.days.find(d => d.day === dayNumber - 1)?.tasks || [];
      const previousDayCompleted = previousDayTasks.every(task => completedTasks.includes(task.id));
      
      if (!previousDayCompleted) {
        toast({
          title: "Cannot complete this task",
          description: "You must complete the previous day's tasks first",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if a task was already completed today
    const today = new Date().toISOString().split('T')[0];
    const lastCompleted = lastCompletedAt ? new Date(lastCompletedAt).toISOString().split('T')[0] : null;
    
    if (lastCompleted === today) {
      toast({
        title: "Daily limit reached",
        description: "You can only complete one task per day",
        variant: "destructive",
      });
      return;
    }

    try {
      const newCompletedTasks = [...completedTasks, taskId];
      
      const { error } = await supabase
        .from("career_paths")
        .update({ 
          progress: newCompletedTasks,
          last_completed_at: new Date().toISOString()
        })
        .eq("resume_id", resumeId);

      if (error) throw error;

      setCompletedTasks(newCompletedTasks);
      setLastCompletedAt(new Date().toISOString());
      
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

      // Force reload to show upload component
      window.location.reload();
    } catch (error) {
      console.error("Error deleting career path:", error);
      toast({
        title: "Error",
        description: "Failed to delete career path",
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

  if (!careerPath?.days) {
    return (
      <div className="text-center p-8">
        <p>No career path available yet. Please check back later.</p>
      </div>
    );
  }

  const totalTasks = careerPath.days.reduce(
    (acc, day) => acc + (day.tasks?.length || 0),
    0
  );
  const progress = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2 flex-1 mr-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Overall Progress</h3>
            <Badge variant="secondary">
              {completedTasks.length} / {totalTasks} Tasks
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete Roadmap
        </Button>
      </div>

      {careerPath.days.map((day) => (
        <Card key={day.day} className="p-6">
          <h3 className="text-lg font-semibold mb-4">Day {day.day}</h3>
          <div className="space-y-4">
            {day.tasks?.map((task) => (
              <div key={task.id} className="flex items-start space-x-3">
                <Checkbox
                  id={task.id}
                  checked={completedTasks.includes(task.id)}
                  onCheckedChange={(checked) =>
                    handleTaskCompletion(task.id, day.day, checked as boolean)
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