import React, { useState, useEffect, useRef } from 'react';
import { getAllSongs, getSongById } from './data/songs';
import SpotifySongRecognition from './components/SpotifySongRecognition';
import UserProfile from './components/UserProfile';
import UserDashboard from './components/UserDashboard';
import AuthPage from './components/AuthPage';
import { UserProvider, useUser } from './context/UserContext';
import authService from './services/authService';
import './App.css';

function AppContent() {
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [detectedSong, setDetectedSong] = useState(null);
  const [showRecognition, setShowRecognition] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const songs = getAllSongs();
  const intervalRef = useRef(null);
  const activeLineRef = useRef(null);
  const lyricsContainerRef = useRef(null);

  useEffect(() => {
    // Check if user is already authenticated
    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (user) {
        console.log('User is authenticated:', user);
        setIsAuthenticated(true);
        setCurrentUser(user);
      } else {
        console.log('No user authenticated');
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user, userData) => {
    console.log('Authentication successful:', user, userData);
    setIsAuthenticated(true);
    setCurrentUser(userData || user);
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
    setShowDashboard(false);
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

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Show main app if authenticated
  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1 onClick={handleBackToHome} className="app-title">
            LyricsRec
          </h1>
          <div className="header-actions">
            <UserProfile currentUser={currentUser} />
            <button 
              className="signout-btn" 
              onClick={handleSignOut}
              title="Sign Out"
            >
              🚪
            </button>
          </div>
        </div>
      </header>

      <main className="App-main">
        {!selectedSong && !showRecognition && !showDashboard && (
          <div className="home-content">
            <div className="welcome-section">
              <h2>Welcome, {currentUser?.username || currentUser?.displayName || 'User'}!</h2>
              <p>Discover and share your favorite music with friends</p>
            </div>
            
            <div className="action-buttons">
              <button 
                className="action-btn primary"
                onClick={() => setShowRecognition(true)}
              >
                🎵 Recognize Song
              </button>
              
              <button 
                className="action-btn secondary"
                onClick={() => setShowDashboard(true)}
              >
                📊 My Dashboard
              </button>
            </div>

            <div className="recent-songs">
              <h3>Recent Songs</h3>
              <div className="songs-grid">
                {songs.slice(0, 6).map((song) => (
                  <div 
                    key={song.id} 
                    className="song-card"
                    onClick={() => handleSongSelect(song)}
                  >
                    <div className="song-info">
                      <h4>{song.title}</h4>
                      <p>{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showRecognition && (
          <SpotifySongRecognition
            onSongDetected={handleSongDetected}
            onBack={handleBackFromRecognition}
          />
        )}

        {showDashboard && currentUser && (
          <UserDashboard userId={currentUser.id} />
        )}

        {selectedSong && (
          <div className="song-player">
            <div className="song-header">
              <button className="back-btn" onClick={handleBackToHome}>
                ← Back
              </button>
              <div className="song-info">
                <h2>{selectedSong.title}</h2>
                <p>{selectedSong.artist}</p>
              </div>
            </div>

            <div className="player-controls">
              <button 
                className={`play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={togglePlay}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="lyrics-container" ref={lyricsContainerRef}>
              {selectedSong.lyrics.map((line, index) => (
                <div
                  key={index}
                  ref={index === currentLineIndex ? activeLineRef : null}
                  className={`lyrics-line ${
                    index === currentLineIndex && isPlaying ? 'active' : ''
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
