
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  History,
  LineChart,
  Map,
  BookOpen,
  FileSpreadsheet,
  Target,
  Rocket,
  Star,
} from "lucide-react";

const features = [
  {
    title: "Smart Resume Builder",
    description: "Create ATS-optimized resumes with AI-powered suggestions and real-time feedback",
    icon: FileText,
  },
  {
    title: "Resume History",
    description: "Track your progress with version history and performance analytics",
    icon: History,
  },
  {
    title: "Skill Gap Analysis",
    description: "Get detailed insights into your skill gaps and personalized learning recommendations",
    icon: LineChart,
  },
  {
    title: "Career Roadmap",
    description: "Visualize your career path with custom milestones and achievement tracking",
    icon: Map,
  },
  {
    title: "Learning Hub",
    description: "Access curated courses and resources tailored to your career goals",
    icon: BookOpen,
  },
  {
    title: "AI Job Matching",
    description: "Receive a CSV file with 85%+ matching job opportunities in your field",
    icon: FileSpreadsheet,
  },
  {
    title: "Success Metrics",
    description: "Track your application success rate and interview performance",
    icon: Target,
  },
  {
    title: "Career Acceleration",
    description: "Get personalized strategies to fast-track your career growth",
    icon: Rocket,
  },
  {
    title: "Expert Network",
    description: "Connect with industry professionals and mentors in your field",
    icon: Star,
  },
];

export const FeaturesSection = () => {
  return (
    <div className="py-24 sm:py-32 bg-gradient-to-b from-primary-50/10 to-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary animate-fade-in">
            Powerful Features
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight bronze-text sm:text-5xl animate-scale-in">
            Your Complete Career Success Toolkit
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 animate-fade-in max-w-2xl mx-auto">
            Everything you need to transform your career journey from start to finish. 
            Our AI-powered platform provides comprehensive tools and insights to accelerate your success.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="glass-card hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <feature.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <div className="h-8 w-8 rounded-full bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors" />
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 group-hover:text-gray-400 transition-colors">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
