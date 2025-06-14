// pages/api/generate-podcast.js or app/api/generate-podcast/route.js
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.novita.ai/v3/openai",
  apiKey: process.env.NOVITA_API_KEY as string, // Assuming NOVITA_API_KEY is always set
});

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY as string; // Assuming ELEVENLABS_API_KEY is always set
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

interface PodcastRequestBody {
  personality1: string;
  personality2: string;
  podcastTopic: string;
  voice1Type?: VoiceKey;
  voice2Type?: VoiceKey;
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
  duration?: number; // Made optional as it's an estimate
  error?: string;    // For segments that failed
}

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const { 
      personality1, 
      personality2, 
      podcastTopic, 
      voice1Type = "male_confident", 
      voice2Type = "female_clear" 
    } = await req.json() as PodcastRequestBody;
    
    if (!process.env.NOVITA_API_KEY || !process.env.ELEVENLABS_API_KEY) {
      console.error('API keys are not configured.');
      return NextResponse.json(
        { error: "Server configuration error: API keys missing." }, 
        { status: 500 }
      );
    }

    if (!personality1 || !personality2 || !podcastTopic) {
      return NextResponse.json(
        { error: "personality1, personality2, and podcastTopic are required" }, 
        { status: 400 }
      );
    }

    console.log("Starting podcast generation...");

    // Step 1: Generate the script
    const script = await generateScript(personality1, personality2, podcastTopic);
    
    // Step 2: Parse script into segments
    const segments: ScriptSegment[] = parseScript(script, personality1, personality2);
    
    // Step 3: Generate audio for each segment
    const audioSegments: AudioSegment[] = await generateAudioSegments(segments, voice1Type, voice2Type);
    
    return NextResponse.json({
      success: true,
      script: script,
      segments: segments,
      audioSegments: audioSegments,
      personalities: { personality1, personality2 },
      topic: podcastTopic,
      totalSegments: audioSegments.length
    });

  } catch (error) {
    console.error('Podcast generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate podcast';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
};

async function generateScript(personality1: string, personality2: string, podcastTopic: string): Promise<string> {
  const prompt = `Create a short realistic podcast conversation between ${personality1} and ${personality2} about "${podcastTopic}". 

Format the script exactly like this:
[SPEAKER: ${personality1}]: [Their dialogue here]
[SPEAKER: ${personality2}]: [Their response here]

CRITICAL REQUIREMENTS:
- VERY SHORT: Maximum 2-3 minutes of dialogue (300-500 words total)
- Keep it concise for testing purposes
- NO asterisks (*) or action descriptions - only spoken dialogue
- NO stage directions like *laughs* or *pauses* - just natural speech
- Each speaker should have distinct personality traits matching their real-world persona
- Make it sound natural and conversational
- Include brief introductions and a quick conclusion
- Each speaker gets 4-6 short exchanges maximum
- Make sure each speaker has roughly equal speaking time
- Use natural speech patterns without formatting symbols

Example format:
[SPEAKER: ${personality1}]: Hey everyone, welcome to today's discussion about ${podcastTopic}. I'm really excited to dive into this topic.
[SPEAKER: ${personality2}]: Thanks for having me. This is such an important conversation to have right now.

Start the conversation now:`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "google/gemma-3-27b-it",
    stream: false,
    response_format: { type: "text" }
  });
   console.log("Generated script:", completion.choices[0]?.message?.content);
  return completion.choices[0]?.message?.content || "No script generated";
}

function parseScript(script: string, personality1: string, personality2: string): ScriptSegment[] {
  const segments = [];
  const lines = script.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const match = line.match(/\[SPEAKER:\s*([^\]]+)\]:\s*(.+)/);
    if (match) {
      const speaker = match[1].trim();
      const text = match[2].trim();
      
      // Clean up text - remove extra quotation marks, etc.
      const cleanText = text.replace(/^["']|["']$/g, '');
      
      if (cleanText.length > 0) {
        segments.push({
          speaker: speaker,
          text: cleanText,
          isPersonality1: speaker === personality1
        });
      }
    }
  }
  
  return segments;
}

async function generateAudioSegments(segments: ScriptSegment[], voice1Type: VoiceKey, voice2Type: VoiceKey): Promise<AudioSegment[]> {
  const audioSegments: AudioSegment[] = [];
  let quotaExceeded = false;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    let currentVoiceId: string | null = null; // To store the voiceId used
    
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
        ...segment, // Spread the original segment properties
        segmentIndex: i,
        audioBase64: audioData,
        voiceId: currentVoiceId,
        duration: Math.ceil(segment.text.length / 10) // Rough estimate: 10 chars per second
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
        // Here you could implement a fallback TTS solution
        // For now, we'll use a simple base64 placeholder
        fallbackAudio = await generateFallbackAudio(segment.text);
      } catch (fallbackError) {
        console.error('Fallback audio generation also failed:', fallbackError);
      }
      
      // Add a placeholder or fallback for failed segments
      audioSegments.push({
        ...segment, // Spread the original segment properties
        segmentIndex: i,
        audioBase64: fallbackAudio,
        error: errorMessage,
        voiceId: currentVoiceId // Log the voiceId that was attempted
      });
    }
  }
  
  return audioSegments;
}

// Simple fallback audio generation function
async function generateFallbackAudio(text: string): Promise<string | null> {
  // This is a placeholder function
  // In a real implementation, you would integrate with a free TTS service
  // or use the Web Speech API on the client side
  
  // For now, return null to indicate no audio available
  // The client can handle this by showing a message that audio is unavailable
  console.log('Using fallback audio generation for:', text.substring(0, 30) + '...');
  return null;
  
  // If you want to implement a real fallback, you could use:
  // 1. Browser's Web Speech API (client-side)
  // 2. A free TTS API with higher limits
  // 3. A local TTS solution
}

async function generateSingleAudio(text: string, voiceId: string): Promise<string> {
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
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer).toString('base64');
}