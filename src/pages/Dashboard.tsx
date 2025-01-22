import { DashboardCard } from "@/components/DashboardCard";
import { FileText, TrendingUp, BookOpen, Target, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleUpload = async () => {
    toast({
      title: "Coming Soon",
      description: "This feature will be available in the next update!",
    });
  };

  const dashboardItems = [
    {
      title: "Create New Resume",
      description: "Build a professional resume with AI assistance",
      icon: <FileText className="w-6 h-6 text-primary" />,
      onClick: handleUpload,
    },
    {
      title: "Previous Resumes",
      description: "View and edit your saved resumes",
      icon: <History className="w-6 h-6 text-primary" />,
      onClick: handleUpload,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardItems.map((item) => (
          <DashboardCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;