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

        const response = await fetch('/api/process-resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
          })
        });

        if (!response.ok) {
          throw new Error('Failed to process resume');
        }

        toast({
          title: "Success",
          description: "Resume sent for optimization",
        });
      } catch (error) {
        console.error('Error processing resume:', error);
        toast({
          title: "Error",
          description: "Failed to process resume",
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