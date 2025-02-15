import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
}

interface DayPlan {
  day: number;
  tasks: Task[];
}

interface RoadmapData {
  days: DayPlan[];
}

export function LearningRoadmap({ resumeId }: { resumeId: string }) {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoadmap();
  }, [resumeId]);

  const fetchRoadmap = async () => {
    try {
      const { data: pathData, error } = await supabase
        .from("career_paths")
        .select("recommendations, progress")
        .eq("resume_id", resumeId)
        .single();

      if (error) throw error;

      if (pathData) {
        // Type assertion to ensure recommendations matches RoadmapData structure
        const recommendations = pathData.recommendations as unknown as RoadmapData;
        if (isValidRoadmapData(recommendations)) {
          setRoadmap(recommendations);
          setCompletedTasks((pathData.progress as string[]) || []);
        } else {
          throw new Error("Invalid roadmap data structure");
        }
      }
    } catch (error) {
      console.error("Error fetching roadmap:", error);
      toast({
        title: "Error",
        description: "Failed to load roadmap data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Type guard to validate roadmap data structure
  const isValidRoadmapData = (data: any): data is RoadmapData => {
    return (
      data &&
      Array.isArray(data.days) &&
      data.days.every(
        (day: any) =>
          typeof day.day === "number" &&
          Array.isArray(day.tasks) &&
          day.tasks.every(
            (task: any) =>
              typeof task.id === "string" &&
              typeof task.title === "string" &&
              typeof task.description === "string"
          )
      )
    );
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

  if (!roadmap) {
    return (
      <div className="text-center p-8">
        <p>No roadmap available yet. Please check back later.</p>
      </div>
    );
  }

  const totalTasks = roadmap.days.reduce(
    (acc, day) => acc + day.tasks.length,
    0
  );
  const progress = (completedTasks.length / totalTasks) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Overall Progress</h3>
          <Badge variant="secondary">
            {completedTasks.length} / {totalTasks} Tasks
          </Badge>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {roadmap.days.map((day) => (
        <Card key={day.day} className="p-6">
          <h3 className="text-lg font-semibold mb-4">Day {day.day}</h3>
          <div className="space-y-4">
            {day.tasks.map((task) => (
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