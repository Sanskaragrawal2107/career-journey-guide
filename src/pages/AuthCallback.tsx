import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
          if (returnTo) {
            console.log("Redirecting to:", returnTo, "with interval:", selectedInterval);
            navigate(returnTo, { state: { selectedInterval } });
          } else {
            navigate('/dashboard');
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
