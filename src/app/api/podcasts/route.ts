import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
export const runtime = 'nodejs' // 'nodejs' (default) | 'edge'
export const maxDuration = 30; // Maximum execution time in seconds
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
          // Process segments in chunks to avoid payload limits
          const CHUNK_SIZE = 5; // Process 5 segments at a time
          const processedUrls: string[] = [];

          for (let i = 0; i < validSegments.length; i += CHUNK_SIZE) {
            const chunk = validSegments.slice(i, i + CHUNK_SIZE);
            
            for (const segment of chunk) {
              try {
                // Clean base64 data - handle data URL format
                let base64Data: string;
                if (segment.audioBase64.includes(',')) {
                  base64Data = segment.audioBase64.split(',')[1];
                } else {
                  base64Data = segment.audioBase64;
                }

                // Validate base64 format
                if (!base64Data || base64Data.trim().length === 0) {
                  console.warn('Invalid base64 data for segment, skipping');
                  continue;
                }

                // Check base64 size before processing (approximate file size)
                const estimatedSize = (base64Data.length * 3) / 4;
                console.log('Estimated audio size:', estimatedSize, 'bytes');

                // Skip if file is too large (>4MB to be safe with Vercel limits)
                if (estimatedSize > 4 * 1024 * 1024) {
                  console.warn('Audio segment too large, skipping. Size:', estimatedSize);
                  continue;
                }

                // Convert base64 to buffer
                const audioBuffer = Buffer.from(base64Data, 'base64');
                
                console.log('Audio buffer created, size:', audioBuffer.length);

                // Validate minimum file size
                if (audioBuffer.length < 1000) {
                  console.warn('Audio file too small, likely corrupted, skipping');
                  continue;
                }

                // Create blob
                const audioBlob = new Blob([audioBuffer], { 
                  type: 'audio/mpeg' 
                });

                console.log('Audio blob created, size:', audioBlob.size);

                // Upload individual segment
                const fileName = `${podcast.id}_segment_${processedUrls.length}.mp3`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('podcast-audio')
                  .upload(fileName, audioBlob, {
                    contentType: 'audio/mpeg',
                    upsert: true
                  });

                if (uploadError) {
                  console.error('Error uploading audio segment:', uploadError);
                  continue; // Skip this segment but continue with others
                }

                console.log('Audio segment uploaded successfully:', uploadData);
                
                // Get the public URL
                const { data: urlData } = supabase.storage
                  .from('podcast-audio')
                  .getPublicUrl(fileName);

                processedUrls.push(urlData.publicUrl);
                
              } catch (segmentError) {
                console.error('Error processing individual segment:', segmentError);
                continue; // Skip this segment but continue with others
              }
            }
          }

          // Use the first successfully processed segment as the main audio
          if (processedUrls.length > 0) {
            finalAudioUrl = processedUrls[0];
            console.log('Using first processed audio URL:', finalAudioUrl);

            // Update the podcast record with the audio URL
            const { error: updateError } = await supabase
              .from('podcasts')
              .update({ 
                audio_url: finalAudioUrl,
                // Optionally store all segment URLs as JSON
                audio_segments: processedUrls.length > 1 ? processedUrls : null
              })
              .eq('id', podcast.id);

            if (updateError) {
              console.error('Error updating podcast with audio URL:', updateError);
              // Don't throw here, podcast is still created
            } else {
              console.log('Podcast updated with audio URL');
            }
          } else {
            console.log('No audio segments could be processed successfully');
          }
        } else {
          console.log('No valid audio segments found');
        }
      } catch (audioError) {
        console.error('Error processing audio segments:', audioError);
        
        // Check if it's specifically a payload size error
        if (
          audioError.message?.includes('too large') || 
          audioError.message?.includes('PAYLOAD_TOO_LARGE') ||
          audioError.message?.includes('Request Entity Too Large')
        ) {
          return NextResponse.json({
            podcastId: podcast.id,
            audioUrl: null,
            error: 'Audio file too large for processing. Try reducing audio quality or splitting into smaller segments.',
            errorType: 'PAYLOAD_TOO_LARGE'
          }, { status: 413 });
        }
        
        // Continue without audio but return warning
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
    
    // Enhanced payload size error detection
    if (
      error.message?.includes('too large') || 
      error.message?.includes('PAYLOAD_TOO_LARGE') ||
      error.message?.includes('Request Entity Too Large') ||
      error.code === 'FUNCTION_PAYLOAD_TOO_LARGE' ||
      error.code === 413
    ) {
      return NextResponse.json(
        { 
          error: 'Request payload too large. Audio data exceeds Vercel limits. Try reducing audio quality or length.',
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