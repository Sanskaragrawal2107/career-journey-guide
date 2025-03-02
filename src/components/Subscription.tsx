
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { createRazorpayOrder, initiateRazorpayPayment } from "@/integrations/razorpay/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

export const Subscription = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*");

        if (error) throw error;
        setPlans(data);
      } catch (error) {
        console.error("Error fetching plans:", error);
        toast({
          title: "Error",
          description: "Failed to load subscription plans",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);

  const handleSubscription = async (planId: string, interval: 'monthly' | 'yearly') => {
    try {
      setProcessingPayment(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You need to be logged in to subscribe",
          variant: "destructive",
        });
        return;
      }

      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        toast({
          title: "Error",
          description: "Invalid plan selected",
          variant: "destructive",
        });
        return;
      }

      // Get order ID from our backend
      const orderId = await createRazorpayOrder(planId, interval);
      
      // Calculate amount based on interval
      const amount = interval === 'monthly' ? plan.price_monthly * 100 : plan.price_yearly * 100;
      
      // Initialize Razorpay payment
      await initiateRazorpayPayment({
        key: "rzp_test_YourTestKey", // Replace with your Razorpay key
        amount: amount,
        currency: "USD",
        name: "CareerSarthi",
        description: `${plan.name} Subscription`,
        order_id: orderId,
        handler: async (response) => {
          // Verify payment on backend
          const verifyResponse = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: planId,
              interval: interval
            }),
          });

          if (verifyResponse.ok) {
            toast({
              title: "Success",
              description: "Your subscription has been activated",
            });
            navigate("/dashboard");
          } else {
            toast({
              title: "Error",
              description: "Payment verification failed",
              variant: "destructive",
            });
          }
          setProcessingPayment(false);
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#6366F1",
        },
      });
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose your plan
          </p>
          <p className="mt-4 text-lg text-gray-600">
            Unlock all features with a subscription
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  {plan.name.includes("Monthly") ? (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold">${plan.price_monthly}</span>
                      <span className="text-sm text-gray-600 ml-1">/month</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold">${plan.price_yearly}</span>
                      <span className="text-sm text-gray-600 ml-1">/year</span>
                      <span className="ml-2 rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary">
                        Save 18%
                      </span>
                    </div>
                  )}
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  disabled={processingPayment}
                  onClick={() => 
                    handleSubscription(
                      plan.id, 
                      plan.name.includes("Monthly") ? "monthly" : "yearly"
                    )
                  }
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Subscribe ${plan.name.includes("Monthly") ? "Monthly" : "Yearly"}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
