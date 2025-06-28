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

export const savePodcast = async (podcastData: PodcastData, audioSegments?: any[]): Promise<string> => {
  try {
    console.log('Saving podcast with data:', podcastData);

    const response = await fetch('/api/podcasts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        podcastData,
        audioSegments: audioSegments || []
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to save podcast' };
      }
      throw new Error(errorData.error || 'Failed to save podcast');
    }

    const result = await response.json();
    console.log('Podcast saved successfully:', result.podcastId);
    
    return result.podcastId;
  } catch (error) {
    console.error('Error saving podcast:', error);
    throw error;
  }
};

export const getUserPodcasts = async (userId: string): Promise<PodcastData[]> => {
  try {
    console.log('Fetching podcasts for user:', userId);

    const response = await fetch(`/api/podcasts?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to fetch podcasts' };
      }
      throw new Error(errorData.error || 'Failed to fetch podcasts');
    }

    const result = await response.json();
    console.log('Podcasts fetched successfully:', result.podcasts?.length || 0);
    
    return result.podcasts || [];
  } catch (error) {
    console.error('Error getting user podcasts:', error);
    throw error;
  }
};

export const deletePodcast = async (podcastId: string, userId: string): Promise<void> => {
  try {
    console.log('Deleting podcast:', podcastId, 'for user:', userId);

    const response = await fetch(`/api/podcasts/${podcastId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to delete podcast' };
      }
      throw new Error(errorData.error || 'Failed to delete podcast');
    }

    console.log('Podcast deleted successfully');
  } catch (error) {
    console.error('Error deleting podcast:', error);
    throw error;
  }
};