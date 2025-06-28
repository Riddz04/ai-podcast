import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { use } from 'react';

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

// DELETE /api/podcasts/[id] - Delete a podcast
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const podcastId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log('Deleting podcast:', podcastId, 'for user:', userId);

    const supabase = getSupabaseAdmin();

    // First, get the podcast to check if it has an audio file
    const { data: podcast, error: fetchError } = await supabase
      .from('podcasts')
      .select('audio_url')
      .eq('id', podcastId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching podcast for deletion:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch podcast: ${fetchError.message}` },
        { status: 500 }
      );
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
        } else {
          console.log('Audio file deleted successfully');
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
      return NextResponse.json(
        { error: `Failed to delete podcast: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('Podcast deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/podcasts/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}