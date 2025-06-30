import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

export function VoiceAnimationForm() {
  const [selectedVoice1, setSelectedVoice1] = useState<string>('');
  const [selectedVoice2, setSelectedVoice2] = useState<string>('');
  const [isGeneratingVoice, setIsGeneratingVoice] = useState<number | null>(null);
  const [isGeneratingAnimation, setIsGeneratingAnimation] = useState(false);

  const voiceOptions = [
    { value: 'male_confident', label: 'Male - Confident' },
    { value: 'male_deep', label: 'Male - Deep' },
    { value: 'male_friendly', label: 'Male - Friendly' },
    { value: 'female_clear', label: 'Female - Clear' },
    { value: 'female_young', label: 'Female - Young' },
    { value: 'female_expressive', label: 'Female - Expressive' },
  ];

  const generateVoice = async (characterNumber: 1 | 2) => {
    const selectedVoice = characterNumber === 1 ? selectedVoice1 : selectedVoice2;
    
    if (!selectedVoice) {
      toast({
        title: "No Voice Selected",
        description: `Please select a voice for Character ${characterNumber} first.`,
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingVoice(characterNumber);
    
    try {
      // Simulate voice generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Voice Generated",
        description: `Voice for Character ${characterNumber} has been generated successfully!`,
      });
      
    } catch (error) {
      console.error('Error generating voice:', error);
      toast({
        title: "Voice Generation Failed",
        description: `Failed to generate voice for Character ${characterNumber}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVoice(null);
    }
  };

  const generateAnimation = async () => {
    if (!selectedVoice1 || !selectedVoice2) {
      toast({
        title: "Missing Voices",
        description: "Please generate voices for both characters first.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAnimation(true);
    
    try {
      // Simulate animation generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Animation Generated",
        description: "Character animations have been generated successfully!",
      });
      
    } catch (error) {
      console.error('Error generating animation:', error);
      toast({
        title: "Animation Generation Failed",
        description: "Failed to generate animations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAnimation(false);
    }
  };

  return (
    <Card className="col-span-1 md:col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle>3. Voice & Animation</CardTitle>
        <CardDescription>
          Convert text to speech and generate portrait animations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-base font-medium">Voice Generation (ElevenLabs)</Label>
          <p className="text-sm text-muted-foreground mb-4">Select voice types for each character.</p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice1">Character 1 Voice</Label>
              <Select value={selectedVoice1} onValueChange={setSelectedVoice1}>
                <SelectTrigger id="voice1">
                  <SelectValue placeholder="Select voice for Character 1" />
                </SelectTrigger>
                <SelectContent>
                  {voiceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                className="w-full mt-2" 
                onClick={() => generateVoice(1)}
                disabled={isGeneratingVoice === 1 || !selectedVoice1}
              >
                {isGeneratingVoice === 1 ? 'Generating...' : 'Generate Voice for Character 1'}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice2">Character 2 Voice</Label>
              <Select value={selectedVoice2} onValueChange={setSelectedVoice2}>
                <SelectTrigger id="voice2">
                  <SelectValue placeholder="Select voice for Character 2" />
                </SelectTrigger>
                <SelectContent>
                  {voiceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                className="w-full mt-2" 
                onClick={() => generateVoice(2)}
                disabled={isGeneratingVoice === 2 || !selectedVoice2}
              >
                {isGeneratingVoice === 2 ? 'Generating...' : 'Generate Voice for Character 2'}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <Label className="text-base font-medium">Animation (Hunyuan Video Avatar)</Label>
          <Button 
            className="w-full mt-2" 
            onClick={generateAnimation}
            disabled={isGeneratingAnimation || !selectedVoice1 || !selectedVoice2}
          >
            {isGeneratingAnimation ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Animation...
              </div>
            ) : (
              'Generate Animation'
            )}
          </Button>
        </div>
        
        <div className="mt-4 aspect-video bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
          [Animation Preview]
        </div>
      </CardContent>
    </Card>
  );
}