import React, { useState, useEffect, useRef } from 'react';
import { SPOTIFY_CONFIG, isSpotifyConfigured, getSpotifyConfig } from '../config/api';
import './SpotifySongRecognition.css';

const SpotifySongRecognition = ({ onSongDetected, detectedSong, onViewSong, onBackToHome }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const pollingIntervalRef = useRef(null);

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

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
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

  // Helper function to check if two songs are the same
  const isSameSong = (song1, song2) => {
    return song1 && song2 && song1.spotify_id === song2.spotify_id;
  };

  const getCurrentlyPlaying = async (isPolling = false) => {
    if (!accessToken) {
      setError('Please connect to Spotify using the profile button in the header.');
      return;
    }

    try {
      if (!isPolling) {
        setIsLoading(true);
      }
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
        stopMonitoring();
        return;
      }

      if (response.status === 204) {
        // No content - nothing is currently playing
        if (!isPolling) {
          setError('No song is currently playing on Spotify. Please start playing a song and try again.');
        }
        if (isMonitoring) {
          // Clear current song if nothing is playing
          setCurrentSong(null);
          if (detectedSong) {
            onSongDetected(null);
          }
        }
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
          device_type: data.device?.type || 'Unknown',
          // Add timestamp for tracking updates
          timestamp: Date.now()
        };
        
        // Check if this is a new song or just a progress update
        if (!isSameSong(currentSong, song)) {
          // New song detected
          setCurrentSong(song);
          if (!isPolling) {
            onSongDetected(song);
          }
        } else {
          // Same song, just update progress
          setCurrentSong(song);
          // Also update detectedSong if it exists
          if (detectedSong && isSameSong(detectedSong, song)) {
            onSongDetected(song);
          }
        }
        
        setLastUpdateTime(new Date().toLocaleTimeString());
      } else {
        if (!isPolling) {
          setError('No song is currently playing on Spotify.');
        }
      }
    } catch (error) {
      console.error('Error getting currently playing:', error);
      if (!isPolling) {
        setError('Failed to get currently playing song. Please try again.');
      }
    } finally {
      if (!isPolling) {
        setIsLoading(false);
      }
    }
  };

  const startMonitoring = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log('Starting monitoring...');
    setIsMonitoring(true);
    // Poll every 2 seconds for real-time updates
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling for updates...');
      getCurrentlyPlaying(true);
    }, 2000);
  };

  const stopMonitoring = () => {
    console.log('Stopping monitoring...');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsMonitoring(false);
  };

  const getAvailableDevices = async () => {
    if (!accessToken) {
      setError('Please connect to Spotify using the profile button in the header.');
      return;
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('spotify_access_token');
        setAccessToken(null);
        setError('Spotify session expired. Please reconnect using the profile button in the header.');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAvailableDevices(data.devices || []);
        return data.devices || [];
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting available devices:', error);
      setError('Failed to get available devices. Please try again.');
      return [];
    }
  };

  const transferPlaybackToDevice = async (deviceId, play = true) => {
    if (!accessToken) {
      setError('Please connect to Spotify using the profile button in the header.');
      return false;
    }

    try {
      setIsTransferring(true);
      setError(null);

      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: play
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('spotify_access_token');
        setAccessToken(null);
        setError('Spotify session expired. Please reconnect using the profile button in the header.');
        return false;
      }

      if (response.status === 403) {
        setError('Playback control requires Spotify Premium. Please upgrade your account.');
        return false;
      }

      if (response.status === 204) {
        // Success - playback transferred
        return true;
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error transferring playback:', error);
      setError('Failed to transfer playback. Please try again.');
      return false;
    } finally {
      setIsTransferring(false);
    }
  };

  const handleTransferToPhone = async () => {
    // Get available devices first
    const devices = await getAvailableDevices();
    
    // Find mobile devices (phones/tablets)
    const mobileDevices = devices.filter(device => 
      device.type === 'Smartphone' || 
      device.type === 'Tablet' ||
      device.name.toLowerCase().includes('iphone') ||
      device.name.toLowerCase().includes('android') ||
      device.name.toLowerCase().includes('mobile')
    );

    if (mobileDevices.length === 0) {
      setError('No mobile devices found. Please make sure your phone is connected to Spotify.');
      return;
    }

    // Try to transfer to the first mobile device
    const success = await transferPlaybackToDevice(mobileDevices[0].id, true);
    
    if (success) {
      // Update the current song info to reflect the transfer
      setTimeout(() => {
        getCurrentlyPlaying(true);
      }, 1000);
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
    stopMonitoring();
  };

  const handleStartMonitoring = async () => {
    await getCurrentlyPlaying();
    // Start monitoring if we have a song (either currentSong or detectedSong)
    if (currentSong || detectedSong) {
      startMonitoring();
    }
  };

  const handleStopMonitoring = () => {
    stopMonitoring();
  };

  // Auto-start monitoring when a song is first detected
  useEffect(() => {
    console.log('detectedSong changed:', detectedSong, 'isMonitoring:', isMonitoring);
    if (detectedSong && !isMonitoring) {
      console.log('Auto-starting monitoring for detected song');
      startMonitoring();
    }
  }, [detectedSong]);

  // Cleanup monitoring when component unmounts or detectedSong changes
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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
              <li>Add your redirect URI: <code>https://lyrics-rec.vercel.app/callback</code></li>
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
            
            {/* Monitoring Status */}
            <div className="monitoring-status">
              {isMonitoring ? (
                <div className="status-indicator monitoring">
                  <span className="status-dot"></span>
                  <span>🔄 Live Monitoring Active</span>
                  {lastUpdateTime && (
                    <span className="last-update">Last update: {lastUpdateTime}</span>
                  )}
                </div>
              ) : (
                <div className="status-indicator">
                  <span className="status-dot"></span>
                  <span>⏸️ Monitoring Paused</span>
                </div>
              )}
            </div>

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
              
              <button 
                className="transfer-to-phone-btn" 
                onClick={handleTransferToPhone}
                disabled={isTransferring}
              >
                {isTransferring ? '📱 Transferring...' : '📱 Play on Phone'}
              </button>
              
              {isMonitoring ? (
                <button className="stop-monitoring-btn" onClick={handleStopMonitoring}>
                  ⏹️ Stop Live Monitoring
                </button>
              ) : (
                <button className="start-monitoring-btn" onClick={handleStartMonitoring}>
                  🔄 Start Live Monitoring
                </button>
              )}
              
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
            onClick={handleStartMonitoring}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Getting Current Song...' : '🎵 Get Currently Playing Song'}
          </button>

          {currentSong && (
            <div className="current-song-info">
              <h4>Currently Playing:</h4>
              
              {/* Monitoring Status */}
              <div className="monitoring-status">
                {isMonitoring ? (
                  <div className="status-indicator monitoring">
                    <span className="status-dot"></span>
                    <span>🔄 Live Monitoring Active</span>
                    {lastUpdateTime && (
                      <span className="last-update">Last update: {lastUpdateTime}</span>
                    )}
                  </div>
                ) : (
                  <div className="status-indicator">
                    <span className="status-dot"></span>
                    <span>⏸️ Monitoring Paused</span>
                  </div>
                )}
              </div>

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

              {/* Monitoring Controls */}
              <div className="monitoring-controls">
                {isMonitoring ? (
                  <button className="stop-monitoring-btn" onClick={handleStopMonitoring}>
                    ⏹️ Stop Live Monitoring
                  </button>
                ) : (
                  <button className="start-monitoring-btn" onClick={startMonitoring}>
                    🔄 Start Live Monitoring
                  </button>
                )}
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