import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBYHpUzE9xZsXgWIcJqNdrCmHvW3hSQAwc",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "lyrics-rec-app.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "lyrics-rec-app",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "lyrics-rec-app.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1027026308127",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1027026308127:web:f375153d7636b38cf8192a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const firestore = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

// Collections
export const COLLECTIONS = {
  USERS: 'user-info',
  FRIENDSHIPS: 'friendships',
  USER_SONGS: 'user_songs'
};

export { auth };
export default firestore; 