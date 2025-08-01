import React, { useEffect, useState } from 'react';
import { SPOTIFY_CONFIG, getSpotifyConfig } from '../config/api';
import './SpotifyCallback.css';

const SpotifyCallback = () => {
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          setError(`Authorization failed: ${error}`);
          setStatus('Failed');
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setStatus('Failed');
          return;
        }

        setStatus('Exchanging code for token...');

        // Exchange the authorization code for an access token
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
          // Store the access token
          localStorage.setItem('spotify_access_token', data.access_token);
          
          setStatus('Success! Redirecting...');
          
          // Redirect back to the main app
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          setError('Failed to get access token: ' + (data.error || 'Unknown error'));
          setStatus('Failed');
        }
      } catch (error) {
        console.error('Callback error:', error);
        setError('Failed to process callback: ' + error.message);
        setStatus('Failed');
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="spotify-callback">
      <div className="callback-container">
        <div className="callback-header">
          <h1>🎵 Spotify Authorization</h1>
        </div>
        
        <div className="callback-content">
          {error ? (
            <div className="callback-error">
              <div className="error-icon">❌</div>
              <h2>Authorization Failed</h2>
              <p>{error}</p>
              <button 
                className="retry-btn"
                onClick={() => window.location.href = '/'}
              >
                ← Back to App
              </button>
            </div>
          ) : (
            <div className="callback-success">
              <div className="success-icon">🔄</div>
              <h2>{status}</h2>
              {status === 'Processing...' && (
                <div className="loading-spinner"></div>
              )}
              {status === 'Exchanging code for token...' && (
                <div className="loading-spinner"></div>
              )}
              {status === 'Success! Redirecting...' && (
                <p>You will be redirected to the app shortly...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotifyCallback; 