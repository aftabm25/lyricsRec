// ACRCloud API Configuration
// Get your free API credentials from: https://www.acrcloud.com/
// 
// Steps to get free API credentials:
// 1. Go to https://www.acrcloud.com/
// 2. Click "Sign Up" and create a free account
// 3. Create a new project in the dashboard
// 4. Note your host, access key, and access secret
// 5. Replace the values below with your actual credentials

export const ACRCLOUD_CONFIG = {
  HOST: 'identify-ap-southeast-1.acrcloud.com',
  ACCESS_KEY: 'bcc63fa2787181c83abf110c9c1ece4f',
  ACCESS_SECRET: 'TRF9ojY8ci8VMqvJwsopIZ0aF24caGYqdXPA1po2',
  FREE_TIER_LIMITS: {
    requests_per_month: 1000,
    max_audio_duration: 30 // seconds
  }
};

// Spotify API Configuration
// Get your free API credentials from: https://developer.spotify.com/
//
// Steps to get Spotify API credentials:
// 1. Go to https://developer.spotify.com/dashboard
// 2. Log in with your Spotify account
// 3. Create a new app
// 4. Note your Client ID and Client Secret
// 5. Add your redirect URI (e.g., http://127.0.0.1:3000/callback for development)

export const SPOTIFY_CONFIG = {
  CLIENT_ID: '4def2a0d79de42489df02d36614c0003', // Your Spotify Client ID
  CLIENT_SECRET: '35faa5813d134b08b7ab88b28c6520b6', // Your Spotify Client Secret
  REDIRECT_URI: 'http://127.0.0.1:3000/callback', // For development (explicit IPv4)
  // REDIRECT_URI: 'https://your-vercel-app.vercel.app/callback', // For production
  SCOPES: [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-read-recently-played'
  ].join(' ')
};

// Alternative free music recognition APIs:
// 1. ACRCloud (https://www.acrcloud.com/) - 1000 free requests/month ✅ CURRENT
// 2. Spotify API (https://developer.spotify.com/) - Free tier available ✅ NEW
// 3. AudD (https://audd.io/) - 100 free requests/month

export const isAcrCloudConfigured = () => {
  return ACRCLOUD_CONFIG.HOST !== 'YOUR_HOST' && 
         ACRCLOUD_CONFIG.ACCESS_KEY !== 'YOUR_ACCESS_KEY' && 
         ACRCLOUD_CONFIG.ACCESS_SECRET !== 'YOUR_ACCESS_SECRET';
};

export const isSpotifyConfigured = () => {
  return SPOTIFY_CONFIG.CLIENT_ID !== 'YOUR_SPOTIFY_CLIENT_ID' && 
         SPOTIFY_CONFIG.CLIENT_SECRET !== 'YOUR_SPOTIFY_CLIENT_SECRET';
};

export const getAcrCloudConfig = () => {
  return {
    host: ACRCLOUD_CONFIG.HOST,
    access_key: ACRCLOUD_CONFIG.ACCESS_KEY,
    access_secret: ACRCLOUD_CONFIG.ACCESS_SECRET
  };
};

export const getSpotifyConfig = () => {
  return SPOTIFY_CONFIG;
}; 