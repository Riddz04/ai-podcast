import { supabase } from './supabase';
import { Database } from './supabase';

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

type PodcastRow = Database['public']['Tables']['podcasts']['Row'];
type PodcastInsert = Database['public']['Tables']['podcasts']['Insert'];

// Convert Supabase row to our PodcastData interface
const convertToPodcastData = (row: PodcastRow): PodcastData => ({
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
});

// Convert our PodcastData to Supabase insert format
const convertToSupabaseInsert = (data: PodcastData): PodcastInsert => ({
  user_id: data.userId,
  title: data.title,
  topic: data.topic,
  personality1: data.personality1,
  personality2: data.personality2,
  script: data.script,
  audio_url: data.audioUrl || null,
});

export const savePodcast = async (podcastData: PodcastData, audioBase64?: string): Promise<string> => {
  try {
    // First, insert the podcast metadata
    const { data: podcast, error: insertError } = await supabase
      .from('podcasts')
      .insert(convertToSupabaseInsert(podcastData))
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting podcast:', insertError);
      throw insertError;
    }

    let audioUrl: string | undefined;

    // If audio data is provided, upload it to Supabase Storage
    if (audioBase64 && podcast) {
      try {
        // Convert base64 to blob
        const base64Data = audioBase64.split(',')[1] || audioBase64;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });

        // Upload to Supabase Storage
        const fileName = `${podcastData.userId}/${podcast.id}.mp3`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('podcast-audio')
          .upload(fileName, audioBlob, {
            contentType: 'audio/mpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading audio:', uploadError);
          // Don't throw here, just log the error and continue without audio
        } else {
          // Get the public URL for the uploaded file
          const { data: urlData } = supabase.storage
            .from('podcast-audio')
            .getPublicUrl(fileName);

          audioUrl = urlData.publicUrl;

          // Update the podcast record with the audio URL
          const { error: updateError } = await supabase
            .from('podcasts')
            .update({ audio_url: audioUrl })
            .eq('id', podcast.id);

          if (updateError) {
            console.error('Error updating podcast with audio URL:', updateError);
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
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching podcasts:', error);
      throw error;
    }

    return data.map(convertToPodcastData);
  } catch (error) {
    console.error('Error getting user podcasts:', error);
    throw error;
  }
};

export const deletePodcast = async (podcastId: string, userId: string): Promise<void> => {
  try {
    // First, get the podcast to check if it has an audio file
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('audio_url')
      .eq('id', podcastId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching podcast for deletion:', fetchError);
      throw fetchError;
    }

    // Delete audio file from storage if it exists
    if (podcast?.audio_url) {
      try {
        const fileName = `${userId}/${podcastId}.mp3`;
        const { error: deleteStorageError } = await supabase.storage
          .from('podcast-audio')
          .remove([fileName]);

        if (deleteStorageError) {
          console.error('Error deleting audio file:', deleteStorageError);
          // Continue with podcast deletion even if audio deletion fails
        }
      } catch (storageError) {
        console.error('Error deleting audio file:', storageError);
        // Continue with podcast deletion
      }
    }

    // Delete the podcast record
    const { error: deleteError } = await supabase
      .from('podcasts')
      .delete()
      .eq('id', podcastId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting podcast:', deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('Error deleting podcast:', error);
    throw error;
  }
};