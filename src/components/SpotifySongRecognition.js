import React, { useState, useEffect } from 'react';
import { SPOTIFY_CONFIG, isSpotifyConfigured, getSpotifyConfig } from '../config/api';
import './SpotifySongRecognition.css';

const SpotifySongRecognition = ({ onSongDetected }) => {
  const [isConnected, setIsConnected] = useState(false);
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
      setIsConnected(true);
    }
  }, []);

  const getSpotifyAuthUrl = () => {
    const config = getSpotifyConfig();
    const params = new URLSearchParams({
      client_id: config.CLIENT_ID,
      response_type: 'code',
      redirect_uri: config.REDIRECT_URI,
      scope: config.SCOPES,
      show_dialog: 'true'
    });
    
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  const handleSpotifyLogin = () => {
    const authUrl = getSpotifyAuthUrl();
    window.location.href = authUrl;
  };

  const exchangeCodeForToken = async (code) => {
    try {
      const config = getSpotifyConfig();
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(config.CLIENT_ID + ':' + config.CLIENT_SECRET)
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: config.REDIRECT_URI
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        setAccessToken(data.access_token);
        localStorage.setItem('spotify_access_token', data.access_token);
        setIsConnected(true);
        return true;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      setError('Failed to connect to Spotify. Please try again.');
      return false;
    }
  };

  const getCurrentlyPlaying = async () => {
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
        setIsConnected(false);
        setError('Spotify session expired. Please reconnect.');
        return;
      }

      if (response.status === 204) {
        // No content - nothing is currently playing
        setError('No song is currently playing on Spotify. Please start playing a song and try again.');
        return;
      }

      const data = await response.json();
      
      if (data.item) {
        const song = {
          title: data.item.name,
          artist: data.item.artists.map(artist => artist.name).join(', '),
          album: data.item.album.name,
          spotify_id: data.item.id,
          duration_ms: data.item.duration_ms,
          progress_ms: data.progress_ms,
          is_playing: data.is_playing
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

  const handleDisconnect = () => {
    localStorage.removeItem('spotify_access_token');
    setAccessToken(null);
    setIsConnected(false);
    setCurrentSong(null);
    setError(null);
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !isConnected) {
      exchangeCodeForToken(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isConnected]);

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
              <li>Add your redirect URI: <code>http://localhost:3000/callback</code></li>
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

      {!isConnected ? (
        <div className="spotify-login">
          <div className="login-card">
            <h3>Connect to Spotify</h3>
            <p>Connect your Spotify account to get the currently playing song</p>
            <button className="spotify-login-btn" onClick={handleSpotifyLogin}>
              <span className="spotify-icon">🎵</span>
              Connect Spotify Account
            </button>
          </div>
        </div>
      ) : (
        <div className="spotify-controls">
          <div className="connection-status">
            <span className="status-dot connected"></span>
            <span>Connected to Spotify</span>
            <button className="disconnect-btn" onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>

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
                <p className="song-status">
                  {currentSong.is_playing ? '▶️ Playing' : '⏸️ Paused'}
                </p>
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