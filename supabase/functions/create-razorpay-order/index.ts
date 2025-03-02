
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

serve(async (req) => {
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
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amount based on interval
    const amount = interval === 'monthly' 
      ? Math.round(plan.price_monthly * 100) 
      : Math.round(plan.price_yearly * 100);

    // Create the order with Razorpay API
    const razorpayKey = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!razorpayKey || !razorpaySecret) {
      return new Response(
        JSON.stringify({ error: 'Razorpay credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const auth = btoa(`${razorpayKey}:${razorpaySecret}`);
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'USD',
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
        JSON.stringify({ error: 'Failed to create Razorpay order' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orderData: RazorpayOrder = await orderResponse.json();

    return new Response(
      JSON.stringify({ 
        orderId: orderData.id,
        amount: orderData.amount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
