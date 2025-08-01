#!/bin/bash

# Create .env file with Firebase configuration
cat > .env << 'EOF'
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyBYHpUzE9xZsXgWIcJqNdrCmHvW3hSQAwc
REACT_APP_FIREBASE_AUTH_DOMAIN=lyrics-rec-app.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=lyrics-rec-app
REACT_APP_FIREBASE_STORAGE_BUCKET=lyrics-rec-app.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1027026308127
REACT_APP_FIREBASE_APP_ID=1:1027026308127:web:f375153d7636b38cf8192a

# Spotify API Configuration (already configured in src/config/api.js)
# SPOTIFY_CLIENT_ID=your-spotify-client-id
# SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
# SPOTIFY_REDIRECT_URI=your-redirect-uri

# ACRCloud Configuration (already configured in src/config/api.js)
# ACRCLOUD_HOST=your-acrcloud-host
# ACRCLOUD_ACCESS_KEY=your-acrcloud-access-key
# ACRCLOUD_ACCESS_SECRET=your-acrcloud-access-secret
EOF

echo "✅ .env file created successfully!"
echo "📝 Your Firebase configuration has been set up."
echo "🚀 You can now run 'npm start' to start the application." 