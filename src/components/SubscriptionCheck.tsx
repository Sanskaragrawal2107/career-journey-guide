
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SubscriptionCheck = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        
        if (!session.session) {
          setLoading(false);
          return;
        }

        // Check if user has an active subscription
        const { data: subscriptions, error } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", session.session.user.id)
          .eq("status", "active")
          .gt("current_period_end", new Date().toISOString())
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error checking subscription:", error);
          toast.error("Failed to verify subscription status");
        }

        setHasSubscription(!!subscriptions);
        setLoading(false);
      } catch (err) {
        console.error("Error in subscription check:", err);
        setLoading(false);
      }
    };

    checkSubscription();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasSubscription) {
    return <Navigate to="/pricing" />;
  }

  return <>{children}</>;
};
