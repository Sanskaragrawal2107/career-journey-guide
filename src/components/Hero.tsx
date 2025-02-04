import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Coffee, Briefcase, Sparkles } from "lucide-react";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative isolate px-6 pt-14 lg:px-8">
      <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
        <div className="text-center animate-fade-in">
          <div className="flex justify-center items-center gap-4 mb-8">
            <Coffee className="h-8 w-8 text-primary animate-bounce" />
            <Briefcase className="h-8 w-8 text-primary animate-pulse" />
            <Sparkles className="h-8 w-8 text-primary animate-bounce" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary-900 sm:text-6xl mb-4 animate-scale-in">
            Your Dream Career Awaits
          </h1>
          <p className="text-xl font-semibold text-primary-700 mb-6 animate-fade-in">
            One Resume Away from Your Perfect Job
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 animate-fade-in">
            Upload your resume and let our AI-powered platform guide you to success. Get personalized career guidance, 
            skill gap analysis, and discover jobs that match your profile with 85%+ compatibility.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6 animate-fade-in">
            <Button
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary-700 text-white transform transition-all hover:scale-105"
              size="lg"
            >
              Start Your Journey
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/pricing")}
              size="lg"
              className="transform transition-all hover:scale-105"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};