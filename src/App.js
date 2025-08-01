import React, { useState, useEffect, useRef } from 'react';
import { getAllSongs, getSongById } from './data/songs';
import SpotifySongRecognition from './components/SpotifySongRecognition';
import SpotifyProfile from './components/SpotifyProfile';
import UserProfile from './components/UserProfile';
import './App.css';

function App() {
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [detectedSong, setDetectedSong] = useState(null);
  const [showRecognition, setShowRecognition] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState(null);
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
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSongDetected = (song) => {
    setDetectedSong(song);
    // Don't hide the recognition component immediately - let the user see the enhanced info
    // setShowRecognition(false);

    // Try to find a matching song in our database
    const foundSong = songs.find(s =>
      s.title.toLowerCase().includes(song.title.toLowerCase()) ||
      s.artist.toLowerCase().includes(song.artist.toLowerCase())
    );

    if (foundSong) {
      // Show a success message instead of immediately navigating
      // setSelectedSong(foundSong);
    } else {
      // Don't show alert immediately - let the user see the song info first
      // alert(`Song detected: ${song.title} by ${song.artist}\n\nThis song is not in our database yet.`);
    }
  };

  const handleViewSong = (song) => {
    // Try to find a matching song in our database
    const foundSong = songs.find(s =>
      s.title.toLowerCase().includes(song.title.toLowerCase()) ||
      s.artist.toLowerCase().includes(song.artist.toLowerCase())
    );

    if (foundSong) {
      setSelectedSong(foundSong);
      setShowRecognition(false);
      setDetectedSong(null);
    } else {
      alert(`Song detected: ${song.title} by ${song.artist}\n\nThis song is not in our database yet.`);
    }
  };

  const handleBackFromRecognition = () => {
    setShowRecognition(false);
    setDetectedSong(null);
  };

  const handleShowUserProfile = () => {
    setShowUserProfile(true);
    setShowRecognition(false);
  };

  const handleBackFromProfile = () => {
    setShowUserProfile(false);
  };

  const handleProfileUpdate = (userData) => {
    setSpotifyUser(userData);
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
      const totalDuration = selectedSong.lyrics.length * 3000;
      const interval = 50;

      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (interval / totalDuration) * 100;
          if (newProgress >= 100) {
            setIsPlaying(false);
            setProgress(0);
            setCurrentLineIndex(0);
            return 0;
          }
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
          <div className="song-view-header">
            <button className="back-button" onClick={handleBackToHome}>
              ← Back to Songs
            </button>
            <SpotifyProfile onShowProfile={handleShowUserProfile} onUserData={setSpotifyUser} />
          </div>
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
          <div className="header-content">
            <div className="header-left">
              <h1>Lyrics & Meanings</h1>
              <p>Discover the deeper meaning behind your favorite songs</p>
            </div>
            <div className="header-right">
              <SpotifyProfile onShowProfile={handleShowUserProfile} onUserData={setSpotifyUser} />
            </div>
          </div>
        </header>
        {showRecognition ? (
          <SpotifySongRecognition
            onSongDetected={handleSongDetected}
            detectedSong={detectedSong}
            onViewSong={handleViewSong}
            onBackToHome={handleBackFromRecognition}
          />
        ) : showUserProfile ? (
          <div className="user-profile-section">
            <div className="profile-header">
              <button className="back-button" onClick={handleBackFromProfile}>
                ← Back to Home
              </button>
            </div>
            <UserProfile 
              spotifyUser={spotifyUser} 
              onProfileUpdate={handleProfileUpdate}
            />
          </div>
        ) : (
          <>
            <div className="recognition-section">
              <button
                className="recognize-song-btn"
                onClick={() => setShowRecognition(true)}
              >
                🎵 Get Current Spotify Song
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
