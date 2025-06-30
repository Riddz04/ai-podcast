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

// GET /api/podcasts/[id] - Get a podcast by ID (for sharing)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params to fix Next.js 15 compatibility
    const params = await context.params;
    const podcastId = params.id;

    if (!podcastId) {
      return NextResponse.json(
        { error: 'Podcast ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching shared podcast:', podcastId);

    const supabase = getSupabaseAdmin();

    // Get the podcast
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', podcastId)
      .single();

    if (fetchError) {
      console.error('Error fetching podcast:', fetchError);
      
      if (fetchError.code === 'PGRST116') {
        // No rows returned - podcast doesn't exist
        return NextResponse.json(
          { error: 'Podcast not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch podcast: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }

    // Ensure audio URL is accessible
    let audioUrl = podcast.audio_url;
    if (audioUrl && !audioUrl.startsWith('http') && !audioUrl.startsWith('data:')) {
      // Convert storage path to public URL
      const { data: urlData } = supabase.storage
        .from('podcast-audio')
        .getPublicUrl(audioUrl);
      audioUrl = urlData.publicUrl;
    }

    // Format the response
    const formattedPodcast = {
      id: podcast.id,
      title: podcast.title,
      topic: podcast.topic,
      personality1: podcast.personality1,
      personality2: podcast.personality2,
      script: podcast.script,
      audioUrl: audioUrl || undefined,
      createdAt: podcast.created_at,
    };

    return NextResponse.json({ podcast: formattedPodcast });
  } catch (error) {
    console.error('Error in GET /api/podcasts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/podcasts/[id] - Delete a podcast
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params to fix Next.js 15 compatibility
    const params = await context.params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const podcastId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!podcastId) {
      return NextResponse.json(
        { error: 'podcastId is required' },
        { status: 400 }
      );
    }

    console.log('Deleting podcast:', podcastId, 'for user:', userId);

    const supabase = getSupabaseAdmin();

    // First, get the podcast to check if it exists and belongs to the user
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('audio_url, user_id')
      .eq('id', podcastId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching podcast for deletion:', fetchError);
      
      if (fetchError.code === 'PGRST116') {
        // No rows returned - podcast doesn't exist or doesn't belong to user
        return NextResponse.json(
          { error: 'Podcast not found or access denied' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch podcast: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found or access denied' },
        { status: 404 }
      );
    }

    // Delete audio file from storage if it exists
    if (podcast.audio_url) {
      try {
        // Extract the file path from the URL
        const url = new URL(podcast.audio_url);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const filePath = `${userId}/${fileName}`;
        
        console.log('Attempting to delete audio file:', filePath);
        
        const { error: deleteStorageError } = await supabase.storage
          .from('podcast-audio')
          .remove([filePath]);

        if (deleteStorageError) {
          console.error('Error deleting audio file:', deleteStorageError);
          // Continue with podcast deletion even if audio deletion fails
        } else {
          console.log('Audio file deleted successfully');
        }
      } catch (storageError) {
        console.error('Error processing audio file deletion:', storageError);
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
      console.error('Error deleting podcast record:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete podcast: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('Podcast deleted successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Podcast deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/podcasts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}