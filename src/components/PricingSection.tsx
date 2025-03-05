
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
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
        sessionStorage.setItem('redirectAfterAuth', '/pricing');
        navigate("/auth");
        return;
      }

      setLoading(prev => ({ ...prev, [planType]: true }));

      // Using USD amounts instead of INR
      const amount = planType === "monthly" ? 9 * 100 : 89 * 100; // Convert to cents
      const currency = "USD"; // Changed from INR to USD
      const planDays = planType === "monthly" ? 30 : 365;
      const planName = planType === "monthly" ? "Monthly" : "Yearly";

      console.log("Creating order with:", { amount, currency, userId, planType, planDays });

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
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to create order");
      }

      const { orderId } = data;

      if (!orderId) {
        console.error("No order ID returned:", data);
        throw new Error("Failed to create order");
      }

      console.log("Order created successfully:", orderId);

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
        key: "rzp_live_47mpRvV2Yh9XLZ", // Using the provided Razorpay key
        amount: amount.toString(),
        currency,
        name: "CareerSarthi",
        description: `${planName} Subscription`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            console.log("Payment successful, verifying:", response);
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

            console.log("Payment verified successfully:", verificationData);
            toast.success("Subscription activated successfully!");
            navigate("/dashboard");
          } catch (e) {
            console.error("Error in payment handler:", e);
            toast.error("Payment processing failed");
          } finally {
            setLoading({ monthly: false, yearly: false });
          }
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

      console.log("Opening Razorpay with options:", { ...options, key: "[REDACTED]" });
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
    <div id="pricing-section" className="py-24 sm:py-32 bg-gradient-to-b from-background via-background to-primary-50/10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight bronze-text sm:text-5xl">
            Choose your plan
          </p>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            Invest in your career growth with our affordable subscription plans. 
            Get access to AI-powered tools that will transform your job search.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Monthly Plan */}
          <div className="flex flex-col justify-between rounded-3xl glass-card p-8 ring-1 ring-primary/20 xl:p-10 hover:translate-y-[-8px] transition-all duration-300">
            <div>
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-xl font-semibold leading-8 text-foreground">
                  Monthly
                </h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-400">
                Perfect for professionals starting their career journey
              </p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-5xl font-bold tracking-tight text-primary">$9</span>
                <span className="text-sm font-semibold leading-6 text-gray-400">/month</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-400">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button 
              className="mt-8 gradient-button w-full py-6 h-auto text-lg font-medium"
              onClick={() => handleSubscription("monthly")}
              disabled={loading.monthly}
            >
              {loading.monthly ? "Processing..." : "Subscribe Monthly"}
            </Button>
          </div>

          {/* Yearly Plan */}
          <div className="flex flex-col justify-between rounded-3xl glass-card p-8 ring-1 ring-primary/20 xl:p-10 relative overflow-hidden hover:translate-y-[-8px] transition-all duration-300">
            <div className="absolute top-0 right-0">
              <div className="bg-primary text-white py-1 px-4 rounded-bl-lg font-medium text-sm flex items-center">
                <Star className="h-4 w-4 mr-1" /> Best Value
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-xl font-semibold leading-8 text-foreground">
                  Yearly
                </h3>
                <p className="rounded-full bg-primary-800/10 px-2.5 py-1 text-xs font-semibold leading-5 text-primary">
                  Save 18%
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-400">
                Best value for committed career growth
              </p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-5xl font-bold tracking-tight text-primary">$89</span>
                <span className="text-sm font-semibold leading-6 text-gray-400">/year</span>
              </p>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-400">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button 
              className="mt-8 gradient-button w-full py-6 h-auto text-lg font-medium"
              onClick={() => handleSubscription("yearly")}
              disabled={loading.yearly}
            >
              {loading.yearly ? "Processing..." : "Subscribe Yearly"}
            </Button>
          </div>
        </div>
        <div className="mt-12 text-center text-gray-500 text-sm">
          Secure payment processing by Razorpay • 30-day money-back guarantee
        </div>
      </div>
    </div>
  );
};
