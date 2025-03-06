import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Coffee, Briefcase, Sparkles, Rocket, Star, ChartBar, GraduationCap, BarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
export const Hero = () => {
  const navigate = useNavigate();
  const handleStartJourney = async () => {
    // Check if user is already logged in
    const {
      data
    } = await supabase.auth.getSession();
    if (!data.session) {
      // User is not logged in, redirect to auth page
      // Store the redirect destination after authentication
      sessionStorage.setItem('redirectAfterAuth', '/auth/callback');
      navigate("/auth");
      return;
    }

    // User is logged in, now check if they have an active subscription
    const {
      data: subscription,
      error
    } = await supabase.from("user_subscriptions").select("*").eq("user_id", data.session.user.id).eq("status", "active").gt("current_period_end", new Date().toISOString()).single();
    if (error && error.code !== "PGRST116") {
      console.error("Error checking subscription:", error);
    }
    if (subscription) {
      // User has an active subscription, redirect to dashboard
      navigate("/dashboard");
    } else {
      // User is logged in but doesn't have an active subscription
      navigate("/pricing");
    }
  };
  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-section');
    if (pricingSection) {
      pricingSection.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
  return <div className="relative isolate px-6 pt-14 lg:px-8">
      <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-8">
            <img src="/lovable-uploads/6671c039-73ff-4f5e-8c43-c07406d0970c.png" alt="CareerSarthi Logo" className="h-36 mb-4 animate-float" />
            <div className="flex justify-center items-center gap-6">
              <Rocket className="h-10 w-10 text-primary animate-float" style={{
              animationDelay: '0.5s'
            }} />
              <Star className="h-8 w-8 text-primary animate-float" style={{
              animationDelay: '1s'
            }} />
              <GraduationCap className="h-10 w-10 text-primary animate-float" style={{
              animationDelay: '1.5s'
            }} />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-4 animate-scale-in bronze-text">
            Transform Your Career Journey
          </h1>
          <div className="flex flex-col gap-4 animate-fade-in">
            <p className="text-2xl font-semibold text-primary-700 animate-fade-in">
              One Step Away from Your Dream Job
            </p>
            <div className="flex justify-center items-center space-x-4">
              <div className="bg-primary-100 text-primary-800 px-4 py-2 rounded-full font-medium flex items-center">
                <Sparkles className="h-4 w-4 mr-1" />
                85%+ Match Rate
              </div>
              <div className="bg-primary-100 text-primary-800 px-4 py-2 rounded-full font-medium flex items-center">
                <BarChart className="h-4 w-4 mr-1" />
                AI-Powered Guidance
              </div>
              <div className="bg-primary-100 text-primary-800 px-4 py-2 rounded-full font-medium flex items-center">
                <Briefcase className="h-4 w-4 mr-1" />
                Personalized Path
              </div>
            </div>
          </div>
          <p className="mt-8 text-lg leading-8 text-gray-600 animate-fade-in max-w-xl mx-auto">
            Join thousands of professionals who've found their perfect career match. 
            Our AI-powered platform analyzes your skills, identifies opportunities, 
            and guides you to success with personalized recommendations.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6 animate-fade-in">
            <Button onClick={handleStartJourney} className="gradient-button text-lg px-8 py-6 h-auto" size="lg">
              <span>Start Your Journey</span>
              <Rocket className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" onClick={scrollToPricing} size="lg" className="border-primary text-primary hover:bg-primary-50 text-lg px-8 py-6 h-auto transform transition-all hover:scale-105 group">
              <span>View Pricing</span>
              <ChartBar className="ml-2 h-5 w-5 group-hover:translate-y-1 transition-transform" />
            </Button>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in">
            {[{
            number: "95%",
            text: "Success Rate"
          }, {
            number: "10K+",
            text: "Career Matches"
          }, {
            number: "24/7",
            text: "AI Support"
          }].map(stat => <div key={stat.text} className="glass-card p-8 rounded-lg backdrop-blur-lg hover:bg-primary-50/10 transition-colors">
                <dt className="text-3xl font-bold tracking-tight text-primary">{stat.number}</dt>
                <dd className="mt-1 text-base font-semibold leading-7 text-gray-600 rounded-none bg-slate-50">{stat.text}</dd>
              </div>)}
          </div>
        </div>
      </div>
    </div>;
};