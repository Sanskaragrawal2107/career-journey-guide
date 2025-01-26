import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy } from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  day: number;
}

interface RoadmapData {
  days: {
    day: number;
    modules: Module[];
  }[];
}

export const LearningRoadmap = ({ resumeId }: { resumeId: string }) => {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [completedModules, setCompletedModules] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRoadmapData();
    fetchUserProgress();
    fetchUserBadges();
  }, [resumeId]);

  const fetchRoadmapData = async () => {
    const { data: roadmapData, error } = await supabase
      .from("learning_roadmaps")
      .select("roadmap_data")
      .eq("resume_id", resumeId)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load roadmap data",
        variant: "destructive",
      });
      return;
    }

    if (roadmapData) {
      setRoadmap(roadmapData.roadmap_data as RoadmapData);
    }
    setLoading(false);
  };

  const fetchUserProgress = async () => {
    const { data: progress, error } = await supabase
      .from("module_progress")
      .select("module_id")
      .eq("resume_id", resumeId);

    if (error) {
      console.error("Error fetching progress:", error);
      return;
    }

    setCompletedModules(progress?.map((p) => p.module_id) || []);
  };

  const fetchUserBadges = async () => {
    const { data: userBadges, error } = await supabase
      .from("user_badges")
      .select("badge_type");

    if (error) {
      console.error("Error fetching badges:", error);
      return;
    }

    setBadges(userBadges?.map((b) => b.badge_type) || []);
  };

  const handleModuleCompletion = async (moduleId: string, completed: boolean) => {
    if (!completed) return; // We only handle completion, not un-completion

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    try {
      // Record module completion
      const { error: progressError } = await supabase
        .from("module_progress")
        .insert({
          user_id: user.user.id,
          module_id: moduleId,
          roadmap_id: resumeId,
        });

      if (progressError) throw progressError;

      // Check if badge should be awarded
      const dayModules = roadmap?.days.flatMap(d => d.modules) || [];
      const dayCompleted = dayModules
        .filter(m => m.day === dayModules.find(dm => dm.id === moduleId)?.day)
        .every(m => completedModules.includes(m.id) || m.id === moduleId);

      if (dayCompleted) {
        const badgeType = `day_${dayModules.find(m => m.id === moduleId)?.day}_complete`;
        
        if (!badges.includes(badgeType)) {
          const { error: badgeError } = await supabase
            .from("user_badges")
            .insert({
              user_id: user.user.id,
              badge_type: badgeType,
            });

          if (badgeError) throw badgeError;

          setBadges([...badges, badgeType]);
          toast({
            title: "Badge Earned! 🎉",
            description: `You've completed all modules for day ${dayModules.find(m => m.id === moduleId)?.day}!`,
          });
        }
      }

      setCompletedModules([...completedModules, moduleId]);
      toast({
        title: "Progress Saved",
        description: "Module marked as completed",
      });
    } catch (error) {
      console.error("Error updating progress:", error);
      toast({
        title: "Error",
        description: "Failed to save progress",
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 mb-6">
        {badges.map((badge) => (
          <Badge key={badge} variant="secondary" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            {badge.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        ))}
      </div>

      {roadmap.days.map((day) => (
        <Card key={day.day} className="p-6">
          <h3 className="text-lg font-semibold mb-4">Day {day.day}</h3>
          <div className="space-y-4">
            {day.modules.map((module) => (
              <div key={module.id} className="flex items-start space-x-3">
                <Checkbox
                  id={module.id}
                  checked={completedModules.includes(module.id)}
                  onCheckedChange={(checked) => handleModuleCompletion(module.id, checked as boolean)}
                />
                <div>
                  <label
                    htmlFor={module.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {module.title}
                  </label>
                  <p className="text-sm text-gray-500">{module.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
};