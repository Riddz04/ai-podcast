import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
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