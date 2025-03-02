
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: SubscriptionGuardProps) => {
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasSubscription(false);
          return;
        }

        const { data, error } = await supabase.rpc('has_active_subscription', {
          user_uuid: user.id
        });

        if (error) {
          console.error("Error checking subscription:", error);
          setHasSubscription(false);
          return;
        }

        setHasSubscription(data);
      } catch (error) {
        console.error("Error checking subscription status:", error);
        setHasSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasSubscription) {
    return <Navigate to="/subscription" />;
  }

  return <>{children}</>;
};
