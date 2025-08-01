import React, { useState, useEffect } from 'react';
import { SPOTIFY_CONFIG, isSpotifyConfigured, getSpotifyConfig } from '../config/api';
import './SpotifyProfile.css';

const SpotifyProfile = ({ onShowProfile, onUserData }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Check if we have a stored access token
    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
      setIsConnected(true);
      fetchUserProfile(storedToken);
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token expired, clear it
        localStorage.removeItem('spotify_access_token');
        setAccessToken(null);
        setIsConnected(false);
        setUserProfile(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        if (onUserData) {
          onUserData(data);
        }
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpotifyLogin = () => {
    const config = getSpotifyConfig();
    const params = new URLSearchParams({
      client_id: config.CLIENT_ID,
      response_type: 'code',
      redirect_uri: config.REDIRECT_URI,
      scope: config.SCOPES,
      show_dialog: 'true'
    });
    
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    window.location.href = authUrl;
  };

  const handleDisconnect = () => {
    localStorage.removeItem('spotify_access_token');
    setAccessToken(null);
    setIsConnected(false);
    setUserProfile(null);
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
        fetchUserProfile(data.access_token);
        return true;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      setError('Failed to connect to Spotify');
      return false;
    }
  };

  if (!isSpotifyConfigured()) {
    return null; // Don't show anything if Spotify is not configured
  }

  return (
    <div className="spotify-profile">
      {!isConnected ? (
        <button className="spotify-connect-btn" onClick={handleSpotifyLogin}>
          <span className="spotify-icon">🎵</span>
          <span className="connect-text">Connect Spotify</span>
        </button>
      ) : (
        <div className="profile-container">
          {isLoading ? (
            <div className="profile-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : userProfile ? (
            <div className="user-profile">
              <div className="profile-image">
                {userProfile.images && userProfile.images.length > 0 ? (
                  <img 
                    src={userProfile.images[0].url} 
                    alt={userProfile.display_name}
                    className="profile-avatar"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {userProfile.display_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="connection-status connected"></div>
              </div>
              <div className="profile-info">
                <span className="user-name">{userProfile.display_name}</span>
                <span className="user-email">{userProfile.email}</span>
              </div>
              <div className="profile-actions">
                {onShowProfile && (
                  <button 
                    className="profile-btn" 
                    onClick={onShowProfile}
                    title="View Profile"
                  >
                    👤
                  </button>
                )}
                <button className="disconnect-btn" onClick={handleDisconnect} title="Disconnect Spotify">
                  <span>×</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-error">
              <span className="error-icon">⚠️</span>
              <button className="retry-btn" onClick={() => fetchUserProfile(accessToken)}>
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpotifyProfile; 