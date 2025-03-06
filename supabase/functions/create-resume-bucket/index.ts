
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets()
    
    if (bucketsError) {
      throw new Error(`Failed to list buckets: ${bucketsError.message}`)
    }
    
    // Create bucket if it doesn't exist
    const bucketName = 'resume-uploads'
    const bucketExists = buckets.some(bucket => bucket.name === bucketName)
    
    if (!bucketExists) {
      const { error: createError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: false,
          allowedMimeTypes: ['application/pdf'],
          fileSizeLimit: 10485760, // 10MB
        })
      
      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`)
      }
      
      // Set up CORS policy
      const { error: corsError } = await supabase
        .storage
        .from(bucketName)
        .updateBucketCorsRules([
          {
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
            maxAgeSeconds: 3600,
          }
        ])
      
      if (corsError) {
        throw new Error(`Failed to set CORS policy: ${corsError.message}`)
      }
      
      // Create policy to allow authenticated users to upload
      const { error: policyError } = await supabase.rpc('create_storage_policy', {
        bucket_name: bucketName,
        policy_name: 'Allow uploads',
        definition: 'true',
        operation: 'INSERT'
      })
      
      if (policyError) {
        console.error(`Warning: Failed to create upload policy: ${policyError.message}`)
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Bucket created successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Bucket already exists' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating bucket:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
