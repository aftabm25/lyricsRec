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

// Alternative free music recognition APIs:
// 1. ACRCloud (https://www.acrcloud.com/) - 1000 free requests/month ✅ CURRENT
// 2. AudD (https://audd.io/) - 100 free requests/month
// 3. AudD.io (https://audd.io/) - 100 free requests/month

export const isAcrCloudConfigured = () => {
  return ACRCLOUD_CONFIG.HOST !== 'YOUR_HOST' && 
         ACRCLOUD_CONFIG.ACCESS_KEY !== 'YOUR_ACCESS_KEY' && 
         ACRCLOUD_CONFIG.ACCESS_SECRET !== 'YOUR_ACCESS_SECRET';
};

export const getAcrCloudConfig = () => {
  return {
    host: ACRCLOUD_CONFIG.HOST,
    access_key: ACRCLOUD_CONFIG.ACCESS_KEY,
    access_secret: ACRCLOUD_CONFIG.ACCESS_SECRET
  };
}; 