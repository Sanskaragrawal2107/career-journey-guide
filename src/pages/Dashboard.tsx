import { useState } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { FileText, TrendingUp, BookOpen, Target, History } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ResumeManager } from "@/components/ResumeManager";

const Dashboard = () => {
  const { toast } = useToast();
  const [showResumeManager, setShowResumeManager] = useState(false);

  const handleUpload = async () => {
    toast({
      title: "Coming Soon",
      description: "This feature will be available in the next update!",
    });
  };

  const dashboardItems = [
    {
      title: "Create New Resume",
      description: "Upload your resume for AI optimization",
      icon: <FileText className="w-6 h-6 text-primary" />,
      onClick: () => {}, // This will be handled by DashboardCard's internal logic
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
      onClick: handleUpload,
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