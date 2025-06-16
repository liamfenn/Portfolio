import { createContext, useContext, useRef, useState, useEffect } from 'react';
import { tracks } from '../data/tracks';

const MusicPlayerContext = createContext();

export function MusicPlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Restore state from localStorage safely
  useEffect(() => {
    try {
      const savedTime = typeof window !== 'undefined' ? Number(localStorage.getItem('playerTime')) || 0 : 0;
      const savedPlaying = typeof window !== 'undefined' ? localStorage.getItem('playerPlaying') === 'true' : false;
      const savedTrackIndex = typeof window !== 'undefined' ? Number(localStorage.getItem('playerTrackIndex')) || 0 : 0;
      setCurrentTime(savedTime);
      setIsPlaying(savedPlaying);
      setCurrentTrackIndex(savedTrackIndex);
    } catch (error) {
      console.warn('Failed to restore music player state:', error);
    }
  }, []);

  // Persist state safely
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('playerTime', currentTime);
        localStorage.setItem('playerPlaying', isPlaying);
        localStorage.setItem('playerTrackIndex', currentTrackIndex);
      }
    } catch (error) {
      console.warn('Failed to save music player state:', error);
    }
  }, [currentTime, isPlaying, currentTrackIndex]);

  const currentTrack = tracks[currentTrackIndex] || tracks[0];

  const nextTrack = () => {
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackIndex(nextIndex);
    setCurrentTime(0);
  };

  const prevTrack = () => {
    const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(prevIndex);
    setCurrentTime(0);
  };

  // Pause when tab is hidden
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handler = () => {
      if (document.hidden && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const value = { 
    audioRef, 
    isPlaying, 
    setIsPlaying, 
    currentTime, 
    setCurrentTime,
    currentTrack,
    nextTrack,
    prevTrack
  };
  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>;
}

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}; 
