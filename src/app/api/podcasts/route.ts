import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// GET /api/podcasts?userId=xxx - Get user's podcasts
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log('Fetching podcasts for user:', userId);

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching podcasts:', error);
      return NextResponse.json(
        { error: `Failed to fetch podcasts: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Podcasts fetched successfully:', data?.length || 0);

    // Convert to our interface format and ensure audio URLs are accessible
    const podcasts = (data || []).map(row => {
      let audioUrl = row.audio_url;
      
      // If audio_url exists but doesn't start with http, it might be a storage path
      if (audioUrl && !audioUrl.startsWith('http') && !audioUrl.startsWith('data:')) {
        // Convert storage path to public URL
        const { data: urlData } = supabase.storage
          .from('podcast-audio')
          .getPublicUrl(audioUrl);
        audioUrl = urlData.publicUrl;
      }
      
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        topic: row.topic,
        personality1: row.personality1,
        personality2: row.personality2,
        script: row.script,
        audioUrl: audioUrl || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return NextResponse.json({ podcasts });
  } catch (error) {
    console.error('Error in GET /api/podcasts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/podcasts - Create a new podcast
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { podcastData, audioSegments } = body;

    console.log('Saving podcast with data:', podcastData);

    const supabase = getSupabaseAdmin();

    // Insert the podcast metadata
    const { data: podcast, error: insertError } = await supabase
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
      return NextResponse.json(
        { error: `Failed to insert podcast: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('Podcast inserted successfully:', podcast);

    let finalAudioUrl: string | undefined;

    // If audio segments are provided, combine them and upload
    if (audioSegments && Array.isArray(audioSegments) && audioSegments.length > 0) {
      try {
        console.log('Processing audio segments:', audioSegments.length);
        
        // Find segments with valid audio
        const validSegments = audioSegments.filter(segment => 
          segment.audioBase64 && 
          segment.audioBase64.trim() !== '' && 
          !segment.error
        );

        if (validSegments.length > 0) {
          // For now, use the first valid segment as the podcast audio
          // In the future, you could combine multiple segments
          const firstValidSegment = validSegments[0];
          
          // Convert base64 to blob
          const base64Data = firstValidSegment.audioBase64.includes(',') 
            ? firstValidSegment.audioBase64.split(',')[1] 
            : firstValidSegment.audioBase64;
          
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const audioBlob = new Blob([byteArray], { type: 'audio/mpeg' });

          console.log('Audio blob created, size:', audioBlob.size);

          // Upload to Supabase Storage with public access
          const fileName = `${podcastData.userId}/${podcast.id}.mp3`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('podcast-audio')
            .upload(fileName, audioBlob, {
              contentType: 'audio/mpeg',
              upsert: true,
              cacheControl: '3600'
            });

          if (uploadError) {
            console.error('Error uploading audio:', uploadError);
          } else {
            console.log('Audio uploaded successfully:', uploadData);
            
            // Get the public URL for the uploaded file
            const { data: urlData } = supabase.storage
              .from('podcast-audio')
              .getPublicUrl(fileName);

            finalAudioUrl = urlData.publicUrl;
            console.log('Audio URL generated:', finalAudioUrl);

            // Update the podcast record with the audio URL
            const { error: updateError } = await supabase
              .from('podcasts')
              .update({ audio_url: finalAudioUrl })
              .eq('id', podcast.id);

            if (updateError) {
              console.error('Error updating podcast with audio URL:', updateError);
            } else {
              console.log('Podcast updated with audio URL');
            }
          }
        } else {
          console.log('No valid audio segments found');
        }
      } catch (audioError) {
        console.error('Error processing audio segments:', audioError);
        // Continue without audio
      }
    }

    return NextResponse.json({ 
      podcastId: podcast.id,
      audioUrl: finalAudioUrl 
    });
  } catch (error) {
    console.error('Error in POST /api/podcasts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}