
import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkSubscription = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged in
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }
        
        if (!sessionData.session) {
          console.log("No active session found");
          if (isMounted) {
            setHasSubscription(false);
            setLoading(false);
          }
          return;
        }

        console.log("User is logged in, checking subscription...");

        // Check for active subscription in database
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', sessionData.session.user.id)
          .eq('status', 'active')
          .gte('current_period_end', new Date().toISOString())
          .maybeSingle();

        if (subscriptionError) {
          console.error("Subscription check error:", subscriptionError);
          throw subscriptionError;
        }
        
        console.log("Subscription check result:", subscriptionData ? "Active subscription found" : "No active subscription");
        if (isMounted) {
          setHasSubscription(!!subscriptionData);
        }
      } catch (error) {
        console.error("Error checking subscription status:", error);
        if (isMounted) {
          toast({
            title: "Error",
            description: "Failed to verify subscription status",
            variant: "destructive",
          });
          setHasSubscription(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSubscription();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasSubscription) {
    console.log("No active subscription, redirecting to subscription page");
    toast({
      title: "Subscription Required",
      description: "You need an active subscription to access this feature",
    });
    return <Navigate to="/subscription" />;
  }

  console.log("Active subscription verified, rendering protected content");
  return <>{children}</>;
};
