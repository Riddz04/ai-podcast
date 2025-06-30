import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";

const openai = new OpenAI({
  baseURL: "https://api.novita.ai/v3/openai",
  apiKey: process.env.NOVITA_API_KEY as string,
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY as string;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// Define a type for the voice keys
type VoiceKey = keyof typeof PERSONALITY_VOICES;

// Voice assignments for different personality types
const PERSONALITY_VOICES = {
  // Male voices
  "male_confident": "AZnzlk1XvdvUeBnXmlld", // Domi
  "male_deep": "TxGEqnHWrfWFTfGW9XjX",      // Josh
  "male_friendly": "ErXwobaYiN019PkySvjV",    // Antoni
  
  // Female voices
  "female_clear": "21m00Tcm4TlvDq8ikWAM",    // Rachel
  "female_young": "EXAVITQu4vr4xnSDxMaL",    // Bella
  "female_expressive": "MF3mGyEYCl7XYWbV9V6O", // Elli
  
  // Default fallbacks
  "default_male": "AZnzlk1XvdvUeBnXmlld",
  "default_female": "21m00Tcm4TlvDq8ikWAM"
} as const; 

interface YoutubePodcastRequestBody {
  youtubeUrl: string;
  personality1: string;
  personality2: string;
  voice1Type?: VoiceKey;
  voice2Type?: VoiceKey;
  podcastStyle?: 'discussion' | 'interview' | 'debate' | 'analysis';
  focusAspects?: string[]; // Specific aspects to focus on from the video
}

interface ScriptSegment {
  speaker: string;
  text: string;
  isPersonality1: boolean;
}

interface AudioSegment extends ScriptSegment {
  segmentIndex: number;
  audioBase64: string | null;
  voiceId: string | null;
  duration?: number;
  error?: string;
}

interface VideoInfo {
  title: string;
  description: string;
  duration?: string;
  uploadDate?: string;
  channel?: string;
}

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  try {
    // Validate environment variables
    if (!process.env.NOVITA_API_KEY) {
      console.error('NOVITA_API_KEY is not configured.');
      return NextResponse.json(
        { error: "Server configuration error: NOVITA_API_KEY missing." }, 
        { status: 500 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY is not configured.');
      return NextResponse.json(
        { error: "Server configuration error: ELEVENLABS_API_KEY missing." }, 
        { status: 500 }
      );
    }

    // Parse and validate request body
    let requestBody: YoutubePodcastRequestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" }, 
        { status: 400 }
      );
    }

    const { 
      youtubeUrl,
      personality1, 
      personality2, 
      voice1Type = "male_confident", 
      voice2Type = "female_clear",
      podcastStyle = "discussion",
      focusAspects = []
    } = requestBody;

    if (!youtubeUrl || !personality1 || !personality2) {
      return NextResponse.json(
        { error: "youtubeUrl, personality1, and personality2 are required" }, 
        { status: 400 }
      );
    }

    // Validate YouTube URL format
    if (!isValidYouTubeUrl(youtubeUrl)) {
      return NextResponse.json(
        { error: "Invalid YouTube URL format" }, 
        { status: 400 }
      );
    }

    console.log("Starting YouTube podcast generation...");

    // Step 1: Extract YouTube content and metadata
    const { transcription, videoInfo } = await extractYoutubeContent(youtubeUrl);
    console.log(`Extracted transcription of length ${transcription.length}  transcription: ${transcription.substring(0, 100)}...`);

    // Step 2: Generate the podcast script based on YouTube content
    const script = await generateScriptFromYoutube(
      transcription, 
      videoInfo, 
      personality1, 
      personality2, 
      podcastStyle,
      focusAspects
    );
    
    // Step 3: Parse script into segments
    const segments: ScriptSegment[] = parseScript(script, personality1, personality2);
    
    // Step 4: Generate audio for each segment
    const audioSegments: AudioSegment[] = await generateAudioSegments(segments, voice1Type, voice2Type);
    
    return NextResponse.json({
      success: true,
      script: script,
      segments: segments,
      audioSegments: audioSegments,
      personalities: { personality1, personality2 },
      sourceVideo: {
        url: youtubeUrl,
        title: videoInfo.title,
        description: videoInfo.description,
        channel: videoInfo.channel
      },
      podcastStyle: podcastStyle,
      totalSegments: audioSegments.length,
      transcriptionLength: transcription.length
    });

  } catch (error) {
    console.error('YouTube podcast generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate podcast from YouTube video';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
};

function isValidYouTubeUrl(url: string): boolean {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+(&[\w=]*)?$/;
  return youtubeRegex.test(url);
}

async function extractYoutubeContent(youtubeUrl: string): Promise<{ transcription: string; videoInfo: VideoInfo }> {
  try {
    console.log(`Loading YouTube content from: ${youtubeUrl}`);
    
    const loader = YoutubeLoader.createFromUrl(youtubeUrl, {
      language: "en",
      addVideoInfo: true,
    });

    const docs = await loader.load();
    
    if (!docs || docs.length === 0) {
      throw new Error("No content extracted from YouTube video");
    }

    const doc = docs[0];
    const transcription = doc.pageContent;
    
    if (!transcription || transcription.trim().length === 0) {
      throw new Error("No transcription available for this YouTube video");
    }

    // Extract video metadata
    const metadata = doc.metadata || {};
    const videoInfo: VideoInfo = {
      title: metadata.title || "Unknown Title",
      description: metadata.description || "",
      duration: metadata.duration || undefined,
      uploadDate: metadata.upload_date || undefined,
      channel: metadata.channel || metadata.author || undefined
    };

    console.log(`Successfully extracted ${transcription.length} characters of transcription`);
    console.log(`Video title: ${videoInfo.title}`);
    
    return { transcription, videoInfo };
  } catch (error) {
    console.error('Error extracting YouTube content:', error);
    if (error instanceof Error) {
      if (error.message.includes('unavailable') || error.message.includes('private')) {
        throw new Error("This YouTube video is not available or private");
      } else if (error.message.includes('transcript')) {
        throw new Error("No transcript/captions available for this YouTube video");
      }
    }
    throw new Error(`Failed to extract YouTube content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateScriptFromYoutube(
  transcription: string, 
  videoInfo: VideoInfo, 
  personality1: string, 
  personality2: string,
  podcastStyle: string,
  focusAspects: string[]
): Promise<string> {
  try {
    // Truncate transcription if too long (keep within token limits)
    const maxTranscriptionLength = 3000;
    const truncatedTranscription = transcription.length > maxTranscriptionLength 
      ? transcription.substring(0, maxTranscriptionLength) + "..." 
      : transcription;

    const focusSection = focusAspects.length > 0 
      ? `\n\nFocus particularly on these aspects: ${focusAspects.join(', ')}`
      : '';

    const styleInstructions = {
      discussion: "Create a balanced discussion where both personalities share insights and build on each other's points.",
      interview: `Have ${personality1} interview ${personality2} about the video content, with thoughtful questions and detailed responses.`,
      debate: "Create a respectful debate where the personalities take different perspectives on the video's content.",
      analysis: "Have both personalities analyze and break down the key points, offering their expert perspectives."
    };

    const prompt = `You are creating a ${podcastStyle} podcast based on a YouTube video transcription. 

VIDEO INFORMATION:
Title: "${videoInfo.title}"
Channel: ${videoInfo.channel || 'Unknown'}
Description: ${videoInfo.description ? videoInfo.description.substring(0, 200) + '...' : 'No description available'}

VIDEO TRANSCRIPTION:
${truncatedTranscription}
${focusSection}

Create a compelling ${podcastStyle} between ${personality1} and ${personality2} based on this video content.

PODCAST STYLE: ${styleInstructions[podcastStyle as keyof typeof styleInstructions]}

Format the script exactly like this:
[SPEAKER: ${personality1}]: [Their dialogue here]
[SPEAKER: ${personality2}]: [Their response here]

CRITICAL REQUIREMENTS:
- MODERATE LENGTH: 1 minute of dialogue
- Base the conversation entirely on the video content - reference specific points, quotes, or insights from the transcription
- ${personality1} and ${personality2} should discuss the video's main themes, arguments, or interesting points
- NO asterisks (*) or action descriptions - only spoken dialogue
- NO stage directions like *laughs* or *pauses* - just natural speech
- Each speaker should have distinct personality traits matching their real-world persona
- Make it sound natural and conversational, as if they both watched the video and are now discussing it
- Include brief introductions mentioning the source video
- Each speaker gets 8-12 exchanges
- Make sure each speaker has roughly equal speaking time
- Reference specific parts of the video content naturally in conversation
- End with brief conclusions and takeaways
- Use natural speech patterns without formatting symbols

The conversation should feel like two experts who have just watched "${videoInfo.title}" and are now sharing their thoughts and analysis.

Start the conversation now:`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "google/gemma-3-27b-it",
      stream: false,
      response_format: { type: "text" },
      max_tokens: 2000,
      temperature: 0.7
    });

    const generatedScript = completion.choices[0]?.message?.content;
    if (!generatedScript) {
      throw new Error("No script generated from AI");
    }

    console.log("Generated YouTube-based script:", generatedScript.substring(0, 500) + "...");
    return generatedScript;
  } catch (error) {
    console.error('Error generating script from YouTube content:', error);
    throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseScript(script: string, personality1: string, personality2: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  const lines = script.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const match = line.match(/\[SPEAKER:\s*([^\]]+)\]:\s*(.+)/);
    if (match) {
      const speaker = match[1].trim();
      const text = match[2].trim();
      
      // Clean up text - remove extra quotation marks, etc.
      const cleanText = text.replace(/^["']|["']$/g, '').trim();
      
      if (cleanText.length > 0) {
        segments.push({
          speaker: speaker,
          text: cleanText,
          isPersonality1: speaker === personality1
        });
      }
    }
  }
  
  if (segments.length === 0) {
    console.warn('No segments parsed from script, creating fallback segments');
    // Create fallback segments if parsing fails
    segments.push(
      {
        speaker: personality1,
        text: "Welcome everyone. Today we're discussing an interesting video that caught our attention.",
        isPersonality1: true
      },
      {
        speaker: personality2,
        text: "Absolutely. There were some fascinating points raised that I think our audience would find valuable.",
        isPersonality1: false
      }
    );
  }
  
  return segments;
}

async function generateAudioSegments(segments: ScriptSegment[], voice1Type: VoiceKey, voice2Type: VoiceKey): Promise<AudioSegment[]> {
  const audioSegments: AudioSegment[] = [];
  let quotaExceeded = false;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    let currentVoiceId: string | null = null;
    
    try {
      // If quota already exceeded, don't attempt ElevenLabs API calls
      if (quotaExceeded) {
        throw new Error('ElevenLabs quota exceeded, using fallback');
      }
      
      // Choose voice based on which personality is speaking
      currentVoiceId = segment.isPersonality1 
        ? PERSONALITY_VOICES[voice1Type] || PERSONALITY_VOICES.default_male
        : PERSONALITY_VOICES[voice2Type] || PERSONALITY_VOICES.default_female;
      
      console.log(`Generating audio for segment ${i + 1}/${segments.length}: ${segment.speaker}`);
      
      // Generate audio for this segment
      const audioData = await generateSingleAudio(segment.text, currentVoiceId);
      
      audioSegments.push({
        ...segment,
        segmentIndex: i,
        audioBase64: audioData,
        voiceId: currentVoiceId,
        duration: Math.ceil(segment.text.length / 10)
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error generating audio for segment ${i}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during audio generation';
      
      // Check if this is a quota exceeded error
      if (error instanceof Error && errorMessage.includes('quota_exceeded')) {
        console.log('ElevenLabs quota exceeded, switching to fallback for remaining segments');
        quotaExceeded = true;
      }
      
      // Generate a fallback audio or use a placeholder
      let fallbackAudio = null;
      try {
        fallbackAudio = await generateFallbackAudio(segment.text);
      } catch (fallbackError) {
        console.error('Fallback audio generation also failed:', fallbackError);
      }
      
      // Add a placeholder or fallback for failed segments
      audioSegments.push({
        ...segment,
        segmentIndex: i,
        audioBase64: fallbackAudio,
        error: errorMessage,
        voiceId: currentVoiceId
      });
    }
  }
  
  return audioSegments;
}

// Enhanced fallback audio generation
async function generateFallbackAudio(text: string): Promise<string | null> {
  try {
    // Create a simple audio tone as fallback
    const sampleRate = 22050;
    const duration = Math.min(text.length / 10, 5); // Max 5 seconds
    const samples = Math.floor(sampleRate * duration);
    
    // Create a simple sine wave
    const frequency = 440; // A4 note
    const amplitude = 0.1;
    
    const audioData = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      audioData[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }
    
    // Convert to WAV format (simplified)
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('Error generating fallback audio:', error);
    return null;
  }
}

async function generateSingleAudio(text: string, voiceId: string): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('Empty text provided for audio generation');
  }

  if (!voiceId) {
    throw new Error('No voice ID provided for audio generation');
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error response:', errorText);
      
      if (response.status === 429) {
        throw new Error('quota_exceeded: ElevenLabs API quota exceeded');
      } else if (response.status === 401) {
        throw new Error('ElevenLabs API authentication failed');
      } else if (response.status === 422) {
        throw new Error('ElevenLabs API validation error: Invalid voice ID or text');
      } else {
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }
    }

    const audioBuffer = await response.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      throw new Error('Empty audio response from ElevenLabs API');
    }

    return Buffer.from(audioBuffer).toString('base64');
  } catch (error) {
    console.error('Error in generateSingleAudio:', error);
    throw error;
  }
}