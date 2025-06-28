import { supabase } from './supabase';

export interface PodcastData {
  id?: string;
  userId: string;
  title: string;
  topic: string;
  personality1: string;
  personality2: string;
  script: string;
  audioUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const savePodcast = async (podcastData: PodcastData, audioBase64?: string): Promise<string> => {
  try {
    console.log('Saving podcast with data:', podcastData);

    // Use service role key for admin operations to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Insert the podcast metadata using admin client
    const { data: podcast, error: insertError } = await adminClient
      .from('podcasts')
      .insert({
        user_id: podcastData.userId,
        title: podcastData.title,
        topic: podcastData.topic,
        personality1: podcastData.personality1,
        personality2: podcastData.personality2,
        script: podcastData.script,
        audio_url: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting podcast:', insertError);
      throw new Error(`Failed to insert podcast: ${insertError.message}`);
    }

    console.log('Podcast inserted successfully:', podcast);

    let audioUrl: string | undefined;

    // If audio data is provided, upload it to Supabase Storage
    if (audioBase64 && podcast) {
      try {
        console.log('Processing audio upload...');
        
        // Convert base64 to blob
        const base64Data = audioBase64.split(',')[1] || audioBase64;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });

        console.log('Audio blob created, size:', audioBlob.size);

        // Upload to Supabase Storage using admin client
        const fileName = `${podcastData.userId}/${podcast.id}.mp3`;
        const { data: uploadData, error: uploadError } = await adminClient.storage
          .from('podcast-audio')
          .upload(fileName, audioBlob, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading audio:', uploadError);
          // Don't throw here, just log the error and continue without audio
        } else {
          console.log('Audio uploaded successfully:', uploadData);
          
          // Get the public URL for the uploaded file
          const { data: urlData } = adminClient.storage
            .from('podcast-audio')
            .getPublicUrl(fileName);

          audioUrl = urlData.publicUrl;
          console.log('Audio URL generated:', audioUrl);

          // Update the podcast record with the audio URL
          const { error: updateError } = await adminClient
            .from('podcasts')
            .update({ audio_url: audioUrl })
            .eq('id', podcast.id);

          if (updateError) {
            console.error('Error updating podcast with audio URL:', updateError);
          } else {
            console.log('Podcast updated with audio URL');
          }
        }
      } catch (audioError) {
        console.error('Error processing audio:', audioError);
        // Continue without audio
      }
    }

    return podcast.id;
  } catch (error) {
    console.error('Error saving podcast:', error);
    throw error;
  }
};

export const getUserPodcasts = async (userId: string): Promise<PodcastData[]> => {
  try {
    console.log('Fetching podcasts for user:', userId);

    // Use service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data, error } = await adminClient
      .from('podcasts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching podcasts:', error);
      throw new Error(`Failed to fetch podcasts: ${error.message}`);
    }

    console.log('Podcasts fetched successfully:', data?.length || 0);

    // Convert to our interface format
    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      topic: row.topic,
      personality1: row.personality1,
      personality2: row.personality2,
      script: row.script,
      audioUrl: row.audio_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting user podcasts:', error);
    throw error;
  }
};

export const deletePodcast = async (podcastId: string, userId: string): Promise<void> => {
  try {
    console.log('Deleting podcast:', podcastId, 'for user:', userId);

    // Use service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    const { createClient } = await import('@supabase/supabase-js');
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, get the podcast to check if it has an audio file
    const { data: podcast, error: fetchError } = await adminClient
      .from('podcasts')
      .select('audio_url')
      .eq('id', podcastId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching podcast for deletion:', fetchError);
      throw new Error(`Failed to fetch podcast: ${fetchError.message}`);
    }

    // Delete audio file from storage if it exists
    if (podcast?.audio_url) {
      try {
        const fileName = `${userId}/${podcastId}.mp3`;
        const { error: deleteStorageError } = await adminClient.storage
          .from('podcast-audio')
          .remove([fileName]);

        if (deleteStorageError) {
          console.error('Error deleting audio file:', deleteStorageError);
          // Continue with podcast deletion even if audio deletion fails
        } else {
          console.log('Audio file deleted successfully');
        }
      } catch (storageError) {
        console.error('Error deleting audio file:', storageError);
        // Continue with podcast deletion
      }
    }

    // Delete the podcast record
    const { error: deleteError } = await adminClient
      .from('podcasts')
      .delete()
      .eq('id', podcastId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting podcast:', deleteError);
      throw new Error(`Failed to delete podcast: ${deleteError.message}`);
    }

    console.log('Podcast deleted successfully');
  } catch (error) {
    console.error('Error deleting podcast:', error);
    throw error;
  }
};