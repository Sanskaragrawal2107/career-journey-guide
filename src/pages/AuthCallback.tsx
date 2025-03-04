
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        
        // Get the hash fragment from the URL
        const hashFragment = window.location.hash;
        
        // If there's no hash fragment, something went wrong
        if (!hashFragment || !hashFragment.includes('access_token')) {
          setError("Authentication failed. No valid token received.");
          toast.error("Authentication failed. Please try again.");
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // Process the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          toast.success("Successfully signed in!");
          
          // Check if user has an active subscription
          const { data: subscription, error: subError } = await supabase
            .from("user_subscriptions")
            .select("*")
            .eq("user_id", data.session.user.id)
            .eq("status", "active")
            .gt("current_period_end", new Date().toISOString())
            .single();
          
          if (subError && subError.code !== "PGRST116") {
            console.error("Error checking subscription:", subError);
          }
          
          // Check if there's a redirect destination saved
          const redirectPath = sessionStorage.getItem('redirectAfterAuth') || '/dashboard';
          sessionStorage.removeItem('redirectAfterAuth');
          
          // If user doesn't have a subscription and is trying to access dashboard, redirect to pricing
          if (!subscription && redirectPath === '/dashboard') {
            navigate('/pricing');
          } else {
            navigate(redirectPath);
          }
        } else {
          setError("Failed to retrieve session");
          toast.error("Authentication failed. Please try again.");
          setTimeout(() => navigate('/auth'), 3000);
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message);
        toast.error(err.message || "Authentication failed. Please try again.");
        setTimeout(() => navigate('/auth'), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="text-red-500 mb-4">Authentication Error</div>
        <p className="text-gray-600">{error}</p>
        <p className="mt-4 text-gray-500">Redirecting to login page...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
      <p className="text-gray-600">Authentication successful! Redirecting...</p>
    </div>
  );
};

export default AuthCallback;
