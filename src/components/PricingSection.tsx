import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
const features = ["Resume Analysis", "Skill Gap Detection", "Career Path Suggestions", "Learning Resources", "Progress Tracking"];
export const PricingSection = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleSubscribe = async () => {
    try {
      const {
        data
      } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/subscription");
      } else {
        // Redirect to auth page with return URL
        toast({
          title: "Login Required",
          description: "Please sign in to subscribe"
        });
        navigate("/auth");
      }
    } catch (error) {
      console.error('Error checking session:', error);
      navigate("/auth");
    }
  };
  return <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose your plan
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Monthly Plan */}
          <div className="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10">
            <div>
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  Monthly
                </h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                Perfect for professionals starting their career journey
              </p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">$9</span>
                <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                {features.map(feature => <li key={feature} className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    {feature}
                  </li>)}
              </ul>
            </div>
            <Button className="mt-8 bg-primary hover:bg-primary-700" onClick={handleSubscribe}>
              Subscribe Monthly
            </Button>
          </div>

          {/* Yearly Plan */}
          <div className="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10">
            <div>
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  Yearly
                </h3>
                <p className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold leading-5 text-primary">
                  Save 18%
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                Best value for committed career growth
              </p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">₹ 7700</span>
                <span className="text-sm font-semibold leading-6 text-gray-600">/year</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                {features.map(feature => <li key={feature} className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    {feature}
                  </li>)}
              </ul>
            </div>
            <Button className="mt-8 bg-primary hover:bg-primary-700" onClick={handleSubscribe}>
              Subscribe Yearly
            </Button>
          </div>
        </div>
      </div>
    </div>;
};