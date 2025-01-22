import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative isolate px-6 pt-14 lg:px-8">
      <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary-900 sm:text-6xl">
            Your AI Career Guide for Success
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Get personalized career guidance, skill gap analysis, and learning recommendations powered by AI. Upload your resume and let us guide you to success.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary-700 text-white"
              size="lg"
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/pricing")}
              size="lg"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};