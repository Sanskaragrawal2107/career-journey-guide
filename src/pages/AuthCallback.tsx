
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        
        // Get search params from the URL
        const searchParams = new URLSearchParams(window.location.search);
        const returnTo = searchParams.get('returnTo');
        const selectedInterval = searchParams.get('selectedInterval') as 'monthly' | 'yearly' | null;
        
        console.log("Auth callback params:", { returnTo, selectedInterval });
        
        // Process the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          toast.success("Successfully signed in!");
          
          // Small timeout to ensure session is established before redirect
          setTimeout(() => {
            if (returnTo) {
              console.log("Redirecting to:", returnTo, "with interval:", selectedInterval);
              // Make sure we preserve the state when navigating
              navigate(returnTo, { 
                state: selectedInterval ? { selectedInterval } : undefined 
              });
            } else {
              navigate('/dashboard');
            }
          }, 300);
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
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
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
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-gray-600">Authentication successful! Redirecting...</p>
    </div>
  );
};

export default AuthCallback;
