"use client"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import Together from "together-ai";

export function CharacterBackgroundForm() {
  const [userImage, setUserImage] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null as string | null);
  const [isGenerating, setIsGenerating] = useState(false);


  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setUserImagePreview(e.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const convertImageToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generatePodcastScene = async () => {
    if (!userImage) {
      alert('Please upload an image first');
      return;
    }

    setIsGenerating(true);
    
    try {
      const imageBase64 = await convertImageToBase64(userImage);
      
      const prompt = 'Professional podcast studio scene with person wearing headphones, sitting at desk with microphone, modern studio setup, warm lighting, broadcasting equipment, high quality';
      const together = new Together({apiKey:"5f5e092bddf05fd42423168ae7cb5e97a5eb09d6739c2f46875030167cb86ba1"});

      const response = await together.images.create({
        model: "black-forest-labs/FLUX.1-schnell-Free",
        prompt,
        steps: 3,
        n: 1,
      });
      console.log(response.data);
      setGeneratedImage(response.data[0]?.url!);
     
      
    } catch (error) {
      console.error('Error generating podcast scene:', error);
      alert(`Failed to generate podcast scene: ${error}`);
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
          <Label htmlFor="character-desc">Character Description (Flux 1.1 Pro)</Label>
          <Textarea id="character-desc" placeholder="e.g., A wise owl wearing headphones, a futuristic robot host" />
        </div>
        <Button className="w-full">Generate Character</Button>
        <div className="mt-4 aspect-video bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
          [Character Preview]
        </div>
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="space-y-6">
        <div>
          <label htmlFor="background-img" className="block text-sm font-medium text-gray-700 mb-2">
            Background Image (Flux Kontext)
          </label>
          <input
            id="background-img"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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

        <button
          onClick={generatePodcastScene}
          disabled={!userImage || isGenerating}
          className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
              Generating...
            </div>
          ) : (
            'Composite Character'
          )}
        </button>

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
    </div>
      </CardContent>
    </Card>
  );
}