'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/AudioPlayer";
import { FileText, Clock, User, Calendar, ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from "@/components/ui/use-toast";
import Link from 'next/link';
import { use } from 'react';

interface PodcastData {
  id?: string;
  title: string;
  topic: string;
  personality1: string;
  personality2: string;
  script: string;
  audioUrl?: string;
  createdAt?: string;
}

export default function SharedPodcast({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedScript, setExpandedScript] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchPodcast = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/podcasts/${resolvedParams.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch podcast');
        }
        
        const data = await response.json();
        setPodcast(data.podcast);
      } catch (error) {
        console.error('Error fetching shared podcast:', error);
        setError(error instanceof Error ? error.message : 'Failed to load podcast');
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to load podcast',
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchPodcast();
    }
  }, [resolvedParams.id]);

  const toggleScript = () => {
    setExpandedScript(!expandedScript);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading podcast...</p>
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Podcast Not Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error || 'This podcast does not exist or has been removed.'}</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Shared Podcast
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Listen to this AI-generated podcast shared with you
          </p>
        </div>

        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
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
                  {podcast.createdAt && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 shadow-sm">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(podcast.createdAt)}
                    </span>
                  )}
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
                  onClick={toggleScript}
                  variant="outline"
                  size="sm"
                  className="border-purple-200 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/30 transition-all duration-200"
                >
                  {expandedScript ? 'Hide Script' : 'Show Script'}
                </Button>
              </div>
              
              {expandedScript ? (
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
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Shared via PodAI - AI Podcast Generator
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                Create Your Own
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}