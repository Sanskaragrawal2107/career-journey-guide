
import { useState } from "react";
import { DashboardCard } from "@/components/DashboardCard";
import { FileText, TrendingUp, BookOpen, Target, History, Briefcase } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ResumeManager } from "@/components/ResumeManager";
import { LearningRoadmap } from "@/components/LearningRoadmap";
import { CareerPathUploader } from "@/components/CareerPathUploader";
import { CareerPathProgress } from "@/components/CareerPathProgress";
import { JobMatcher } from "@/components/JobMatcher";
import { CourseRecommendations } from "@/components/CourseRecommendations";

const Dashboard = () => {
  const { toast } = useToast();
  const [showResumeManager, setShowResumeManager] = useState(false);
  const [showLearningRoadmap, setShowLearningRoadmap] = useState(false);
  const [showCareerPath, setShowCareerPath] = useState(false);
  const [showJobMatcher, setShowJobMatcher] = useState(false);
  const [showCourseRecommendations, setShowCourseRecommendations] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

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
      onClick: () => {},
      acceptFile: true,
    },
    {
      title: "Career Path Suggestions",
      description: "Get personalized career recommendations",
      icon: <TrendingUp className="w-6 h-6 text-primary" />,
      onClick: () => setShowCareerPath(true),
    },
    {
      title: "Learning Courses",
      description: "Access curated learning resources",
      icon: <BookOpen className="w-6 h-6 text-primary" />,
      onClick: () => setShowCourseRecommendations(true),
      acceptFile: true,
    },
    {
      title: "Job Matcher",
      description: "Find jobs matching your resume (85%+ match)",
      icon: <Briefcase className="w-6 h-6 text-primary" />,
      onClick: () => setShowJobMatcher(true),
      acceptFile: true,
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
        ) : showCareerPath ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Career Path</h2>
              <button
                onClick={() => setShowCareerPath(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </button>
            </div>
            {selectedResumeId ? (
              <CareerPathProgress resumeId={selectedResumeId} />
            ) : (
              <CareerPathUploader />
            )}
          </div>
        ) : showJobMatcher ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Job Matcher</h2>
              <button
                onClick={() => setShowJobMatcher(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </button>
            </div>
            <JobMatcher />
          </div>
        ) : showCourseRecommendations ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Learning Courses</h2>
              <button
                onClick={() => setShowCourseRecommendations(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </button>
            </div>
            <CourseRecommendations />
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
