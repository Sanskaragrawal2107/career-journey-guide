import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  History,
  LineChart,
  Map,
  BookOpen,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";

const features = [
  {
    title: "Create New Resume",
    description: "Build professional resumes with AI-powered suggestions",
    icon: FileText,
  },
  {
    title: "Previous Resumes",
    description: "Access and manage your resume history",
    icon: History,
  },
  {
    title: "Skill Gap Analysis",
    description: "Identify areas for professional growth",
    icon: LineChart,
  },
  {
    title: "Career Path Suggestions",
    description: "Get personalized career advancement recommendations",
    icon: Map,
  },
  {
    title: "Learning Courses",
    description: "Access curated learning resources for skill development",
    icon: BookOpen,
  },
  {
    title: "AI Job Matching",
    description: "Get a CSV file with 85%+ matching job opportunities",
    icon: FileSpreadsheet,
  },
];

export const FeaturesSection = () => {
  return (
    <div className="py-24 sm:py-32 bg-gradient-to-b from-white to-primary-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary animate-fade-in">
            Features
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl animate-scale-in">
            Everything you need to advance your career
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary mb-4" />
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};