import { Firestore } from '@google-cloud/firestore';

// Initialize Firestore
// Note: In production, you'll need to set up Google Cloud credentials
// For now, we'll use the default credentials which work with Google Cloud SDK
const firestore = new Firestore({
  projectId: 'lyrics-rec-app', // Replace with your actual project ID
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS // Path to your service account key
});

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  FRIENDSHIPS: 'friendships',
  USER_SONGS: 'user_songs'
};

export default firestore; 