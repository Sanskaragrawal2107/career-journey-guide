
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHmac } from 'https://deno.land/std@0.170.0/node/crypto.ts';

const MONTH_IN_SECONDS = 30 * 24 * 60 * 60; // 30 days in seconds
const YEAR_IN_SECONDS = 365 * 24 * 60 * 60; // 365 days in seconds

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the session
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      plan_id,
      interval
    } = await req.json();

    // Verify the payment signature
    const razorpaySecret = '0je47WgWBGYVUQgpwYLpfHup';
    
    const generatedSignature = createHmac('sha256', razorpaySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Invalid payment signature');
      console.error(`Generated: ${generatedSignature}`);
      console.error(`Received: ${razorpay_signature}`);
      
      return new Response(
        JSON.stringify({ error: 'Invalid payment signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate subscription period
    const now = new Date();
    const startDate = now;
    const endDate = new Date(now);
    
    if (interval === 'monthly') {
      endDate.setSeconds(endDate.getSeconds() + MONTH_IN_SECONDS);
    } else if (interval === 'yearly') {
      endDate.setSeconds(endDate.getSeconds() + YEAR_IN_SECONDS);
    }

    console.log(`Creating subscription for user: ${session.user.id}, plan: ${plan_id}, interval: ${interval}`);
    console.log(`Start date: ${startDate.toISOString()}, End date: ${endDate.toISOString()}`);

    // Create/update the subscription record
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: session.user.id,
        plan_id: plan_id,
        status: 'active',
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        payment_method: 'razorpay',
        payment_id: razorpay_payment_id
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Subscription creation failed:', subscriptionError);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription', details: subscriptionError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Subscription created successfully:', subscription.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription: subscription,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
