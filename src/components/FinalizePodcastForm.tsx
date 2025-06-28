import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

export function FinalizePodcastForm() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finalPodcastUrl, setFinalPodcastUrl] = useState<string | null>(null);

  const removeSilentSections = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Simulate processing with progress updates
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      toast({
        title: "Silent Sections Removed",
        description: "Silent sections have been successfully removed from the audio.",
      });
      
    } catch (error) {
      console.error('Error removing silent sections:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to remove silent sections. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const mergeAndGenerate = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Simulate merging and generation with progress updates
      for (let i = 0; i <= 100; i += 5) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Simulate final podcast URL
      setFinalPodcastUrl('/api/placeholder-podcast.mp4');
      
      toast({
        title: "Podcast Generated",
        description: "Your final podcast has been generated successfully!",
      });
      
    } catch (error) {
      console.error('Error generating final podcast:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate final podcast. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const downloadPodcast = () => {
    if (!finalPodcastUrl) {
      toast({
        title: "No Podcast Available",
        description: "Please generate the final podcast first.",
        variant: "destructive"
      });
      return;
    }

    // Create a download link
    const link = document.createElement('a');
    link.href = finalPodcastUrl;
    link.download = `podcast-${new Date().toISOString().split('T')[0]}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: "Your podcast download has started.",
    });
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>4. Finalize & Generate Podcast</CardTitle>
        <CardDescription>
          Remove silences and merge all clips with FFmpeg.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          className="w-full" 
          onClick={removeSilentSections}
          disabled={isProcessing}
          variant="outline"
        >
          {isProcessing ? 'Processing...' : 'Remove Silent Sections (Optional)'}
        </Button>
        
        <Button 
          className="w-full" 
          onClick={mergeAndGenerate}
          disabled={isProcessing}
        >
          {isProcessing ? 'Generating...' : 'Merge Clips & Generate Final Podcast'}
        </Button>
        
        {isProcessing && (
          <div className="mt-4">
            <Label>Generation Progress</Label>
            <Progress value={progress} className="w-full mt-2" />
            <p className="text-sm text-muted-foreground mt-1">{progress}% complete</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2">
        <Label>Final Podcast:</Label>
        <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
          {finalPodcastUrl ? (
            <video 
              controls 
              className="w-full h-full rounded-md"
              src={finalPodcastUrl}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            '[Final Podcast Video Player]'
          )}
        </div>
        <Button 
          className="w-full" 
          variant="secondary"
          onClick={downloadPodcast}
          disabled={!finalPodcastUrl}
        >
          Download Podcast
        </Button>
      </CardFooter>
    </Card>
  );
}