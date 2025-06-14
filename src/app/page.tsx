import { CharacterBackgroundForm } from "@/components/CharacterBackgroundForm";
import { PodcastGeneratorForm} from "@/components/DialogueScriptForm";
import { VoiceAnimationForm } from "@/components/VoiceAnimationForm";
import { FinalizePodcastForm } from "@/components/FinalizePodcastForm";

export default function Home() {
  return (
    <main className="container mx-auto min-h-screen flex-col items-center p-4 md:p-8 lg:p-12">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          PoseCast - AI Podcast Generator
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Create fully automated podcasts from idea to final video!
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <CharacterBackgroundForm />
        <PodcastGeneratorForm />
        <VoiceAnimationForm />
        <FinalizePodcastForm />
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>Powered by Next.js, Shadcn UI, and various AI models.</p>
      </footer>
    </main>
  );
}
