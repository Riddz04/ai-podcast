"use client"
import { useAuth } from "@/lib/AuthContext";
import DialogueScriptForm from "@/components/DialogueScriptForm";
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
        const userPodcasts = await getUserPodcasts(user.id);
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
      await deletePodcast(podcastId, user.id);
      
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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 bg-[url('/pattern.svg')] bg-fixed bg-opacity-50">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl shadow-lg backdrop-blur-sm border border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              PodAI Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 ml-11">Create and manage your AI podcasts</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-700 p-3 rounded-full shadow-md border border-gray-100 dark:border-gray-600">
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt={user.user_metadata?.full_name || user.email || "User"} 
                  className="w-9 h-9 rounded-full ring-2 ring-blue-500 dark:ring-blue-400"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg">
                  {(user.user_metadata?.full_name || user.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
            <Button onClick={logout} variant="outline" size="sm" className="border-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200">
              Logout
            </Button>
          </div>
        </header>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/90 dark:bg-gray-800/90 p-1 rounded-xl shadow-md backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <TabsTrigger value="create" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-700 rounded-lg py-3 transition-all duration-200 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Podcast
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white dark:data-[state=active]:bg-purple-700 rounded-lg py-3 transition-all duration-200 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved Podcasts ({podcasts.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 rounded-t-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/wave-pattern.svg')] opacity-10"></div>
                  <div className="relative z-10">
                    <div className="flex items-center">
                      <div className="bg-white/20 p-3 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-bold">Create New Podcast</CardTitle>
                        <CardDescription className="text-blue-100 mt-2 text-lg">Generate a conversation between two personalities</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <DialogueScriptForm />
                </CardContent>
              </Card>
              

            </div>
          </TabsContent>
          
          <TabsContent value="saved" className="space-y-6">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 rounded-t-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/wave-pattern.svg')] opacity-10"></div>
                <div className="relative z-10">
                  <div className="flex items-center">
                    <div className="bg-white/20 p-3 rounded-full mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold">Your Saved Podcasts</CardTitle>
                      <CardDescription className="text-pink-100 mt-2 text-lg">
                        Access all your previously generated podcasts ({podcasts.length} total)
                      </CardDescription>
                    </div>
                  </div>
                </div>
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
                      <Card key={podcast.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm transform hover:-translate-y-1">
                        <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white mr-3 shadow-md">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                  </svg>
                                </div>
                                {podcast.title}
                              </CardTitle>
                              <div className="flex flex-wrap gap-2 text-sm ml-11">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 shadow-sm">
                                  <User className="h-3 w-3 mr-1" />
                                  {podcast.personality1} & {podcast.personality2}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 shadow-sm">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {podcast.topic}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 shadow-sm">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(podcast.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-6 space-y-6">
                          {/* Audio Player Section */}
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-5 rounded-xl border border-blue-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m12.728 0l-4.243 4.243m-7.07-7.072L15.536 8.464" />
                              </svg>
                              Audio Player
                            </h3>
                            <AudioPlayer
                              audioUrl={podcast.audioUrl}
                              title={podcast.title}
                              showDownload={true}
                              className="w-full"
                              onError={(error) => {
                                console.error('Audio error for podcast:', podcast.id, error);
                              }}
                            />
                          </div>

                          {/* Script Section */}
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-5 rounded-xl border border-purple-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                <span className="font-semibold text-purple-800 dark:text-purple-300">Podcast Script</span>
                              </div>
                              <Button
                                onClick={() => toggleScript(podcast.id!)}
                                variant="outline"
                                size="sm"
                                className="border-purple-200 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/30 transition-all duration-200"
                              >
                                {expandedScript === podcast.id ? 'Hide Script' : 'Show Script'}
                              </Button>
                            </div>
                            
                            {expandedScript === podcast.id ? (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-purple-200 dark:border-purple-900/50 max-h-96 overflow-y-auto shadow-inner">
                                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                                  {podcast.script}
                                </pre>
                              </div>
                            ) : (
                              <div className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-purple-200 dark:border-purple-900/50 shadow-inner">
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                                  {podcast.script.substring(0, 200)}...
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-4">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeletePodcast(podcast.id!)}
                            disabled={deletingPodcast === podcast.id}
                            className="bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                          >
                            {deletingPodcast === podcast.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Podcast
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