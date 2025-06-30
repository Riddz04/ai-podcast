'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface AudioPlayerProps {
  audioUrl?: string;
  title?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: string) => void;
  className?: string;
  showDownload?: boolean;
}

export function AudioPlayer({ 
  audioUrl, 
  title = "Audio", 
  onPlay, 
  onPause, 
  onError,
  className = "",
  showDownload = false 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isValidAudioUrl = (url?: string): boolean => {
    if (!url || url.trim() === '') return false;
    if (url === window.location.href) return false;
    
    try {
      return url.startsWith('data:audio/') || 
             url.startsWith('http://') || 
             url.startsWith('https://') ||
             url.startsWith('blob:');
    } catch {
      return false;
    }
  };

  const createAudioElement = () => {
    if (!isValidAudioUrl(audioUrl)) return null;

    const audio = new Audio();
    
    // For Supabase URLs, don't set crossOrigin to avoid CORS issues
    if (audioUrl!.includes('supabase')) {
      // Don't set crossOrigin for Supabase storage URLs
      audio.preload = 'metadata';
    } else {
      audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';
    }
    
    audio.src = audioUrl!;
    
    return audio;
  };

  useEffect(() => {
    if (!isValidAudioUrl(audioUrl)) {
      setHasError(true);
      setErrorMessage('Invalid audio URL');
      return;
    }

    const audio = createAudioElement();
    if (!audio) return;

    audioRef.current = audio;
    setHasError(false);
    setErrorMessage('');
    setCanPlay(false);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setHasError(false);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPause?.();
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      const target = e.target as HTMLAudioElement;
      let message = 'Failed to load audio';
      
      if (target?.error) {
        switch (target.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = 'Audio loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = 'Network error while loading audio. Please check your internet connection.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = 'Audio format not supported or corrupted';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Audio format not supported by browser';
            break;
          default:
            message = 'Unknown audio error occurred';
        }
      }
      
      // Check if it's a CORS error
      if (audioUrl?.includes('supabase') && message.includes('Network error')) {
        message = 'Audio file access denied. Please check Supabase storage permissions.';
      }
      
      setHasError(true);
      setErrorMessage(message);
      setIsPlaying(false);
      setIsLoading(false);
      setCanPlay(false);
      onError?.(message);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
      setCanPlay(true);
    };

    const handleCanPlayThrough = () => {
      setIsLoading(false);
      setHasError(false);
      setCanPlay(true);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
      setCanPlay(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);

    // Try to load the audio
    audio.load();

    return () => {
      // Cleanup
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      
      audio.pause();
      audio.src = '';
      audio.load();
    };
  }, [audioUrl, onPause, onError]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !canPlay) {
      toast({
        title: "Audio Not Ready",
        description: "Audio is still loading or unavailable.",
        variant: "destructive"
      });
      return;
    }

    const audio = audioRef.current;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        onPause?.();
      } else {
        setIsLoading(true);
        
        // Reset audio if it ended
        if (audio.ended) {
          audio.currentTime = 0;
        }
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          setIsLoading(false);
          onPlay?.();
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
      setIsLoading(false);
      
      let message = 'Failed to play audio';
      if (error instanceof Error) {
        if (error.name === 'NotSupportedError') {
          message = 'Audio format not supported by your browser';
        } else if (error.name === 'NotAllowedError') {
          message = 'Audio playback not allowed. Please interact with the page first.';
        } else if (error.message.includes('CORS')) {
          message = 'Audio file access denied due to CORS policy. Please check storage permissions.';
        } else {
          message = error.message || 'Unknown playback error';
        }
      }
      
      toast({
        title: "Playback Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !canPlay) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newVolume = parseFloat(e.target.value);
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number): string => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = async () => {
    if (!isValidAudioUrl(audioUrl)) {
      toast({
        title: "Download Error",
        description: "Invalid audio URL for download.",
        variant: "destructive"
      });
      return;
    }

    try {
      // For data URLs, create a blob and download
      if (audioUrl!.startsWith('data:')) {
        const response = await fetch(audioUrl!);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For regular URLs, try to fetch and download
        try {
          const response = await fetch(audioUrl!, { mode: 'cors' });
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (fetchError) {
          // Fallback to direct link
          const link = document.createElement('a');
          link.href = audioUrl!;
          link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download audio file.",
        variant: "destructive"
      });
    }
  };

  const retryLoad = () => {
    if (audioRef.current) {
      setHasError(false);
      setErrorMessage('');
      setIsLoading(true);
      audioRef.current.load();
    }
  };

  if (!isValidAudioUrl(audioUrl)) {
    return (
      <div className={`bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <VolumeX className="h-5 w-5" />
          <span className="font-medium">No audio available</span>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
          Audio generation may have failed or the file is unavailable.
        </p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 ${className}`}>
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Audio Error</span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
          {errorMessage || 'Failed to load audio. The file may be corrupted or in an unsupported format.'}
        </p>
        <div className="flex gap-2 mt-3">
          <Button 
            onClick={retryLoad}
            variant="outline" 
            size="sm"
            className="bg-white dark:bg-gray-800"
          >
            Retry
          </Button>
          {showDownload && (
            <Button 
              onClick={downloadAudio}
              variant="outline" 
              size="sm"
              className="bg-white dark:bg-gray-800"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Audio Player</span>
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlayPause}
            variant="outline"
            size="sm"
            disabled={isLoading || !canPlay}
            className="bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            ) : isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Play
              </>
            )}
          </Button>
          {showDownload && (
            <Button
              onClick={downloadAudio}
              variant="outline"
              size="sm"
              className="bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
          disabled={!duration || !canPlay}
        />
        <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          disabled={!canPlay}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
          disabled={!canPlay}
        />
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}