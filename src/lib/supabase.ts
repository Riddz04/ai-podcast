import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      podcasts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          topic: string;
          personality1: string;
          personality2: string;
          script: string;
          audio_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          topic: string;
          personality1: string;
          personality2: string;
          script: string;
          audio_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          topic?: string;
          personality1?: string;
          personality2?: string;
          script?: string;
          audio_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};