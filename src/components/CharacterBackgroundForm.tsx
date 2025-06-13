import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CharacterBackgroundForm() {
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
        <div>
          <Label htmlFor="background-img">Background Image (Flux Kontext)</Label>
          <Input id="background-img" type="file" />
        </div>
        <Button className="w-full" variant="outline">Composite Character</Button>
        <div className="mt-4 aspect-video bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
          [Composited Scene Preview]
        </div>
      </CardContent>
    </Card>
  );
}