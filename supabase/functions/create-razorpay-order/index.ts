
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.1.0';

// These should be set as secrets in the Supabase dashboard
const RAZORPAY_KEY_ID = "rzp_live_47mpRvV2Yh9XLZ";
const RAZORPAY_KEY_SECRET = "0je47WgWBGYVUQgpwYLpfHup";

// Supabase client setup
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const { planId, interval } = await req.json();
    console.log(`Received order creation request for plan: ${planId}, interval: ${interval}`);

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract and validate the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Authenticated user: ${user.id}`);

    // Fetch plan details
    const { data: plans, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plans) {
      console.log('No plans found in database, using fallback price');
      // Use fallback price if plan not found in database
      const amount = interval === 'monthly' ? 900 : 8900; // Default: $9 monthly or $89 yearly
      
      console.log(`Creating order for user ${user.id}, plan ${planId}, amount ${amount}`);

      // Create Razorpay order
      const razorpayUrl = 'https://api.razorpay.com/v1/orders';
      const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      
      const orderResponse = await fetch(razorpayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          currency: 'USD',
          receipt: `order_${user.id}_${Date.now()}`,
          notes: {
            userId: user.id,
            planId: planId,
            interval: interval,
          },
        }),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('Razorpay order creation failed:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to create Razorpay order' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const orderData = await orderResponse.json();
      console.log('Order created successfully:', orderData.id);
      
      return new Response(JSON.stringify({ orderId: orderData.id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate amount
    const amount = interval === 'monthly' ? plans.price_monthly * 100 : plans.price_yearly * 100;
    
    console.log(`Creating order for user ${user.id}, plan ${planId}, amount ${amount}`);

    // Create Razorpay order
    const razorpayUrl = 'https://api.razorpay.com/v1/orders';
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    const orderResponse = await fetch(razorpayUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'USD',
        receipt: `order_${user.id}_${Date.now()}`,
        notes: {
          userId: user.id,
          planId: planId,
          interval: interval,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Razorpay order creation failed:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create Razorpay order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderData = await orderResponse.json();
    console.log('Order created successfully:', orderData.id);
    
    return new Response(JSON.stringify({ orderId: orderData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
