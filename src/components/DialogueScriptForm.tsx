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
  const [personalities, setPersonalities] = useState<Personality[]>([{ name: '', voice: '' }]);
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

  const addPersonality = () => {
    setPersonalities([...personalities, { name: '', voice: '' }]);
  };

  const removePersonality = (index: number) => {
    if (personalities.length > 1) {
      const newPersonalities = [...personalities];
      newPersonalities.splice(index, 1);
      setPersonalities(newPersonalities);
    }
  };

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
 // Clean and simple playAll function - similar to your working playSegment approach
const playAll = async () => {
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
        await new Promise((resolve, reject) => {
          const handleEnded = () => {
            audioElement.removeEventListener('ended', handleEnded);
            audioElement.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = (error) => {
            audioElement.removeEventListener('ended', handleEnded);
            audioElement.removeEventListener('error', handleError);
            console.error(`Error playing segment ${i}:`, error);
            resolve(); // Continue to next segment even on error
          };
          
          audioElement.addEventListener('ended', handleEnded);
          audioElement.addEventListener('error', handleError);
        });
      } catch (error) {
        console.error(`Failed to play segment ${i}:`, error);
      }
    }
  }
  
  setCurrentlyPlaying(null);
};

  // Simple play segment function
  const playSegment = (index: number) => {
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

  const generatePodcast = async () => {
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

  const savePodcastToLibrary = async () => {
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
    <Card className="w-full max-w-4xl mx-auto bg-card dark:bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create Your Podcast</CardTitle>
        <CardDescription>
          Enter a topic and add personalities to generate a podcast conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="topic">Podcast Topic</Label>
          <Textarea
            id="topic"
            placeholder="Enter a detailed description of what you want your podcast to be about..."
            value={topic}
            onChange={handleTopicChange}
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Personalities</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addPersonality}
              className="text-sm"
            >
              Add Personality
            </Button>
          </div>

          {personalities.map((personality, index) => (
            <div key={index} className="grid gap-4 p-4 border rounded-lg bg-background/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`personality-${index}`}>Name/Character</Label>
                  <Input
                    id={`personality-${index}`}
                    placeholder="e.g., John, Expert, Host"
                    value={personality.name}
                    onChange={(e) => handlePersonalityNameChange(index, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`voice-${index}`}>Voice</Label>
                  <Select
                    value={personality.voice}
                    onValueChange={(value) => handlePersonalityVoiceChange(index, value)}
                  >
                    <SelectTrigger id={`voice-${index}`}>
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
              {personalities.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removePersonality(index)}
                  className="w-full mt-2"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button
          onClick={generatePodcast}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2 rounded-md transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {isGenerating ? 'Generating...' : 'Generate Podcast'}
        </Button>

        {generatedSegments.length > 0 && (
          <div className="w-full space-y-6 mt-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Generated Podcast</h3>
              <div className="flex space-x-2">
                <Button 
                  onClick={playAll}
                  variant="outline" 
                  size="sm"
                  disabled={!generatedSegments.some(s => s.audioUrl)}
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                >
                  {isPlayingAll ? 'Stop All' : 'Play All'}
                </Button>
                <Button onClick={downloadScript} variant="outline" size="sm">
                  Download Script
                </Button>
                <Button 
                  onClick={savePodcastToLibrary} 
                  variant="default" 
                  size="sm"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Podcast'}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {generatedSegments.map((segment, index) => (
                <div key={index} className="p-4 border rounded-lg bg-background/50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">{segment.personality}</h4>
                    <div className="flex items-center space-x-2">
                      {currentlyPlaying === index && (
                        <span className="text-sm text-green-600 font-medium">Playing...</span>
                      )}
                      <Button
                        onClick={() => playSegment(index)}
                        variant="ghost"
                        size="sm"
                        className="text-primary"
                        disabled={!segment.audioUrl}
                      >
                        {currentlyPlaying === index ? 'Pause' : 'Play'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{segment.text}</p>
                  
                  {segment.audioUrl && (
                    <audio
                      ref={(el) => { audioRefs.current[index] = el; }}
                      src={segment.audioUrl}
                      onEnded={() => setCurrentlyPlaying(null)}
                      className="w-full"
                      controls
                    />
                  )}
                  
                  {!segment.audioUrl && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        No audio available for this segment.
                      </p>
                    </div>
                  )}
                  
                  {segment.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        <strong>Error:</strong> {segment.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 border rounded-lg bg-background/50 dark:bg-gray-800/50">
              <h3 className="text-lg font-semibold mb-2">Full Script</h3>
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground p-4 bg-muted rounded-md overflow-auto max-h-[300px]">
                {fullScript}
              </pre>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}