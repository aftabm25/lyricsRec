import React, { useState, useEffect, useRef } from 'react';
import { getAllSongs, getSongById } from './data/songs';
import SongRecognition from './components/SongRecognition';
import './App.css';

function App() {
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [detectedSong, setDetectedSong] = useState(null);
  const [showRecognition, setShowRecognition] = useState(false);
  const songs = getAllSongs();
  const intervalRef = useRef(null);
  const activeLineRef = useRef(null);
  const lyricsContainerRef = useRef(null);

  const handleSongSelect = (song) => {
    setSelectedSong(song);
    setIsPlaying(false);
    setCurrentLineIndex(0);
    setProgress(0);
  };

  const handleBackToHome = () => {
    setSelectedSong(null);
    setIsPlaying(false);
    setCurrentLineIndex(0);
    setProgress(0);
    setDetectedSong(null);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSongDetected = (song) => {
    setDetectedSong(song);
    setShowRecognition(false);
    
    // Try to find the detected song in our database
    const foundSong = songs.find(s => 
      s.title.toLowerCase().includes(song.title.toLowerCase()) ||
      s.artist.toLowerCase().includes(song.artist.toLowerCase())
    );
    
    if (foundSong) {
      setSelectedSong(foundSong);
    } else {
      // Show a notification that the song wasn't found
      alert(`Song detected: ${song.title} by ${song.artist}\n\nThis song is not in our database yet.`);
    }
  };

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && isPlaying) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentLineIndex, isPlaying]);

  useEffect(() => {
    if (isPlaying && selectedSong) {
      const totalDuration = selectedSong.lyrics.length * 3000; // 3 seconds per line
      const interval = 50; // Update every 50ms for smooth animation
      
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (interval / totalDuration) * 100;
          if (newProgress >= 100) {
            setIsPlaying(false);
            setProgress(0);
            setCurrentLineIndex(0);
            return 0;
          }
          
          // Calculate current line based on progress
          const lineIndex = Math.floor((newProgress / 100) * selectedSong.lyrics.length);
          setCurrentLineIndex(lineIndex);
          
          return newProgress;
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, selectedSong]);

  if (selectedSong) {
    return (
      <div className="app">
        <div className="song-view">
          <button className="back-button" onClick={handleBackToHome}>
            ← Back to Songs
          </button>
          
          <div className="song-header">
            <h1>{selectedSong.title}</h1>
            <p className="artist">{selectedSong.artist}</p>
            <p className="album">{selectedSong.album} • {selectedSong.year}</p>
          </div>

          <div className="player-controls">
            <button className="play-button" onClick={togglePlay}>
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {Math.floor(progress)}%
            </span>
          </div>

          <div className="lyrics-container" ref={lyricsContainerRef}>
            {selectedSong.lyrics.map((lyric, index) => (
              <div 
                key={index} 
                ref={index === currentLineIndex ? activeLineRef : null}
                className={`lyric-line ${index === currentLineIndex ? 'active' : ''} ${
                  index < currentLineIndex ? 'completed' : ''
                }`}
              >
                <div className="lyric-text">{lyric.line}</div>
                <div className="lyric-meaning">{lyric.meaning}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="home-screen">
        <header className="app-header">
          <h1>Lyrics & Meanings</h1>
          <p>Discover the deeper meaning behind your favorite songs</p>
        </header>

        {showRecognition ? (
          <SongRecognition onSongDetected={handleSongDetected} />
        ) : (
          <>
            <div className="recognition-section">
              <button 
                className="recognize-song-btn"
                onClick={() => setShowRecognition(true)}
              >
                🎵 Recognize Current Song
              </button>
            </div>
            
            <div className="songs-grid">
              {songs.map((song) => (
                <div 
                  key={song.id} 
                  className="song-card"
                  onClick={() => handleSongSelect(song)}
                >
                  <div className="song-info">
                    <h2 className="song-title">{song.title}</h2>
                    <p className="song-artist">{song.artist}</p>
                    <p className="song-album">{song.album} • {song.year}</p>
                    <p className="song-lyrics-count">{song.lyrics.length} lines</p>
                  </div>
                  <div className="song-arrow">→</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
