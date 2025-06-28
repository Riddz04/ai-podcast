"use client"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

export function CharacterBackgroundForm() {
  const [userImage, setUserImage] = useState<File | null>(null);
  const [userImagePreview, setUserImagePreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [characterDescription, setCharacterDescription] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select a valid image file.",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive"
        });
        return;
      }

      setUserImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setUserImagePreview(result);
        }
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read the image file.",
          variant: "destructive"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const convertImageToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const generateCharacter = async () => {
    if (!characterDescription.trim()) {
      toast({
        title: "Missing Description",
        description: "Please enter a character description first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // This is a placeholder for character generation
      // In a real implementation, you would call an AI image generation API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      // For now, just show a success message
      toast({
        title: "Character Generated",
        description: "Character generation feature is coming soon!",
      });
      
    } catch (error) {
      console.error('Error generating character:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate character. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePodcastScene = async () => {
    if (!userImage) {
      toast({
        title: "Missing Image",
        description: "Please upload an image first.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const imageBase64 = await convertImageToBase64(userImage);
      
      const prompt = 'Professional podcast studio scene with person wearing headphones, sitting at desk with microphone, modern studio setup, warm lighting, broadcasting equipment, high quality';
      
      // Note: The Together AI API key is hardcoded in the original code
      // In production, this should be moved to environment variables
      const apiKey = "5f5e092bddf05fd42423168ae7cb5e97a5eb09d6739c2f46875030167cb86ba1";
      
      if (!apiKey) {
        throw new Error('Together AI API key not configured');
      }

      // This is a placeholder for the actual API call
      // The original code uses Together AI but the import is missing
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate API call
      
      // For now, just show a success message
      toast({
        title: "Scene Generated",
        description: "Podcast scene generation feature is coming soon!",
      });
      
    } catch (error) {
      console.error('Error generating podcast scene:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Generation Failed",
        description: `Failed to generate podcast scene: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1">
      <CardHeader>
        <CardTitle>1. Character & Background</CardTitle>
        <CardDescription>
          Generate your podcast character and set the background.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="character-desc">Character Description</Label>
          <Textarea 
            id="character-desc" 
            placeholder="e.g., A wise owl wearing headphones, a futuristic robot host"
            value={characterDescription}
            onChange={(e) => setCharacterDescription(e.target.value)}
          />
        </div>
        <Button 
          className="w-full" 
          onClick={generateCharacter}
          disabled={isGenerating || !characterDescription.trim()}
        >
          {isGenerating ? 'Generating...' : 'Generate Character'}
        </Button>
        <div className="mt-4 aspect-video bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
          {generatedImage ? (
            <img
              src={generatedImage}
              alt="Generated character"
              className="max-w-full max-h-full object-contain rounded-md"
            />
          ) : (
            '[Character Preview]'
          )}
        </div>
        
        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label htmlFor="background-img" className="block text-sm font-medium mb-2">
              Background Image
            </Label>
            <Input
              id="background-img"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {userImagePreview && (
            <div className="mt-4 aspect-video bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
              <img
                src={userImagePreview}
                alt="Uploaded preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          <Button
            onClick={generatePodcastScene}
            disabled={!userImage || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </div>
            ) : (
              'Composite Character'
            )}
          </Button>

          <div className="mt-4 aspect-video bg-gray-100 rounded-md flex items-center justify-center text-sm text-gray-500">
            {generatedImage ? (
              <img
                src={generatedImage}
                alt="Generated podcast scene"
                className="max-w-full max-h-full object-contain rounded-md"
              />
            ) : (
              '[Composited Scene Preview]'
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}