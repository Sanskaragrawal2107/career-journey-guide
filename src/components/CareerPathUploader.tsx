import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export const CareerPathProgress = ({ resumeId }: { resumeId: string }) => {
  const [careerPath, setCareerPath] = useState<any>(null);
  const [taskCompletion, setTaskCompletion] = useState<{ [key: string]: boolean }>({});
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchCareerPath();
  }, []);

  // Fetch the career path recommendations
  const fetchCareerPath = async () => {
    try {
      const response = await fetch(`/api/career-path/${resumeId}`);
      const data = await response.json();

      setCareerPath(data);
      initializeTaskCompletion(data.recommendations);
    } catch (error) {
      console.error("Failed to fetch career path:", error);
      toast({
        title: "Error",
        description: "Failed to fetch career path. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Initialize task completion state
  const initializeTaskCompletion = (recommendations: any[]) => {
    const initialTaskState: { [key: string]: boolean } = {};
    recommendations.forEach((day: any) => {
      day.tasks.forEach((task: any) => {
        initialTaskState[`${day.day}-${task.id}`] = false; // Unique key for each task
      });
    });
    setTaskCompletion(initialTaskState);
  };

  // Handle task completion (checkbox functionality)
  const handleTaskCompletion = (taskKey: string, isCompleted: boolean) => {
    setTaskCompletion((prev) => {
      const updatedState = { ...prev, [taskKey]: isCompleted };
      calculateProgress(updatedState);
      return updatedState;
    });
  };

  // Calculate overall progress based on completed tasks
  const calculateProgress = (completionState: { [key: string]: boolean }) => {
    const totalTasks = Object.keys(completionState).length;
    const completedTasks = Object.values(completionState).filter((value) => value).length;
    const percentage = (completedTasks / totalTasks) * 100;
    setProgress(percentage);
  };

  if (!careerPath) {
    return <div>Loading career path...</div>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Career Path Progress</h2>
      <Progress value={progress} className="w-full mb-6" />

      {careerPath.recommendations.map((day: any) => (
        <div key={day.day} className="mb-6">
          <h3 className="font-bold text-lg mb-2">Day {day.day}</h3>
          {day.tasks.map((task: any) => {
            const taskKey = `${day.day}-${task.id}`;
            return (
              <div key={taskKey} className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id={taskKey}
                  checked={taskCompletion[taskKey] || false}
                  onChange={(e) => handleTaskCompletion(taskKey, e.target.checked)}
                />
                <label htmlFor={taskKey} className="cursor-pointer">
                  {task.title}
                </label>
              </div>
            );
          })}
        </div>
      ))}

      <Button
        className="w-full"
        onClick={() => toast({ title: "Congrats!", description: "You completed the career path!" })}
        disabled={progress < 100}
      >
        Complete Career Path
      </Button>
    </Card>
  );
};
