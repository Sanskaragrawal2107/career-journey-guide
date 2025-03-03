
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  created_at: number;
}

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
    const { planId, interval } = await req.json();

    // Get the plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('Plan not found error:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amount based on interval
    const amount = interval === 'monthly' 
      ? Math.round(plan.price_monthly * 100) 
      : Math.round(plan.price_yearly * 100);

    // Your Razorpay credentials (using the ones provided)
    const razorpayKeyId = 'rzp_live_47mpRvV2Yh9XLZ';
    const razorpayKeySecret = '0je47WgWBGYVUQgpwYLpfHup';
    
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    console.log(`Creating Razorpay order for user: ${session.user.id}, plan: ${planId}, interval: ${interval}, amount: ${amount}`);
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'INR', // Using INR as it's Razorpay's default currency
        receipt: `order_${Date.now()}`,
        notes: {
          user_id: session.user.id,
          plan_id: planId,
          interval: interval,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error('Razorpay order creation failed:', errorData);
      
      return new Response(
        JSON.stringify({ error: 'Failed to create Razorpay order', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData: RazorpayOrder = await orderResponse.json();
    console.log('Razorpay order created successfully:', orderData.id);

    return new Response(
      JSON.stringify({ 
        orderId: orderData.id,
        amount: orderData.amount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
