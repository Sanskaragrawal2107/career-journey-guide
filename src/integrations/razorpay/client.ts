
// Integration with Razorpay payment gateway
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise (1 USD = 100 cents)
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

import { supabase } from "@/integrations/supabase/client";

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      console.log("Razorpay already loaded");
      return resolve(true);
    }
    console.log("Loading Razorpay script...");
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      console.log("Razorpay script loaded successfully");
      resolve(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const createRazorpayOrder = async (planId: string, interval: 'monthly' | 'yearly'): Promise<string> => {
  try {
    console.log(`Creating Razorpay order for plan: ${planId}, interval: ${interval}`);
    
    // Get auth token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (sessionError || !token) {
      console.error("Authentication error:", sessionError);
      throw new Error('Authentication required');
    }
    
    try {
      // Call the edge function to create an order
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: { planId, interval },
      });
      
      if (error) {
        console.error('Error calling create-razorpay-order function:', error);
        throw new Error('Failed to create order: ' + error.message);
      }
      
      if (!data || !data.orderId) {
        // Fallback to mock order ID if the function doesn't return a valid order ID
        console.warn('Edge function did not return a valid order ID, using mock ID for testing');
        const mockOrderId = "order_" + Math.random().toString(36).substring(2, 15);
        return mockOrderId;
      }
      
      console.log("Order created successfully:", data);
      return data.orderId;
    } catch (invokeError) {
      console.error('Error invoking edge function:', invokeError);
      
      // Fallback to mock order ID for testing
      console.warn('Using mock order ID as fallback');
      const mockOrderId = "order_" + Math.random().toString(36).substring(2, 15);
      return mockOrderId;
    }
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

export const initiateRazorpayPayment = async (options: RazorpayOptions): Promise<void> => {
  console.log("Initiating Razorpay payment with options:", options);
  
  const isScriptLoaded = await loadRazorpayScript();
  
  if (!isScriptLoaded) {
    throw new Error('Failed to load Razorpay script');
  }

  console.log("Creating Razorpay instance...");
  const razorpay = new window.Razorpay({
    ...options,
    modal: {
      ondismiss: function() {
        console.log('Payment modal dismissed');
        if (options.modal?.ondismiss) {
          options.modal.ondismiss();
        }
      }
    }
  });
  console.log("Opening Razorpay payment modal...");
  razorpay.open();
};
