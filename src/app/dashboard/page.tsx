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
import { Trash2, Clock, User, Calendar, FileText } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { toast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [podcasts, setPodcasts] = useState<PodcastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [deletingPodcast, setDeletingPodcast] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
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
        toast({
          title: "Error",
          description: "Failed to load your podcasts. Please try refreshing the page.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPodcasts();
  }, [user, router, mounted]);

  const handleDeletePodcast = async (podcastId: string) => {
    if (!user || !podcastId) {
      toast({
        title: "Error",
        description: "Cannot delete podcast. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this podcast? This action cannot be undone.')) {
      return;
    }

    setDeletingPodcast(podcastId);
    
    try {
      await deletePodcast(podcastId, user.uid);
      
      // Remove from local state
      setPodcasts(prevPodcasts => prevPodcasts.filter(podcast => podcast.id !== podcastId));
      
      toast({
        title: "Success",
        description: "Podcast deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting podcast:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Delete Failed",
        description: `Failed to delete podcast: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setDeletingPodcast(null);
    }
  };

  const toggleScript = (podcastId: string) => {
    setExpandedScript(expandedScript === podcastId ? null : podcastId);
  };

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

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
    
    try {
      // Handle Supabase timestamp format (ISO string)
      const date = typeof timestamp === 'string' ? new Date(timestamp) : 
                   timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return "Invalid date";
    }
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
            <TabsTrigger value="saved">Saved Podcasts ({podcasts.length})</TabsTrigger>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Your Saved Podcasts
                </CardTitle>
                <CardDescription className="text-pink-100 mt-2 text-lg">
                  Access all your previously generated podcasts ({podcasts.length} total)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your podcasts...</span>
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
                  <div className="space-y-6">
                    {podcasts.map((podcast) => (
                      <Card key={podcast.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
                        <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {podcast.title}
                              </CardTitle>
                              <div className="flex flex-wrap gap-2 text-sm">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  <User className="h-3 w-3 mr-1" />
                                  {podcast.personality1} & {podcast.personality2}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {podcast.topic}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(podcast.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-6 space-y-4">
                          {/* Audio Player Section */}
                          <AudioPlayer
                            audioUrl={podcast.audioUrl}
                            title={podcast.title}
                            showDownload={true}
                            className="w-full"
                            onError={(error) => {
                              console.error('Audio error for podcast:', podcast.id, error);
                            }}
                          />

                          {/* Script Section */}
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                <span className="font-medium text-gray-900 dark:text-gray-100">Podcast Script</span>
                              </div>
                              <Button
                                onClick={() => toggleScript(podcast.id!)}
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                              >
                                {expandedScript === podcast.id ? 'Hide Script' : 'Show Script'}
                              </Button>
                            </div>
                            
                            {expandedScript === podcast.id ? (
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                                  {podcast.script}
                                </pre>
                              </div>
                            ) : (
                              <div className="bg-white dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-600">
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                  {podcast.script.substring(0, 200)}...
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeletePodcast(podcast.id!)}
                            disabled={deletingPodcast === podcast.id}
                            className="hover:bg-red-600 transition-colors"
                          >
                            {deletingPodcast === podcast.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </>
                            )}
                          </Button>
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