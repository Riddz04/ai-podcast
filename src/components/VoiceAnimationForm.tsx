import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function VoiceAnimationForm() {
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
          <Label>Voice Generation (ElevenLabs)</Label>
          <p className="text-sm text-muted-foreground mb-2">Select voice or clone for custom characters.</p>
          <Button className="w-full">Generate Voice for Character 1</Button>
          <Button className="w-full mt-2">Generate Voice for Character 2</Button>
          {/* Add voice selection/cloning options here */}
        </div>
        <div className="mt-4">
          <Label>Animation (Hunyuan Video Avatar)</Label>
          <Button className="w-full mt-2">Generate Animation</Button>
        </div>
        <div className="mt-4 aspect-video bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
          [Animation Preview]
        </div>
      </CardContent>
    </Card>
  );
}