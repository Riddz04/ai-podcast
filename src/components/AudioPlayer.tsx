'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, Volume2, VolumeX } from 'lucide-react';
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
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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

  useEffect(() => {
    if (!audioRef.current || !isValidAudioUrl(audioUrl)) return;

    const audio = audioRef.current;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPause?.();
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setHasError(true);
      setIsPlaying(false);
      setIsLoading(false);
      const errorMessage = 'Failed to load audio. The file may be corrupted or unavailable.';
      onError?.(errorMessage);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [audioUrl, onPause, onError]);

  const handlePlayPause = async () => {
    if (!audioRef.current || !isValidAudioUrl(audioUrl)) {
      toast({
        title: "Audio Unavailable",
        description: "No valid audio source available.",
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
      toast({
        title: "Playback Error",
        description: "Failed to play audio. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
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
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = () => {
    if (!isValidAudioUrl(audioUrl)) {
      toast({
        title: "Download Error",
        description: "Invalid audio URL for download.",
        variant: "destructive"
      });
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = audioUrl!;
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download audio file.",
        variant: "destructive"
      });
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
          <VolumeX className="h-5 w-5" />
          <span className="font-medium">Audio Error</span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
          Failed to load audio. The file may be corrupted or unavailable.
        </p>
        <Button 
          onClick={() => {
            setHasError(false);
            if (audioRef.current) {
              audioRef.current.load();
            }
          }}
          variant="outline" 
          size="sm" 
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-900 dark:text-blue-100">Audio Player</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlayPause}
            variant="outline"
            size="sm"
            disabled={isLoading}
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
          disabled={!duration}
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
        />
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />

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
      `}</style>
    </div>
  );
}