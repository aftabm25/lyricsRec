import { Firestore } from '@google-cloud/firestore';

// Initialize Firestore for user management only
const firestore = new Firestore({
  projectId: 'lyrics-rec-app', // You'll need to create this project in Google Cloud Console
  keyFilename: './service-account-key.json' // For server-side (we'll handle client-side differently)
});

// For client-side usage (browser), we'll use a different approach
// since we can't expose service account keys in the browser

export default firestore;

// Client-side Firestore configuration (for browser)
export const initializeFirestoreClient = () => {
  // We'll use Firebase SDK for client-side operations
  // This is a placeholder - we'll implement this properly
  console.log('Firestore client initialization placeholder');
};

// User management functions
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = firestore.collection('users').doc(userId);
    await userRef.set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, userId };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      return { success: true, user: userDoc.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
      ...updates,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Friend management functions
export const addFriend = async (userId, friendUsername) => {
  try {
    // First, find the friend by username
    const usersRef = firestore.collection('users');
    const friendQuery = await usersRef.where('username', '==', friendUsername).get();
    
    if (friendQuery.empty) {
      return { success: false, error: 'User not found' };
    }
    
    const friendDoc = friendQuery.docs[0];
    const friendId = friendDoc.id;
    
    if (friendId === userId) {
      return { success: false, error: 'Cannot add yourself as a friend' };
    }
    
    // Add friend to user's friends list
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
      friends: firestore.FieldValue.arrayUnion(friendId),
      updatedAt: new Date()
    });
    
    return { success: true, friendId };
  } catch (error) {
    console.error('Error adding friend:', error);
    return { success: false, error: error.message };
  }
};

export const removeFriend = async (userId, friendId) => {
  try {
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
      friends: firestore.FieldValue.arrayRemove(friendId),
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { success: false, error: error.message };
  }
};

export const getFriendsList = async (userId) => {
  try {
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    const friendsList = userData.friends || [];
    
    if (friendsList.length === 0) {
      return { success: true, friends: [] };
    }
    
    // Get friend profiles
    const friendsRef = firestore.collection('users');
    const friendsQuery = await friendsRef.where(firestore.FieldPath.documentId(), 'in', friendsList).get();
    
    const friends = friendsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, friends };
  } catch (error) {
    console.error('Error getting friends list:', error);
    return { success: false, error: error.message };
  }
};

// User authentication and session management
export const createUserSession = async (userId, sessionData) => {
  try {
    const sessionRef = firestore.collection('users').doc(userId).collection('sessions').doc('current');
    await sessionRef.set({
      ...sessionData,
      createdAt: new Date(),
      lastActive: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user session:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserSession = async (userId, sessionData) => {
  try {
    const sessionRef = firestore.collection('users').doc(userId).collection('sessions').doc('current');
    await sessionRef.update({
      ...sessionData,
      lastActive: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user session:', error);
    return { success: false, error: error.message };
  }
};

export const getUserSession = async (userId) => {
  try {
    const sessionRef = firestore.collection('users').doc(userId).collection('sessions').doc('current');
    const sessionDoc = await sessionRef.get();
    
    if (sessionDoc.exists) {
      return { success: true, session: sessionDoc.data() };
    } else {
      return { success: false, error: 'Session not found' };
    }
  } catch (error) {
    console.error('Error getting user session:', error);
    return { success: false, error: error.message };
  }
};

// User preferences and settings
export const saveUserPreferences = async (userId, preferences) => {
  try {
    const prefsRef = firestore.collection('users').doc(userId).collection('preferences').doc('settings');
    await prefsRef.set({
      ...preferences,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return { success: false, error: error.message };
  }
};

export const getUserPreferences = async (userId) => {
  try {
    const prefsRef = firestore.collection('users').doc(userId).collection('preferences').doc('settings');
    const prefsDoc = await prefsRef.get();
    
    if (prefsDoc.exists) {
      return { success: true, preferences: prefsDoc.data() };
    } else {
      return { success: true, preferences: {} };
    }
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return { success: false, error: error.message };
  }
}; 