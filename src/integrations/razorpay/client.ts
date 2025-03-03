
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
    
    // Mock order ID for testing - in production this would call your backend
    // In a real implementation, remove this and uncomment the fetch code below
    const mockOrderId = "order_" + Math.random().toString(36).substring(2, 15);
    console.log("Created mock order ID for testing:", mockOrderId);
    return mockOrderId;
    
    /* Uncomment this when your edge function is working
    // Call our edge function to create an order
    const response = await fetch('/api/create-razorpay-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ planId, interval }),
    });
    
    if (!response.ok) {
      console.error('Error response status:', response.status);
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error('Failed to create order: ' + errorText);
    }
    
    const data = await response.json();
    console.log("Order created successfully:", data);
    return data.orderId;
    */
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
  const razorpay = new window.Razorpay(options);
  console.log("Opening Razorpay payment modal...");
  razorpay.open();
};
