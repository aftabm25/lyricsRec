import React, { useState, useEffect } from 'react';
import { SPOTIFY_CONFIG, isSpotifyConfigured, getSpotifyConfig } from '../config/api';
import './SpotifySongRecognition.css';

const SpotifySongRecognition = ({ onSongDetected, detectedSong, onViewSong, onBackToHome }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Check if Spotify is configured
    if (!isSpotifyConfigured()) {
      setError('Spotify not configured. Please add your credentials in src/config/api.js');
      return;
    }

    // Check if we have a stored access token
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
    } else {
      setError('Please connect to Spotify using the profile button in the header.');
    }
  }, []);

  // Helper function to format time in MM:SS format
  const formatTime = (milliseconds) => {
    if (!milliseconds) return '0:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Helper function to calculate progress percentage
  const calculateProgress = (progressMs, durationMs) => {
    if (!progressMs || !durationMs) return 0;
    return Math.round((progressMs / durationMs) * 100);
  };

  const getCurrentlyPlaying = async () => {
    if (!accessToken) {
      setError('Please connect to Spotify using the profile button in the header.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        // Token expired, clear it and ask user to reconnect
        localStorage.removeItem('spotify_access_token');
        setAccessToken(null);
        setError('Spotify session expired. Please reconnect using the profile button in the header.');
        return;
      }

      if (response.status === 204) {
        // No content - nothing is currently playing
        setError('No song is currently playing on Spotify. Please start playing a song and try again.');
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.item) {
        const song = {
          title: data.item.name,
          artist: data.item.artists.map(artist => artist.name).join(', '),
          album: data.item.album.name,
          spotify_id: data.item.id,
          duration_ms: data.item.duration_ms,
          progress_ms: data.progress_ms || 0,
          is_playing: data.is_playing,
          // Add formatted time and progress percentage
          current_time: formatTime(data.progress_ms || 0),
          total_time: formatTime(data.item.duration_ms),
          progress_percentage: calculateProgress(data.progress_ms || 0, data.item.duration_ms),
          // Add device info if available
          device_name: data.device?.name || 'Unknown Device',
          device_type: data.device?.type || 'Unknown'
        };
        
        setCurrentSong(song);
        onSongDetected(song);
      } else {
        setError('No song is currently playing on Spotify.');
      }
    } catch (error) {
      console.error('Error getting currently playing:', error);
      setError('Failed to get currently playing song. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSong = () => {
    if (onViewSong && detectedSong) {
      onViewSong(detectedSong);
    }
  };

  const handleTryAgain = () => {
    setCurrentSong(null);
    onSongDetected(null);
  };

  if (!isSpotifyConfigured()) {
    return (
      <div className="spotify-recognition">
        <div className="recognition-error">
          <h3>❌ Spotify Not Configured</h3>
          <p>Please add your Spotify API credentials in src/config/api.js</p>
          <div className="setup-instructions">
            <h4>Setup Instructions:</h4>
            <ol>
              <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">Spotify Developer Dashboard</a></li>
              <li>Create a new app</li>
              <li>Add your redirect URI: <code>http://127.0.0.1:3000/callback</code></li>
              <li>Copy your Client ID and Client Secret</li>
              <li>Update the config file with your credentials</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="spotify-recognition">
      <div className="recognition-header">
        <h2>🎵 Spotify Song Recognition</h2>
        <p>Get the currently playing song from your Spotify account</p>
      </div>

      {!accessToken ? (
        <div className="spotify-login">
          <div className="login-card">
            <h3>Connect to Spotify</h3>
            <p>Please connect your Spotify account using the profile button in the header to get the currently playing song</p>
            <div className="connection-note">
              <span>💡 Look for the Spotify profile button in the top-right corner of the page</span>
            </div>
          </div>
        </div>
      ) : detectedSong ? (
        <div className="song-detected-view">
          <div className="current-song-info">
            <h4>🎯 Song Detected!</h4>
            <div className="song-details">
              <p className="song-title">{detectedSong.title}</p>
              <p className="song-artist">{detectedSong.artist}</p>
              <p className="song-album">{detectedSong.album}</p>
              
              {/* Playback Progress */}
              <div className="playback-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${detectedSong.progress_percentage}%` }}
                  ></div>
                </div>
                <div className="time-info">
                  <span className="current-time">{detectedSong.current_time}</span>
                  <span className="total-time">{detectedSong.total_time}</span>
                </div>
                <div className="progress-percentage">
                  {detectedSong.progress_percentage}% complete
                </div>
              </div>

              <p className="song-status">
                {detectedSong.is_playing ? '▶️ Playing' : '⏸️ Paused'}
              </p>
              
              {/* Device Info */}
              <div className="device-info">
                <span className="device-name">📱 {detectedSong.device_name}</span>
                <span className="device-type">({detectedSong.device_type})</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="view-song-btn" onClick={handleViewSong}>
                🎵 View Song & Lyrics
              </button>
              <button className="try-again-btn" onClick={handleTryAgain}>
                🔄 Try Another Song
              </button>
              <button className="back-btn" onClick={onBackToHome}>
                ← Back to Home
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="spotify-controls">
          <button 
            className="get-current-song-btn" 
            onClick={getCurrentlyPlaying}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Getting Current Song...' : '🎵 Get Currently Playing Song'}
          </button>

          {currentSong && (
            <div className="current-song-info">
              <h4>Currently Playing:</h4>
              <div className="song-details">
                <p className="song-title">{currentSong.title}</p>
                <p className="song-artist">{currentSong.artist}</p>
                <p className="song-album">{currentSong.album}</p>
                
                {/* Playback Progress */}
                <div className="playback-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${currentSong.progress_percentage}%` }}
                    ></div>
                  </div>
                  <div className="time-info">
                    <span className="current-time">{currentSong.current_time}</span>
                    <span className="total-time">{currentSong.total_time}</span>
                  </div>
                  <div className="progress-percentage">
                    {currentSong.progress_percentage}% complete
                  </div>
                </div>

                <p className="song-status">
                  {currentSong.is_playing ? '▶️ Playing' : '⏸️ Paused'}
                </p>
                
                {/* Device Info */}
                <div className="device-info">
                  <span className="device-name">📱 {currentSong.device_name}</span>
                  <span className="device-type">({currentSong.device_type})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="recognition-error">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default SpotifySongRecognition; 