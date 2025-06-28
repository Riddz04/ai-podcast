import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PodAI - AI Podcast Generator',
  description: 'Generate realistic podcasts with AI-powered conversations between any personalities',
  keywords: ['AI', 'podcast', 'generator', 'artificial intelligence', 'audio', 'conversation'],
  authors: [{ name: 'PodAI Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'PodAI - AI Podcast Generator',
    description: 'Generate realistic podcasts with AI-powered conversations',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PodAI - AI Podcast Generator',
    description: 'Generate realistic podcasts with AI-powered conversations',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}