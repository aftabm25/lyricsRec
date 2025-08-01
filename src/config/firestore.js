import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYHpUzE9xZsXgWIcJqNdrCmHvW3hSQAwc",
  authDomain: "lyrics-rec-app.firebaseapp.com",
  projectId: "lyrics-rec-app",
  storageBucket: "lyrics-rec-app.firebasestorage.app",
  messagingSenderId: "1027026308127",
  appId: "1:1027026308127:web:f375153d7636b38cf8192a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const firestore = getFirestore(app);

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  FRIENDSHIPS: 'friendships',
  USER_SONGS: 'user_songs'
};

export default firestore; 