
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { createRazorpayOrder, initiateRazorpayPayment, loadRazorpayScript } from "@/integrations/razorpay/client";
import { useToast } from "@/components/ui/use-toast";
import { toast as sonnerToast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

interface LocationState {
  selectedInterval?: 'monthly' | 'yearly';
}

export const Subscription = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedInterval } = (location.state as LocationState) || {};
  const [currentPlanView, setCurrentPlanView] = useState<'monthly' | 'yearly'>(selectedInterval || 'monthly');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsAuthenticated(null); // Reset to loading state
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking auth:", error);
          setIsAuthenticated(false);
          return;
        }
        
        const isLoggedIn = !!data.session;
        setIsAuthenticated(isLoggedIn);
        
        if (!isLoggedIn) {
          console.log("User not authenticated, redirecting to auth page");
          toast({
            title: "Login Required",
            description: "Please sign in to access subscription plans"
          });
          
          // Use a small delay to ensure the state update completes before navigation
          setTimeout(() => {
            navigate("/auth", { 
              state: { 
                returnTo: "/subscription", 
                selectedInterval: currentPlanView 
              } 
            });
          }, 100);
        }
      } catch (error) {
        console.error('Error in checkAuth:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, [navigate, toast, currentPlanView]);

  // Load Razorpay script on component mount
  useEffect(() => {
    const loadScript = async () => {
      try {
        const isLoaded = await loadRazorpayScript();
        setRazorpayLoaded(isLoaded);
        if (!isLoaded) {
          toast({
            title: "Warning",
            description: "Failed to load payment system. Please refresh the page.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error loading Razorpay script:", error);
        setRazorpayLoaded(false);
      }
    };
    
    if (isAuthenticated) {
      loadScript();
    }
  }, [toast, isAuthenticated]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("subscription_plans")
          .select("*");

        if (error) throw error;
        
        if (!data || data.length === 0) {
          console.log("No subscription plans found in database. Using fallback plans.");
          // Fallback plans if none found in database
          setPlans([
            {
              id: "basic-plan",
              name: "Basic Plan",
              description: "Perfect for professionals starting their career journey",
              price_monthly: 9,
              price_yearly: 89,
              features: ["Resume Analysis", "Skill Gap Detection", "Career Path Suggestions", "Learning Resources", "Progress Tracking"]
            }
          ]);
        } else {
          console.log("Subscription plans loaded:", data);
          setPlans(data);
        }
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

    // Only fetch plans if user is authenticated
    if (isAuthenticated) {
      fetchPlans();
    }
  }, [toast, isAuthenticated]);

  const handleSubscription = async (planId: string, interval: 'monthly' | 'yearly') => {
    try {
      setProcessingPayment(true);
      
      // Double check authentication
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        toast({
          title: "Error",
          description: "You need to be logged in to subscribe",
          variant: "destructive",
        });
        navigate("/auth", { state: { returnTo: "/subscription", selectedInterval: interval } });
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

      if (!razorpayLoaded) {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast({
            title: "Error",
            description: "Failed to load payment system. Please refresh the page.",
            variant: "destructive",
          });
          return;
        }
        setRazorpayLoaded(true);
      }

      console.log("Creating Razorpay order for plan:", planId, "interval:", interval);
      
      try {
        // Get order ID from our backend
        const orderId = await createRazorpayOrder(planId, interval);
        console.log("Razorpay order created:", orderId);
        
        if (!orderId) {
          throw new Error("Failed to create order");
        }
        
        // Calculate amount based on interval (amount in paise/cents)
        const amount = interval === 'monthly' ? plan.price_monthly * 100 : plan.price_yearly * 100;
        
        console.log("Initializing Razorpay payment UI with amount:", amount);
        
        // Initialize Razorpay payment
        await initiateRazorpayPayment({
          key: "rzp_test_xMIW0MuY5AjA9z", // Test key for development
          amount: amount,
          currency: "USD",
          name: "CareerSarthi",
          description: `${plan.name} Subscription - ${interval}`,
          order_id: orderId,
          handler: async (response) => {
            console.log("Payment successful:", response);
            
            try {
              // Verify payment with our backend
              const { data, error } = await supabase.functions.invoke('verify-payment', {
                body: { 
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                  planId,
                  interval
                },
              });
              
              if (error) {
                console.error("Payment verification error:", error);
                sonnerToast.error("Payment verification failed. Please contact support.");
                return;
              }
              
              sonnerToast.success("Your subscription has been activated!");
              navigate("/dashboard");
            } catch (verifyError) {
              console.error("Error during payment verification:", verifyError);
              sonnerToast.error("Payment verification failed. Please contact support.");
            }
          },
          prefill: {
            email: data.user.email,
          },
          theme: {
            color: "#6366F1",
          },
          modal: {
            ondismiss: () => {
              setProcessingPayment(false);
              console.log("Payment modal dismissed by user");
            }
          }
        });
      } catch (error) {
        console.error("Payment initiation error:", error);
        throw error;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const toggleView = () => {
    setCurrentPlanView(currentPlanView === 'monthly' ? 'yearly' : 'monthly');
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, redirect happens in the useEffect, but show loading just in case
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2">Redirecting to login...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const filteredPlans = plans.filter(plan => 
    (currentPlanView === 'monthly' && plan.price_monthly > 0) || 
    (currentPlanView === 'yearly' && plan.price_yearly > 0)
  );

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
          <div className="mt-6">
            <Button 
              variant="outline" 
              onClick={toggleView}
              className="mt-4"
            >
              Switch to {currentPlanView === 'monthly' ? 'Yearly' : 'Monthly'} Plans
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  {currentPlanView === 'monthly' ? (
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
                  onClick={() => handleSubscription(
                    plan.id, 
                    currentPlanView === 'monthly' ? 'monthly' : 'yearly'
                  )}
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Subscribe ${currentPlanView === 'monthly' ? 'Monthly' : 'Yearly'}`
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
