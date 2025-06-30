/*
  # Create podcasts table

  1. New Tables
    - `podcasts`
      - `id` (uuid, primary key)
      - `user_id` (text, not null) - Firebase Auth UID
      - `title` (text, not null)
      - `topic` (text, not null)
      - `personality1` (text, not null)
      - `personality2` (text, not null)
      - `script` (text, not null)
      - `audio_url` (text, nullable) - URL to audio file in Supabase Storage
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `podcasts` table
    - Add policy for users to manage their own podcasts
    - Add policy for users to read their own podcasts

  3. Storage
    - Create storage bucket for podcast audio files
    - Set up RLS policies for storage bucket
*/

-- Create podcasts table
CREATE TABLE IF NOT EXISTS podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  topic text NOT NULL,
  personality1 text NOT NULL,
  personality2 text NOT NULL,
  script text NOT NULL,
  audio_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;

-- Create policies for podcasts table
CREATE POLICY "Users can view their own podcasts"
  ON podcasts
  FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own podcasts"
  ON podcasts
  FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own podcasts"
  ON podcasts
  FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own podcasts"
  ON podcasts
  FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create storage bucket for podcast audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('podcast-audio', 'podcast-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own audio files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'podcast-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own audio files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'podcast-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own audio files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'podcast-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own audio files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'podcast-audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_podcasts_updated_at
  BEFORE UPDATE ON podcasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();