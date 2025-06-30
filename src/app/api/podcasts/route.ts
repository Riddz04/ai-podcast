import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  
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
          const firstValidSegment = validSegments[0];
          
          // Clean base64 data - handle data URL format
          let base64Data: string;
          if (firstValidSegment.audioBase64.includes(',')) {
            base64Data = firstValidSegment.audioBase64.split(',')[1];
          } else {
            base64Data = firstValidSegment.audioBase64;
          }

          // Validate base64 format
          if (!base64Data || base64Data.trim().length === 0) {
            throw new Error('Invalid base64 data');
          }

          // Convert base64 to buffer (more reliable than atob() in server environment)
          const audioBuffer = Buffer.from(base64Data, 'base64');
          
          console.log('Audio buffer created, size:', audioBuffer.length);

          // Validate minimum file size
          if (audioBuffer.length < 1000) {
            throw new Error('Audio file too small, likely corrupted');
          }

          // Create blob
          const audioBlob = new Blob([audioBuffer], { 
            type: 'audio/mpeg' 
          });

          console.log('Audio blob created, size:', audioBlob.size);

          // Simple upload to Supabase Storage
          const fileName = `${podcast.id}.mp3`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('podcast-audio')
            .upload(fileName, audioBlob, {
              contentType: 'audio/mpeg',
              upsert: true
            });

          if (uploadError) {
            console.error('Error uploading audio:', uploadError);
            throw uploadError;
          }

          console.log('Audio uploaded successfully:', uploadData);
          
          // Get the public URL - simple version
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
            throw updateError;
          }

          console.log('Podcast updated with audio URL');
        } else {
          console.log('No valid audio segments found');
        }
      } catch (audioError) {
        console.error('Error processing audio segments:', audioError);
        
        // Continue without audio but log the error
        return NextResponse.json({
          podcastId: podcast.id,
          audioUrl: null,
          warning: 'Podcast created but audio processing failed',
          audioError: audioError.message
        });
      }
    }

    return NextResponse.json({ 
      podcastId: podcast.id,
      audioUrl: finalAudioUrl 
    });
  } catch (error) {
    console.error('Error in POST /api/podcasts:', error);
    
    // Check if it's a payload size error
    if (error.message?.includes('too large') || error.message?.includes('PAYLOAD_TOO_LARGE')) {
      return NextResponse.json(
        { 
          error: 'Audio file too large. Try reducing audio quality or length.',
          errorType: 'PAYLOAD_TOO_LARGE'
        },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}