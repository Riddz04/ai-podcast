"use client"
import { useAuth } from "@/lib/AuthContext";
import DialogueScriptForm from "@/components/DialogueScriptForm";
import { FinalizePodcastForm } from "@/components/FinalizePodcastForm";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserPodcasts, deletePodcast, PodcastData } from "@/lib/podcastService";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Trash2, Download, Clock, User, Calendar } from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [podcasts, setPodcasts] = useState<PodcastData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const fetchPodcasts = async () => {
      try {
        setLoading(true);
        const userPodcasts = await getUserPodcasts(user.uid);
        setPodcasts(userPodcasts);
      } catch (error) {
        console.error("Error fetching podcasts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPodcasts();
  }, [user, router]);

  const handleDeletePodcast = async (podcastId: string) => {
    if (!user) return;
    
    try {
      await deletePodcast(podcastId, user.uid);
      setPodcasts(podcasts.filter(podcast => podcast.id !== podcastId));
    } catch (error) {
      console.error("Error deleting podcast:", error);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You must be logged in to view the dashboard.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="w-full">Go to Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown date";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Create and manage your AI podcasts</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm">
              {user.photoURL && (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User"} 
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                {user.displayName || user.email}
              </span>
            </div>
            <Button onClick={logout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </header>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="create">Create Podcast</TabsTrigger>
            <TabsTrigger value="saved">Saved Podcasts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card className="overflow-hidden border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-lg">
                  <CardTitle className="text-2xl font-bold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Create New Podcast
                  </CardTitle>
                  <CardDescription className="text-blue-100 mt-2 text-lg">Generate a conversation between any two personalities</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <DialogueScriptForm />
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-t-lg">
                  <CardTitle className="text-2xl font-bold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Finalize Podcast
                  </CardTitle>
                  <CardDescription className="text-indigo-100 mt-2 text-lg">Process and export your podcast</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Your podcast will appear here after generation</p>
                    <Button 
                      onClick={() => document.querySelector('[data-value="create"]')?.scrollIntoView({ behavior: 'smooth' })}
                      variant="outline"
                    >
                      Start Creating
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="space-y-6">
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-t-lg">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Your Saved Podcasts
                </CardTitle>
                <CardDescription className="text-pink-100 mt-2 text-lg">Access all your previously generated podcasts</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : podcasts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No podcasts yet</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Create your first podcast to see it here</p>
                    <Button 
                      onClick={() => (document.querySelector('[data-value="create"]') as HTMLElement)?.click()}
                      className="mt-4"
                    >
                      Create a Podcast
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {podcasts.map((podcast) => (
                      <Card key={podcast.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
                        <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                          <CardTitle className="text-lg font-bold truncate">{podcast.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2 pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                              <User className="h-4 w-4 mr-2 text-indigo-500" />
                              <span className="font-medium">{podcast.personality1} & {podcast.personality2}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                              <Clock className="h-4 w-4 mr-2 text-purple-500" />
                              <span className="font-medium">Topic: {podcast.topic}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                              <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                              <span className="font-medium">{formatDate(podcast.createdAt)}</span>
                            </div>
                            {podcast.audioUrl && (
                              <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
                                <audio controls src={podcast.audioUrl} className="w-full" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeletePodcast(podcast.id!)}
                            className="hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                          {podcast.audioUrl && (
                            <Button 
                              variant="default" 
                              size="sm" 
                              asChild
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-colors"
                            >
                              <a href={podcast.audioUrl} download>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}