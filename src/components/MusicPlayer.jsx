// =============================
// MusicPlayer.jsx - Fixed Bottom Music Bar
// =============================

import { useEffect, useRef } from 'react';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import './MusicPlayer.css';

export default function MusicPlayer() {
  let musicPlayerData;
  try {
    musicPlayerData = useMusicPlayer();
  } catch (error) {
    console.error('MusicPlayer error:', error);
    return null;
  }
  
  const { 
    audioRef, 
    isPlaying, 
    setIsPlaying, 
    currentTime, 
    setCurrentTime,
    currentTrack,
    nextTrack,
    prevTrack
  } = musicPlayerData;

  const marqueeRef = useRef(null);
  const textRef = useRef(null);

  // Toggle play/pause
  const handlePlayPause = () => {
    try {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
        setIsPlaying(true);
      }
    } catch (error) {
      console.warn('Play/pause error:', error);
    }
  };

  const handleNextTrack = () => {
    try {
      nextTrack();
    } catch (error) {
      console.warn('Next track error:', error);
    }
  };

  const handlePrevTrack = () => {
    try {
      prevTrack();
    } catch (error) {
      console.warn('Previous track error:', error);
    }
  };

  useEffect(() => {
    try {
      if (!audioRef.current) return;
      audioRef.current.currentTime = currentTime;
      const update = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      };
      audioRef.current.addEventListener('timeupdate', update);
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('timeupdate', update);
        }
      };
    } catch (error) {
      console.warn('Audio setup error:', error);
    }
  }, [audioRef, setCurrentTime]);

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.audio;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(e => console.warn('Auto-play failed:', e));
      }
    }
  }, [currentTrack, audioRef, isPlaying]);

  // Dynamic marquee animation based on text width
  useEffect(() => {
    if (textRef.current && marqueeRef.current && currentTrack) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        const textWidth = textRef.current.offsetWidth;
        const containerWidth = marqueeRef.current.offsetWidth;
        
        // Only use marquee if text overflows container + some buffer
        const needsMarquee = textWidth > (containerWidth - 20);
        
        if (needsMarquee) {
          const gap = 48; // Gap between repetitions
          
          // Adaptive speed: shorter text = faster, longer text = slower
          let pixelsPerSecond;
          if (textWidth < 200) {
            pixelsPerSecond = 80; // Fast for short text
          } else if (textWidth < 350) {
            pixelsPerSecond = 65; // Medium for medium text
          } else {
            pixelsPerSecond = 50; // Slower for long text
          }
          
          const duration = Math.max(4, (textWidth + gap) / pixelsPerSecond);
          
          marqueeRef.current.style.setProperty('--text-width', `${textWidth}px`);
          marqueeRef.current.style.setProperty('--gap-width', `${gap}px`);
          marqueeRef.current.style.setProperty('--duration', `${duration}s`);
          marqueeRef.current.classList.add('needs-marquee');
        } else {
          marqueeRef.current.classList.remove('needs-marquee');
        }
      }, 10);
    }
  }, [currentTrack]);

  return (
    <div className="music-player">
      <img src={currentTrack?.cover} alt="Album Cover" className="music-cover" />

      <div className="music-info">
        {/* Desktop layout */}
        <div className="info-desktop">
          <span className="music-title">{currentTrack?.title}</span>
          <span className="music-artist">{currentTrack?.artist}</span>
        </div>

        {/* Mobile marquee layout */}
        <div className="marquee-info" key={currentTrack?.id} ref={marqueeRef}>
          <div className="marquee">
            <span className="marquee-item" ref={textRef}>
              {currentTrack?.title}
              <span className="title-artist-gap">&nbsp;&nbsp;</span>
              <span className="music-artist-inline">{currentTrack?.artist}</span>
            </span>
            <span className="marquee-item">
              {currentTrack?.title}
              <span className="title-artist-gap">&nbsp;&nbsp;</span>
              <span className="music-artist-inline">{currentTrack?.artist}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="music-controls">
        <button className="control-btn" onClick={handlePrevTrack}>P</button>
        <button className={`control-btn play-btn ${isPlaying ? 'pause' : ''}`} onClick={handlePlayPause}>{isPlaying ? '■' : '▶'}</button>
        <button className="control-btn" onClick={handleNextTrack}>N</button>
      </div>

      <audio ref={audioRef} preload="metadata" />
    </div>
  );
} 
