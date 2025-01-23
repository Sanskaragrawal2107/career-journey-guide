import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  isProcessing?: boolean;
}

export const DashboardCard = ({
  title,
  description,
  icon,
  onClick,
  className,
  isProcessing = false,
}: DashboardCardProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (loading) return;
    
    if (title === "Create New Resume") {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get the latest resume for the user
        const { data: resumes, error: resumeError } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (resumeError) throw resumeError;
        if (!resumes || resumes.length === 0) {
          throw new Error('No resume found');
        }

        const resumeId = resumes[0].id;

        // Call the Supabase Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-resume`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              userId: user.id,
              resumeId: resumeId,
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to process resume');
        }

        toast({
          title: "Success",
          description: "Resume sent for optimization",
        });
      } catch (error) {
        console.error('Error processing resume:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to process resume",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } else {
      onClick();
    }
  };

  return (
    <Card
      className={cn(
        "p-6 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-primary-50 rounded-lg">
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : icon}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );
};