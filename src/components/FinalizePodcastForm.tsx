import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export function FinalizePodcastForm() {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>4. Finalize & Generate Podcast</CardTitle>
        <CardDescription>
          Remove silences and merge all clips with FFmpeg.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full">Remove Silent Sections (Optional)</Button>
        <Button className="w-full">Merge Clips & Generate Final Podcast</Button>
        <div className="mt-4">
          <Label>Generation Progress</Label>
          <Progress value={0} className="w-full" /> {/* Update 'value' dynamically */}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2">
        <Label>Final Podcast:</Label>
        <div className="w-full aspect-video bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
          [Final Podcast Video Player]
        </div>
        <Button className="w-full" variant="secondary">Download Podcast</Button>
      </CardFooter>
    </Card>
  );
}