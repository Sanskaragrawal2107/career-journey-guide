import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export const DashboardCard = ({
  title,
  description,
  icon,
  onClick,
  className,
}: DashboardCardProps) => {
  return (
    <Card
      className={cn(
        "p-6 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-primary-50 rounded-lg">{icon}</div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );
};