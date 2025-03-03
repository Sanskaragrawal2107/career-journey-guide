import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Coffee, Briefcase, Sparkles, Rocket, Star, ChartBar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Hero = () => {
  const navigate = useNavigate();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkInitialAuthStatus = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error checking initial session:', error);
          setIsUserLoggedIn(false);
          return;
        }
        
        setIsUserLoggedIn(!!data.session);
      } catch (error) {
        console.error('Error in initial auth check:', error);
        setIsUserLoggedIn(false);
      }
    };
    
    checkInitialAuthStatus();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setIsUserLoggedIn(!!session);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleStartJourney = async () => {
    try {
      setIsCheckingAuth(true);
      
      if (isUserLoggedIn !== null) {
        if (isUserLoggedIn) {
          navigate("/dashboard");
        } else {
          navigate("/auth", { state: { returnTo: "/dashboard" } });
        }
        return;
      }
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking session:', error);
        toast.error("Error checking authentication status. Please try again.");
        return;
      }
      
      if (data.session) {
        navigate("/dashboard");
      } else {
        navigate("/auth", { state: { returnTo: "/dashboard" } });
      }
    } catch (error) {
      console.error('Error checking session:', error);
      toast.error("Failed to check authentication status. Please try again.");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  return (
    <div className="relative isolate px-6 pt-14 lg:px-8">
      <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
        <div className="text-center">
          <div className="flex justify-center items-center gap-6 mb-8">
            <Coffee className="h-10 w-10 text-primary animate-bounce" />
            <Rocket className="h-12 w-12 text-primary animate-pulse" />
            <Star className="h-10 w-10 text-primary animate-bounce" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary-900 sm:text-6xl mb-4 animate-scale-in">
            Transform Your Career Journey
          </h1>
          <div className="flex flex-col gap-4 animate-fade-in">
            <p className="text-2xl font-semibold text-primary-700 animate-fade-in">
              One Cup of Coffee Away from Your Dream Job
            </p>
            <p className="text-xl font-medium text-primary-600 animate-fade-in">
              85%+ Match Rate • AI-Powered Guidance • Personalized Path
            </p>
          </div>
          <p className="mt-8 text-lg leading-8 text-gray-600 animate-fade-in max-w-xl mx-auto">
            Join thousands of professionals who've found their perfect career match. 
            Our AI-powered platform analyzes your resume, identifies opportunities, 
            and guides you to success with personalized recommendations.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6 animate-fade-in">
            <Button
              onClick={handleStartJourney}
              className="bg-primary hover:bg-primary-700 text-white transform transition-all hover:scale-105 group"
              size="lg"
              disabled={isCheckingAuth}
            >
              <span>{isCheckingAuth ? 'Checking...' : 'Start Your Journey'}</span>
              <Rocket className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/subscription")}
              size="lg"
              className="transform transition-all hover:scale-105 group"
            >
              <span>View Pricing</span>
              <ChartBar className="ml-2 h-4 w-4 group-hover:translate-y-1 transition-transform" />
            </Button>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in">
            {[
              { number: "95%", text: "Success Rate" },
              { number: "10K+", text: "Career Matches" },
              { number: "24/7", text: "AI Support" },
            ].map((stat) => (
              <div key={stat.text} className="bg-white/5 p-8 ring-1 ring-primary/10 rounded-lg backdrop-blur-lg hover:bg-primary-50 transition-colors">
                <dt className="text-3xl font-bold tracking-tight text-primary">{stat.number}</dt>
                <dd className="mt-1 text-base font-semibold leading-7 text-gray-600">{stat.text}</dd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
