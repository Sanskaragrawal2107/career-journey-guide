
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PricingSection } from "@/components/PricingSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Pricing = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          // Not logged in, redirect to auth
          sessionStorage.setItem('redirectAfterAuth', '/pricing');
          navigate('/auth');
          return;
        }
        
        setUserId(data.session.user.id);
        
        // Check if user already has an active subscription
        const { data: subscription, error } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", data.session.user.id)
          .eq("status", "active")
          .gt("current_period_end", new Date().toISOString())
          .single();
          
        if (subscription) {
          toast.info("You already have an active subscription");
          navigate('/dashboard');
          return;
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error checking auth:", err);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-center mt-10 mb-6">Subscribe to CareerSarthi</h1>
      <p className="text-center text-gray-600 max-w-xl mx-auto mb-10">
        Choose a subscription plan to access all features and accelerate your career growth
      </p>
      <PricingSection userId={userId} />
    </div>
  );
};

export default Pricing;
