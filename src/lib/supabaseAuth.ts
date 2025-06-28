import { supabase } from './supabase';

// Set up Supabase auth session for RLS policies
export const setSupabaseAuthToken = async (firebaseToken: string) => {
  try {
    // Set the auth token for Supabase to use in RLS policies
    await supabase.auth.setSession({
      access_token: firebaseToken,
      refresh_token: '', // Not needed for our use case
    });
  } catch (error) {
    console.error('Error setting Supabase auth token:', error);
  }
};

// Alternative approach: Use service role key for admin operations
export const getSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return supabase;
};