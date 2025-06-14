"use client"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { Play, Pause, Download, Volume2 } from "lucide-react";

export function PodcastGeneratorForm() {
  const [podcastTopic, setPodcastTopic] = useState("");
  const [personality1, setPersonality1] = useState("");
  const [personality2, setPersonality2] = useState("");
  const [voice1Type, setVoice1Type] = useState("male_confident");
  const [voice2Type, setVoice2Type] = useState("female_clear");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcastData, setPodcastData] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [playingSegment, setPlayingSegment] = useState(null);
  
  const audioRefs = useRef({});

  const voiceOptions = {
    // Male voices
    "male_confident": "Male - Confident (Domi)",
    "male_deep": "Male - Deep (Josh)",
    "male_friendly": "Male - Friendly (Antoni)",
    
    // Female voices
    "female_clear": "Female - Clear (Rachel)",
    "female_young": "Female - Young (Bella)",
    "female_expressive": "Female - Expressive (Elli)"
  };

  const generatePodcast = async () => {
    if (!personality1 || !personality2 || !podcastTopic) {
      alert("Please fill in all required fields");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personality1,
          personality2,
          podcastTopic,
          voice1Type,
          voice2Type
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate podcast');
      }

      const data = await response.json();
      setPodcastData(data);
    } catch (error) {
      console.error('Error generating podcast:', error);
      alert('Error generating podcast. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudioSegment = (segmentIndex) => {
    const segment = podcastData?.audioSegments[segmentIndex];
    if (!segment.audioBase64) return;

    // Stop currently playing audio
    if (currentlyPlaying) {
      currentlyPlaying.pause();
      currentlyPlaying.currentTime = 0;
    }

    // Create audio element if it doesn't exist
    if (!audioRefs.current[segmentIndex]) {
      const audioBlob = new Blob(
        [Uint8Array.from(atob(segment.audioBase64), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setCurrentlyPlaying(null);
        setPlayingSegment(null);
        // Auto-play next segment
        if (segmentIndex < podcastData.audioSegments.length - 1) {
          playAudioSegment(segmentIndex + 1);
        }
      };
      
      audioRefs.current[segmentIndex] = audio;
    }

    const audio = audioRefs.current[segmentIndex];
    audio.play();
    setCurrentlyPlaying(audio);
    setPlayingSegment(segmentIndex);
  };

  const pauseAudio = () => {
    if (currentlyPlaying) {
      currentlyPlaying.pause();
      setCurrentlyPlaying(null);
      setPlayingSegment(null);
    }
  };

  const playAllSegments = async () => {
    if (podcastData?.audioSegments?.length > 0) {
      playAudioSegment(0);
    }
  };

  const downloadPodcast = () => {
    // This would require additional backend processing to combine all audio segments
    // For now, we'll download the script
    const scriptBlob = new Blob([podcastData.script], { type: 'text/plain' });
    const url = URL.createObjectURL(scriptBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podcast-${personality1}-${personality2}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="col-span-1 md:col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle>AI Podcast Generator</CardTitle>
        <CardDescription>Generate a realistic podcast conversation between any two personalities.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="podcast-topic">Podcast Topic</Label>
          <Textarea 
            id="podcast-topic"
            value={podcastTopic}
            onChange={(e) => setPodcastTopic(e.target.value)}
            placeholder="e.g., The future of artificial intelligence in healthcare"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="personality1">First Personality</Label>
            <Input 
              id="personality1"
              value={personality1}
              onChange={(e) => setPersonality1(e.target.value)}
              placeholder="e.g., Elon Musk"
            />
          </div>
          <div>
            <Label htmlFor="personality2">Second Personality</Label>
            <Input 
              id="personality2"
              value={personality2}
              onChange={(e) => setPersonality2(e.target.value)}
              placeholder="e.g., Oprah Winfrey"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="voice1">Voice for {personality1 || 'First Personality'}</Label>
            <Select value={voice1Type} onValueChange={setVoice1Type}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(voiceOptions).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="voice2">Voice for {personality2 || 'Second Personality'}</Label>
            <Select value={voice2Type} onValueChange={setVoice2Type}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(voiceOptions).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={generatePodcast} 
          className="w-full" 
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating Podcast...' : 'Generate Podcast'}
        </Button>

        {podcastData && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              <Button onClick={playAllSegments} variant="outline" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Play All
              </Button>
              <Button onClick={pauseAudio} variant="outline" size="sm">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button onClick={downloadPodcast} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Script
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Podcast Segments ({podcastData.totalSegments})</h3>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {podcastData.audioSegments.map((segment, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      playingSegment === index ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-blue-600 mb-1">
                          {segment.speaker}
                        </div>
                        <div className="text-sm text-gray-700">
                          {segment.text}
                        </div>
                      </div>
                      <div className="ml-3 flex items-center gap-2">
                        {segment.audioBase64 ? (
                          <Button
                            onClick={() => 
                              playingSegment === index 
                                ? pauseAudio() 
                                : playAudioSegment(index)
                            }
                            variant="ghost"
                            size="sm"
                          >
                            {playingSegment === index ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        ) : (
                          <div className="text-xs text-red-500">
                            Audio failed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-semibold mb-2">Full Script</h3>
              <div className="p-3 h-48 overflow-y-auto bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap">
                {podcastData.script}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}