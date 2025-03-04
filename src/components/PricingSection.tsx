
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const features = [
  "Resume Analysis",
  "Skill Gap Detection",
  "Career Path Suggestions",
  "Learning Resources",
  "Progress Tracking",
];

interface PricingSectionProps {
  userId?: string | null;
}

export const PricingSection = ({ userId }: PricingSectionProps = {}) => {
  const [loading, setLoading] = useState({
    monthly: false,
    yearly: false
  });
  const navigate = useNavigate();

  const handleSubscription = async (planType: "monthly" | "yearly") => {
    try {
      if (!userId) {
        toast.error("Please log in to subscribe");
        // Store the current path to redirect back after authentication
        sessionStorage.setItem('redirectAfterAuth', '/pricing');
        navigate("/auth");
        return;
      }

      setLoading(prev => ({ ...prev, [planType]: true }));

      const amount = planType === "monthly" ? 9 * 100 : 89 * 100; // Convert to paise
      const currency = "INR";
      const planDays = planType === "monthly" ? 30 : 365;
      const planName = planType === "monthly" ? "Monthly" : "Yearly";

      // Create order using our edge function
      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount,
          currency,
          userId,
          planType,
          planDays
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const { orderId } = data;

      if (!orderId) {
        throw new Error("Failed to create order");
      }

      // Load Razorpay script if not already loaded
      if (!(window as any).Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Initialize Razorpay payment
      const options = {
        key: "rzp_live_47mpRvV2Yh9XLZ", // Replace with your Razorpay key
        amount: amount.toString(),
        currency,
        name: "CareerSarthi",
        description: `${planName} Subscription`,
        order_id: orderId,
        handler: async function (response: any) {
          // Verify payment using our edge function
          const { data: verificationData, error: verificationError } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              userId,
              planType,
              planDays,
              amount
            }
          });

          if (verificationError) {
            toast.error("Payment verification failed");
            console.error("Verification error:", verificationError);
            return;
          }

          toast.success("Subscription activated successfully!");
          navigate("/dashboard");
        },
        prefill: {
          name: "User",
          email: "", // We could fetch this from the user profile if needed
        },
        theme: {
          color: "#4F46E5",
        },
        modal: {
          ondismiss: function() {
            setLoading({ monthly: false, yearly: false });
            toast.info("Payment cancelled");
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to process payment. Please try again.");
    } finally {
      setLoading({ monthly: false, yearly: false });
    }
  };

  return (
    <div className="py-24 sm:py-32">
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
                {features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button 
              className="mt-8 bg-primary hover:bg-primary-700"
              onClick={() => handleSubscription("monthly")}
              disabled={loading.monthly}
            >
              {loading.monthly ? "Processing..." : "Subscribe Monthly"}
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
                <span className="text-4xl font-bold tracking-tight text-gray-900">$89</span>
                <span className="text-sm font-semibold leading-6 text-gray-600">/year</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button 
              className="mt-8 bg-primary hover:bg-primary-700"
              onClick={() => handleSubscription("yearly")}
              disabled={loading.yearly}
            >
              {loading.yearly ? "Processing..." : "Subscribe Yearly"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
