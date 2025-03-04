
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get the request body
  let reqData;
  try {
    reqData = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { amount, currency, userId, planType, planDays } = reqData;

  if (!amount || !currency || !userId || !planType || !planDays) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const key_id = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_live_47mpRvV2Yh9XLZ";
    const key_secret = Deno.env.get("RAZORPAY_KEY_SECRET") || "0je47WgWBGYVUQgpwYLpfHup";

    // Base64 encode the API key and secret for authorization
    const authToken = btoa(`${key_id}:${key_secret}`);

    // Create a new order
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authToken}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: `receipt_${userId}_${Date.now()}`,
        notes: {
          userId,
          planType,
          planDays,
        },
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("Razorpay error:", orderData);
      throw new Error(orderData.error?.description || "Failed to create order");
    }

    // Return the order ID
    return new Response(JSON.stringify({ orderId: orderData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
