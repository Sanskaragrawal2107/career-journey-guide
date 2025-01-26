import { useState } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { FileText, TrendingUp, BookOpen, Target, History } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ResumeManager } from "@/components/ResumeManager";
import { LearningRoadmap } from "@/components/LearningRoadmap";

const Dashboard = () => {
  const { toast } = useToast();
  const [showResumeManager, setShowResumeManager] = useState(false);
  const [showLearningRoadmap, setShowLearningRoadmap] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  const handleUpload = async () => {
    const response = await fetch(
      "https://hook.eu2.make.com/mbwx1e992a7xe5j3aur164vyb63pfji3",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "career_path",
        }),
      }
    );

    if (!response.ok) {
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Request processed successfully",
    });
  };

  const dashboardItems = [
    {
      title: "Create New Resume",
      description: "Upload your resume for AI optimization",
      icon: <FileText className="w-6 h-6 text-primary" />,
      onClick: () => {},
      acceptFile: true,
    },
    {
      title: "Previous Resumes",
      description: "View and edit your saved resumes",
      icon: <History className="w-6 h-6 text-primary" />,
      onClick: () => setShowResumeManager(true),
    },
    {
      title: "Skill Gap Analysis",
      description: "Identify skills needed for your dream role",
      icon: <Target className="w-6 h-6 text-primary" />,
      onClick: handleUpload,
    },
    {
      title: "Career Path Suggestions",
      description: "Get personalized career recommendations",
      icon: <TrendingUp className="w-6 h-6 text-primary" />,
      onClick: handleUpload,
    },
    {
      title: "Learning Courses",
      description: "Access curated learning resources",
      icon: <BookOpen className="w-6 h-6 text-primary" />,
      onClick: () => {
        if (selectedResumeId) {
          setShowLearningRoadmap(true);
        } else {
          toast({
            title: "No Resume Selected",
            description: "Please upload or select a resume first",
            variant: "destructive",
          });
        }
      },
    },
  ];

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="space-y-8">
        {showResumeManager ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Previous Resumes</h2>
              <button
                onClick={() => setShowResumeManager(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </button>
            </div>
            <ResumeManager />
          </div>
        ) : showLearningRoadmap && selectedResumeId ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Learning Roadmap</h2>
              <button
                onClick={() => setShowLearningRoadmap(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </button>
            </div>
            <LearningRoadmap resumeId={selectedResumeId} />
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardItems.map((item) => (
                <DashboardCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;