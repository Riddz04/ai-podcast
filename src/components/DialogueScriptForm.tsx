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

interface Personality {
  name: string;
  voice: string;
}

interface PodcastSegment {
  personality: string;
  text: string;
  audioUrl: string;
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
  createdAt?: any;
}

export default function DialogueScriptForm() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [personalities, setPersonalities] = useState<Personality[]>([{ name: '', voice: '' }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSegments, setGeneratedSegments] = useState<PodcastSegment[]>([]);
  const [fullScript, setFullScript] = useState('');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

    try {
      // Map the first two personalities to the API format
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
        throw new Error('Failed to generate podcast');
      }

      const data = await response.json();
      
      // Check if there was an API quota error
      const hasQuotaError = data.audioSegments.some((segment: any) => 
        segment.error && segment.error.includes('quota_exceeded')
      );
      
      if (hasQuotaError) {
        toast({
          title: "API Quota Exceeded",
          description: "Some audio segments couldn't be generated due to ElevenLabs API quota limitations. You can still save the podcast with available audio or try again later.",
          variant: "warning"
        });
      }
      
      // Map the API response to our component's expected format
      const segments = data.audioSegments.map((segment: any) => ({
        personality: segment.speaker,
        text: segment.text,
        audioUrl: segment.audioBase64 ? `data:audio/mpeg;base64,${segment.audioBase64}` : null,
        error: segment.error
      }));
      
      setGeneratedSegments(segments);
      setFullScript(data.script);
    } catch (error) {
      console.error('Error generating podcast:', error);
      toast({
        title: "Generation failed",
        description: "There was an error generating your podcast. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
        toast({
          title: "Skipping Segment",
          description: `No audio available for ${generatedSegments[i].personality}. ${generatedSegments[i].error?.includes('quota_exceeded') ? 'API quota exceeded.' : ''}`
        });
        continue;
      }
      
      setCurrentlyPlaying(i);
      audioRefs.current[i]?.play();
      await new Promise(resolve => {
        audioRefs.current[i]?.addEventListener('ended', resolve, { once: true });
      });
    }
    setCurrentlyPlaying(null);
  };

  const downloadScript = () => {
    const element = document.createElement('a');
    const file = new Blob([fullScript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `podcast-script-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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

    // Check if any segments have audio
    const segmentsWithAudio = generatedSegments.filter(segment => segment.audioUrl !== null);
    if (segmentsWithAudio.length === 0) {
      toast({
        title: "Cannot Save",
        description: "No audio segments are available. API quota may be exceeded.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Find the first segment with audio to use as a preview
      const audioSegment = segmentsWithAudio[0];
      if (!audioSegment || !audioSegment.audioUrl) {
        throw new Error("No valid audio segments found");
      }
      
      // Convert the audio URL to a blob
      const response = await fetch(audioSegment.audioUrl);
      const audioBlob = await response.blob();
      
      // Convert the audio blob to a base64 string
      const reader = new FileReader();
      const audioBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });
      const audioBase64 = await audioBase64Promise;
      
      // Create a title from the topic, ensuring it's not too long
      const podcastTitle = topic.length > 50 
        ? `${topic.substring(0, 47)}...` 
        : topic;
      
      const podcastId = await savePodcast({
        userId: user.uid,
        title: podcastTitle,
        personality1: personalities[0]?.name || 'Speaker 1',
        personality2: personalities[1]?.name || 'Speaker 2',
        script: fullScript,
        topic,
        createdAt: new Date()
      }, audioBase64);

      toast({
        title: "Podcast saved",
        description: "Your podcast has been saved to your library.",
      });
      
      // Optional: Redirect to the library tab
      const libraryTab = document.querySelector('[data-value="saved"]') as HTMLElement;
      if (libraryTab) {
        libraryTab.click();
      }
    } catch (error) {
      console.error('Error saving podcast:', error);
      toast({
        title: "Save failed",
        description: "There was an error saving your podcast. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

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
                <Button onClick={playAll} variant="outline" size="sm">
                  {currentlyPlaying !== null ? 'Pause All' : 'Play All'}
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
                    <Button
                      onClick={() => playSegment(index)}
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                    >
                      {currentlyPlaying === index ? 'Pause' : 'Play'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{segment.text}</p>
                  <audio
                    ref={(el) => { audioRefs.current[index] = el; }}
                    src={segment.audioUrl}
                    onEnded={() => setCurrentlyPlaying(null)}
                    className="hidden"
                  />
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