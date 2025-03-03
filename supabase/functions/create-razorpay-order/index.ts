
import { serve } from "https://deno.land/std@0.188.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    // Get request body
    const { planId, interval } = await req.json();
    
    console.log(`Creating order for plan: ${planId}, interval: ${interval}`);
    
    // Validate inputs
    if (!planId) {
      return new Response(
        JSON.stringify({ error: 'Plan ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!interval || !['monthly', 'yearly'].includes(interval)) {
      return new Response(
        JSON.stringify({ error: 'Valid interval (monthly or yearly) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the user who is making the request
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get the user data
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();
    
    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For testing purposes, generate a mock order ID
    // In production, you would use the Razorpay API to create an order
    const mockOrderId = `order_${Math.random().toString(36).substring(2, 15)}`;
    
    console.log(`Created mock order ID: ${mockOrderId} for testing`);
    
    // Store the order in the database for future verification
    const { error: insertError } = await supabaseClient
      .from('razorpay_orders')
      .insert({
        order_id: mockOrderId,
        user_id: user.id,
        plan_id: planId,
        interval: interval,
        amount: interval === 'monthly' ? plan.price_monthly * 100 : plan.price_yearly * 100,
        currency: 'USD',
        status: 'created'
      });
    
    if (insertError) {
      console.error('Error inserting order:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: mockOrderId,
        amount: interval === 'monthly' ? plan.price_monthly * 100 : plan.price_yearly * 100,
        currency: 'USD'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
