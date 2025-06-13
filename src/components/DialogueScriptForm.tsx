import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DialogueScriptForm() {
  return (
    <Card className="col-span-1 md:col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle>2. Dialogue Script</CardTitle>
        <CardDescription>Create the dialogue using an LLM.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="podcast-prompt">Podcast Prompt</Label>
          <Textarea id="podcast-prompt" placeholder="e.g., Discuss the future of AI in education" />
        </div>
        <div>
          <Label htmlFor="char1-name">Character 1 Name</Label>
          <Input id="char1-name" placeholder="e.g., Professor Owl" />
        </div>
        <div>
          <Label htmlFor="char2-name">Character 2 Name</Label>
          <Input id="char2-name" placeholder="e.g., Unit 734" />
        </div>
        <Button className="w-full">Generate Script</Button>
        <div className="mt-4 p-2 h-48 overflow-y-auto bg-muted rounded-md text-sm text-muted-foreground">
          [Generated Script Output]
        </div>
      </CardContent>
    </Card>
  );
}