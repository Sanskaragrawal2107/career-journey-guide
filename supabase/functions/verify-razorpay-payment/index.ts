
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

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

  const { paymentId, orderId, signature, userId, planType, planDays, amount } = reqData;

  if (!paymentId || !orderId || !signature || !userId || !planType || !planDays) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify signature
    const key_secret = Deno.env.get("RAZORPAY_KEY_SECRET") || "0je47WgWBGYVUQgpwYLpfHup";
    const hmac = createHmac("sha256", key_secret);
    hmac.update(orderId + "|" + paymentId);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== signature) {
      throw new Error("Payment verification failed");
    }

    // Create Supabase client
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not set");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate subscription dates
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + parseInt(planDays));

    // Save subscription to database
    const { data: subscription, error } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan_id: planType === "monthly" ? "monthly" : "yearly",
        current_period_start: now.toISOString(),
        current_period_end: endDate.toISOString(),
        payment_method: "razorpay",
        payment_id: paymentId,
        status: "active"
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      throw new Error("Failed to save subscription");
    }

    return new Response(JSON.stringify({ success: true, subscription }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
