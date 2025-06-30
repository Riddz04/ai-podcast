'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { savePodcast } from '@/lib/podcastService';
import { toast } from '@/components/ui/use-toast';
import { AudioPlayer } from '@/components/AudioPlayer';

interface Personality {
  name: string;
  voice: string;
}

interface PodcastSegment {
  personality: string;
  text: string;
  audioUrl: string | null;
  error?: string;
}

interface AudioSegment {
  speaker: string;
  text: string;
  isPersonality1: boolean;
  segmentIndex: number;
  audioBase64: string | null;
  voiceId: string | null;
  duration?: number;
  error?: string;
}

interface PodcastData {
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

export default function DialogueScriptForm() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [personalities, setPersonalities] = useState<Personality[]>([{ name: '', voice: '' }, { name: '', voice: '' }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSegments, setGeneratedSegments] = useState<PodcastSegment[]>([]);
  const [fullScript, setFullScript] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [rawAudioSegments, setRawAudioSegments] = useState<AudioSegment[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const handleTopicChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTopic(e.target.value);
  };

  const handlePersonalityNameChange = (index: number, value: string) => {
    const newPersonalities = [...personalities];
    newPersonalities[index].name = value;
    setPersonalities(newPersonalities);
  };

  const handlePersonalityVoiceChange = (index: number, value: string) => {
    const newPersonalities = [...personalities];
    newPersonalities[index].voice = value;
    setPersonalities(newPersonalities);
  };

  // Personalities are fixed at 2 as required

  const isValidAudioUrl = (url: string | null): boolean => {
    if (!url || url.trim() === '') return false;
    if (url === window.location.href) return false;
    
    try {
      return url.startsWith('data:audio/') || url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  // Fixed audio merging function
  const mergeAudioSegments = async (segments: AudioSegment[]): Promise<string | null> => {
    try {
      const validSegments = segments.filter(segment => segment.audioBase64 && !segment.error);
      
      if (validSegments.length === 0) {
        console.log('No valid segments to merge');
        return null;
      }

      if (validSegments.length === 1) {
        return validSegments[0].audioBase64;
      }

      // Use Web Audio API for proper merging
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffers: AudioBuffer[] = [];
      let totalDuration = 0;

      // Decode all audio segments
      for (let i = 0; i < validSegments.length; i++) {
        try {
          const segment = validSegments[i];
          // Convert base64 to ArrayBuffer
          const binaryString = atob(segment.audioBase64!);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          
          const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
          audioBuffers.push(audioBuffer);
          totalDuration += audioBuffer.duration;
          console.log(`Decoded segment ${i + 1}: ${audioBuffer.duration}s`);
        } catch (error) {
          console.error(`Error decoding audio segment ${i}:`, error);
        }
      }

      if (audioBuffers.length === 0) {
        console.log('No audio buffers decoded successfully');
        return null;
      }

      console.log(`Merging ${audioBuffers.length} segments, total duration: ${totalDuration}s`);

      // Calculate total length in samples
      const sampleRate = audioBuffers[0].sampleRate;
      const numberOfChannels = audioBuffers[0].numberOfChannels;
      const totalSamples = Math.floor(totalDuration * sampleRate);

      // Create merged buffer
      const mergedBuffer = audioContext.createBuffer(numberOfChannels, totalSamples, sampleRate);

      // Copy all buffers into the merged buffer
      let offsetSamples = 0;
      for (const buffer of audioBuffers) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = mergedBuffer.getChannelData(channel);
          const sourceData = buffer.getChannelData(channel);
          channelData.set(sourceData, offsetSamples);
        }
        offsetSamples += buffer.length;
      }

      // Convert merged buffer back to base64
      // Create a simple WAV file
      const length = mergedBuffer.length * numberOfChannels * 2;
      const buffer = new ArrayBuffer(44 + length);
      const view = new DataView(buffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numberOfChannels * 2, true);
      view.setUint16(32, numberOfChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length, true);

      // Convert float samples to 16-bit PCM
      let offset = 44;
      for (let i = 0; i < mergedBuffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, mergedBuffer.getChannelData(channel)[i]));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
          offset += 2;
        }
      }

      // Convert to base64
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      console.log('Audio merging completed successfully');
      return base64;
      
    } catch (error) {
      console.error('Error merging audio segments:', error);
      // Fallback: concatenate base64 strings (not ideal but better than losing data)
      const validSegments = segments.filter(segment => segment.audioBase64 && !segment.error);
      if (validSegments.length > 0) {
        console.log('Using fallback concatenation method');
        return validSegments.map(s => s.audioBase64).join('');
      }
      return null;
    }
  };

  // Fixed Play All function - simplified approach like your original code
const playAll = async (): Promise<void> => {
  if (currentlyPlaying !== null) {
    audioRefs.current[currentlyPlaying]?.pause();
    setCurrentlyPlaying(null);
    return;
  }

  // Check if any segments have audio
  const hasAudio = generatedSegments.some(segment => segment.audioUrl !== null);
  if (!hasAudio) {
    toast({
      title: "No Audio Available",
      description: "None of the segments have audio available. API quota may be exceeded.",
      variant: "destructive"
    });
    return;
  }

  for (let i = 0; i < generatedSegments.length; i++) {
    // Skip segments without audio
    if (!generatedSegments[i].audioUrl) {
      console.log(`Skipping segment ${i} - no audio available`);
      continue;
    }
    
    setCurrentlyPlaying(i);
    
    const audioElement = audioRefs.current[i];
    if (audioElement) {
      try {
        await audioElement.play();
        
        // Wait for this segment to finish
        await new Promise<void>((resolve, reject) => {
          const handleEnded = () => {
            audioElement.removeEventListener('ended', handleEnded);
            audioElement.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = (error: Event) => {
            audioElement.removeEventListener('ended', handleEnded);
            audioElement.removeEventListener('error', handleError);
            console.error(`Error playing segment ${i}:`, error);
            resolve(); // Continue to next segment even on error
          };
          
          audioElement.addEventListener('ended', handleEnded);
          audioElement.addEventListener('error', handleError);
        });
      } catch (error: unknown) {
        console.error(`Failed to play segment ${i}:`, error);
      }
    }
  }
  
  setCurrentlyPlaying(null);
};

  // Simple play segment function
  const playSegment = (index: number): void => {
    // Check if this segment has audio
    if (!generatedSegments[index].audioUrl) {
      toast({
        title: "Audio Unavailable",
        description: generatedSegments[index].error?.includes('quota_exceeded') 
          ? "ElevenLabs API quota exceeded. Try again later or contact support."
          : "Audio generation failed for this segment.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentlyPlaying === index) {
      audioRefs.current[index]?.pause();
      setCurrentlyPlaying(null);
    } else {
      if (currentlyPlaying !== null && audioRefs.current[currentlyPlaying]) {
        audioRefs.current[currentlyPlaying]?.pause();
      }
      audioRefs.current[index]?.play();
      setCurrentlyPlaying(index);
    }
  };

  const generatePodcast = async (): Promise<void> => {
    if (!topic || personalities.some(p => !p.name || !p.voice)) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields before generating the podcast.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedSegments([]);
    setFullScript('');
    setRawAudioSegments([]);

    try {
      const personality1 = personalities[0]?.name || '';
      const personality2 = personalities[1]?.name || '';
      const voice1Type = personalities[0]?.voice || 'male_confident';
      const voice2Type = personalities[1]?.voice || 'female_clear';
      
      const response = await fetch('/api/script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personality1,
          personality2,
          podcastTopic: topic,
          voice1Type,
          voice2Type
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        throw new Error(errorData.error || 'Failed to generate podcast');
      }

      const data = await response.json();
      
      const hasQuotaError = data.audioSegments?.some((segment: any) => 
        segment.error && segment.error.includes('quota_exceeded')
      );
      
      if (hasQuotaError) {
        toast({
          title: "API Quota Exceeded",
          description: "Some audio segments couldn't be generated due to ElevenLabs API quota limitations. You can still save the podcast with available audio or try again later.",
          variant: "destructive"
        });
      }
      
      setRawAudioSegments(data.audioSegments || []);
      
      const segments = (data.audioSegments || []).map((segment: any) => ({
        personality: segment.speaker || 'Unknown Speaker',
        text: segment.text || '',
        audioUrl: segment.audioBase64 && !segment.error ? `data:audio/mpeg;base64,${segment.audioBase64}` : null,
        error: segment.error
      }));
      
      setGeneratedSegments(segments);
      setFullScript(data.script || '');
      
      // Initialize refs
      audioRefs.current = new Array(segments.length).fill(null);
      
    } catch (error) {
      console.error('Error generating podcast:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Generation failed",
        description: `There was an error generating your podcast: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadScript = () => {
    if (!fullScript) {
      toast({
        title: "No Script Available",
        description: "Please generate a podcast first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const element = document.createElement('a');
      const file = new Blob([fullScript], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `podcast-script-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    } catch (error) {
      console.error('Error downloading script:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the script. Please try again.",
        variant: "destructive"
      });
    }
  };

  const savePodcastToLibrary = async (): Promise<void> => {
    if (!user || !fullScript || generatedSegments.length === 0) {
      toast({
        title: "Cannot save podcast",
        description: "Please generate a podcast first and make sure you're logged in.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const podcastTitle = topic.length > 50 
        ? `${topic.substring(0, 47)}...` 
        : topic;
      
      console.log('Starting audio merge process...');
      const mergedAudioBase64 = await mergeAudioSegments(rawAudioSegments);
      
      let audioSegmentsToSave;
      if (mergedAudioBase64) {
        // Save as single merged segment
        audioSegmentsToSave = [{
          speaker: 'Full Podcast',
          text: fullScript,
          isPersonality1: true,
          segmentIndex: 0,
          audioBase64: mergedAudioBase64,
          voiceId: null,
          duration: rawAudioSegments.reduce((total, segment) => total + (segment.duration || 0), 0)
        }];
        console.log('Merged audio created successfully');
      } else {
        // Fallback: save all individual segments
        audioSegmentsToSave = rawAudioSegments;
        console.log('Using individual segments as fallback');
      }

      const podcastId = await savePodcast({
        userId: user.id,
        title: podcastTitle,
        personality1: personalities[0]?.name || 'Speaker 1',
        personality2: personalities[1]?.name || 'Speaker 2',
        script: fullScript,
        topic,
      }, audioSegmentsToSave);

      toast({
        title: "Podcast saved",
        description: mergedAudioBase64 
          ? "Your podcast has been saved to your library with merged audio."
          : "Your podcast has been saved to your library with individual segments.",
      });
      
      const libraryTab = document.querySelector('[data-value="saved"]') as HTMLElement;
      if (libraryTab) {
        libraryTab.click();
      }
    } catch (error) {
      console.error('Error saving podcast:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Save failed",
        description: `There was an error saving your podcast: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update refs when segments change
  useEffect(() => {
    audioRefs.current = audioRefs.current.slice(0, generatedSegments.length);
  }, [generatedSegments]);

  return (
    <Card className="w-full max-w-4xl mx-auto bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-blue-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create Your Podcast</CardTitle>
        </div>
        <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
          Enter a topic and add personalities to generate a podcast conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
          <div className="space-y-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-5 rounded-xl border border-purple-100 dark:border-gray-600 shadow-sm">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-700 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <Label htmlFor="topic" className="text-lg font-semibold text-purple-800 dark:text-purple-300">Podcast Topic <span className="text-red-500 ml-1">*</span></Label>
            </div>
            <Textarea
              id="topic"
              placeholder="Enter a detailed description of what you want your podcast to be about..."
              value={topic}
              onChange={handleTopicChange}
              className="min-h-[120px] border-purple-200 dark:border-purple-900 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              required
            />
            <p className="text-sm text-purple-600 dark:text-purple-400 italic">Describe your podcast topic in detail for better results</p>
          </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Personalities (2 required)</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {personalities.map((personality, index) => (
              <div key={index} className="p-5 border rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 shadow-sm border-blue-100 dark:border-gray-600">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-800 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <Label htmlFor={`personality-${index}`} className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                      {index === 0 ? "Personality 1" : "Personality 2"} <span className="text-red-500 ml-1">*</span>
                    </Label>
                  </div>
                  <Input
                    id={`personality-${index}`}
                    placeholder="e.g., John, Expert, Host"
                    value={personality.name}
                    onChange={(e) => handlePersonalityNameChange(index, e.target.value)}
                    className="border-blue-200 dark:border-blue-900 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    required
                  />
                  <div className="space-y-2 mt-4">
                    <Label htmlFor={`voice-${index}`} className="text-sm font-medium flex items-center text-blue-700 dark:text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Select Voice
                    </Label>
                    <Select
                      value={personality.voice}
                      onValueChange={(value) => handlePersonalityVoiceChange(index, value)}
                    >
                      <SelectTrigger id={`voice-${index}`} className="border-blue-200 dark:border-blue-900 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male_confident">Male - Confident</SelectItem>
                        <SelectItem value="male_deep">Male - Deep</SelectItem>
                        <SelectItem value="male_friendly">Male - Friendly</SelectItem>
                        <SelectItem value="female_clear">Female - Clear</SelectItem>
                        <SelectItem value="female_young">Female - Young</SelectItem>
                        <SelectItem value="female_expressive">Female - Expressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button
          onClick={generatePodcast}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 rounded-md transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Generate Podcast
            </>
          )}
        </Button>

        {generatedSegments.length > 0 && (
          <div className="w-full space-y-6 mt-8">
            <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl border border-blue-100 dark:border-gray-600 shadow-sm">
              <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Generated Podcast
              </h3>
              <div className="flex space-x-3">
                <Button 
                  onClick={playAll}
                  variant="outline" 
                  size="sm"
                  disabled={!generatedSegments.some(s => s.audioUrl)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-green-500 shadow-sm hover:shadow transition-all duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isPlayingAll ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10 9v6m4-6v6" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    )}
                  </svg>
                  {isPlayingAll ? 'Stop All' : 'Play All'}
                </Button>
                <Button 
                  onClick={downloadScript} 
                  variant="outline" 
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-all duration-200 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Script
                </Button>
                <Button 
                  onClick={savePodcastToLibrary} 
                  variant="default" 
                  size="sm"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-sm hover:shadow"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Podcast
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {generatedSegments.map((segment, index) => (
                <div key={index} className="p-5 border rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-sm border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg flex items-center">
                      {index % 2 === 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      <span className={index % 2 === 0 ? "text-blue-700 dark:text-blue-300" : "text-purple-700 dark:text-purple-300"}>
                        {segment.personality}
                      </span>
                    </h4>
                    <div className="flex items-center space-x-2">
                      {currentlyPlaying === index && (
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                          Playing...
                        </span>
                      )}
                      <Button
                        onClick={() => playSegment(index)}
                        variant="outline"
                        size="sm"
                        className={index % 2 === 0 
                          ? "border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30" 
                          : "border-purple-200 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/30"}
                        disabled={!segment.audioUrl}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {currentlyPlaying === index ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6M9 9h1v6H9V9zm5 0h1v6h-1V9z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          )}
                        </svg>
                        {currentlyPlaying === index ? 'Pause' : 'Play'}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner mb-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{segment.text}</p>
                  </div>
                  
                  {segment.audioUrl && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <audio
                        ref={(el) => { audioRefs.current[index] = el; }}
                        src={segment.audioUrl}
                        onEnded={() => setCurrentlyPlaying(null)}
                        className="w-full"
                        controls
                      />
                    </div>
                  )}
                  
                  {!segment.audioUrl && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        No audio available for this segment.
                      </p>
                    </div>
                  )}
                  
                  {segment.error && (
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <strong>Error:</strong> {segment.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-indigo-100 dark:border-gray-600 shadow-sm">
              <h3 className="text-lg font-semibold mb-3 text-indigo-800 dark:text-indigo-300 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Full Script
              </h3>
              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-indigo-200 dark:border-indigo-900/50 shadow-inner">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed overflow-auto max-h-[300px]">
                  {fullScript}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}