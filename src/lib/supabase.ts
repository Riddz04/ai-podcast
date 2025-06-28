import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('Current values:', { 
    supabaseUrl: supabaseUrl ? 'Set' : 'Missing', 
    supabaseAnonKey: supabaseAnonKey ? 'Set' : 'Missing' 
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for better security
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
    debug: process.env.NODE_ENV === 'development',
  },
  global: {
    headers: {
      'X-Client-Info': 'podcast-ai-app',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Helper function to get public URL for audio files
export const getPublicAudioUrl = (filePath: string) => {
  if (!filePath) return null;
  
  try {
    const { data } = supabase.storage
      .from('podcast-audio')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error getting public URL:', error);
    return null;
  }
};

// Helper function to check if audio file exists
export const checkAudioFileExists = async (filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('podcast-audio')
      .list(filePath.split('/')[0], {
        search: filePath.split('/')[1]
      });
    
    return !error && data && data.length > 0;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};

// Helper function to test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};