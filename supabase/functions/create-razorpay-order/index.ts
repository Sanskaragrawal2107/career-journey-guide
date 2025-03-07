import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Log the environment variables (for debugging)
    console.log("Using Razorpay Key ID:", key_id);
    console.log("Using Request Data:", { amount, currency, userId, planType, planDays });

    // Base64 encode the API key and secret for authorization
    const authToken = btoa(`${key_id}:${key_secret}`);

    // Generate a shorter receipt ID (must be <= 40 chars)
    // Extract just the first part of the UUID to keep it shorter
    const shortUserId = userId.split('-')[0];
    const timestamp = Date.now().toString().slice(-8); // Use just the last 8 digits of timestamp
    const receipt = `rcpt_${shortUserId}_${timestamp}`;
    
    console.log("Generated receipt ID:", receipt, "length:", receipt.length);

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
        receipt,
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
      return new Response(JSON.stringify({ 
        error: orderData.error?.description || "Failed to create order",
        details: orderData
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
