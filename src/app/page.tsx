'use client'
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loginWithGoogle, logout } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Don't render anything while checking auth state
  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-950 p-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          AI Podcast Generator
          </h1>
          {/* <p className="text-2xl md:text-3xl font-semibold text-gray-700 dark:text-gray-300">
            AI Podcast Generator
          </p> */}
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto mt-4">
            Create fully automated podcasts with AI-generated conversations between any personalities. From idea to final audio in minutes!
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative w-full max-w-md h-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-900/30"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6 z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Ready to create your podcast?</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Login to start generating amazing AI podcasts</p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={loginWithGoogle} 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Login with Google
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">AI Voice Generation</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Choose from multiple realistic AI voices for your podcast personalities</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">Script Generation</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">AI creates natural-sounding dialogue between your chosen personalities</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">Save & Share</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Save your podcasts to your library and share them with others</p>
          </div>
        </div>
      </div>
      
      <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} PoseCast. Powered by Next.js, Firebase, and AI.</p>
      </footer>
    </main>
  );
}