import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';

// User profile structure
export const createUserProfile = async (spotifyUserId, spotifyProfile) => {
  try {
    const userRef = doc(db, 'users', spotifyUserId);
    
    const userProfile = {
      spotifyUserId,
      displayName: spotifyProfile.display_name || 'Unknown User',
      email: spotifyProfile.email || '',
      profileImage: spotifyProfile.images?.[0]?.url || '',
      username: generateUsername(spotifyProfile.display_name),
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      friends: [],
      friendRequests: [],
      sentFriendRequests: [],
      totalSongsRecognized: 0,
      favoriteGenres: [],
      isOnline: true
    };

    await setDoc(userRef, userProfile);
    return userProfile;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Generate unique username from display name
const generateUsername = (displayName) => {
  if (!displayName) return `user_${Math.random().toString(36).substr(2, 9)}`;
  
  const baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  
  const randomSuffix = Math.random().toString(36).substr(2, 4);
  return `${baseUsername}_${randomSuffix}`;
};

// Get user profile
export const getUserProfile = async (spotifyUserId) => {
  try {
    const userRef = doc(db, 'users', spotifyUserId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (spotifyUserId, updates) => {
  try {
    const userRef = doc(db, 'users', spotifyUserId);
    await updateDoc(userRef, {
      ...updates,
      lastActive: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Search users by username
export const searchUsersByUsername = async (username) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '>=', username), where('username', '<=', username + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// Send friend request
export const sendFriendRequest = async (fromUserId, toUsername) => {
  try {
    // Find user by username
    const users = await searchUsersByUsername(toUsername);
    if (users.length === 0) {
      throw new Error('User not found');
    }
    
    const toUser = users[0];
    if (toUser.spotifyUserId === fromUserId) {
      throw new Error('Cannot send friend request to yourself');
    }
    
    // Check if already friends or request already sent
    const fromUserProfile = await getUserProfile(fromUserId);
    if (fromUserProfile.friends.includes(toUser.spotifyUserId)) {
      throw new Error('Already friends');
    }
    
    if (fromUserProfile.sentFriendRequests.includes(toUser.spotifyUserId)) {
      throw new Error('Friend request already sent');
    }
    
    // Add to sent requests for sender
    await updateUserProfile(fromUserId, {
      sentFriendRequests: arrayUnion(toUser.spotifyUserId)
    });
    
    // Add to received requests for receiver
    await updateUserProfile(toUser.spotifyUserId, {
      friendRequests: arrayUnion(fromUserId)
    });
    
    return { success: true, message: 'Friend request sent' };
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

// Accept friend request
export const acceptFriendRequest = async (userId, friendUserId) => {
  try {
    const userProfile = await getUserProfile(userId);
    const friendProfile = await getUserProfile(friendUserId);
    
    if (!userProfile.friendRequests.includes(friendUserId)) {
      throw new Error('No friend request from this user');
    }
    
    // Add to friends list for both users
    await updateUserProfile(userId, {
      friends: arrayUnion(friendUserId),
      friendRequests: arrayRemove(friendUserId)
    });
    
    await updateUserProfile(friendUserId, {
      friends: arrayUnion(userId),
      sentFriendRequests: arrayRemove(userId)
    });
    
    return { success: true, message: 'Friend request accepted' };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

// Reject friend request
export const rejectFriendRequest = async (userId, friendUserId) => {
  try {
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile.friendRequests.includes(friendUserId)) {
      throw new Error('No friend request from this user');
    }
    
    // Remove from requests for both users
    await updateUserProfile(userId, {
      friendRequests: arrayRemove(friendUserId)
    });
    
    await updateUserProfile(friendUserId, {
      sentFriendRequests: arrayRemove(userId)
    });
    
    return { success: true, message: 'Friend request rejected' };
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
};

// Remove friend
export const removeFriend = async (userId, friendUserId) => {
  try {
    // Remove from friends list for both users
    await updateUserProfile(userId, {
      friends: arrayRemove(friendUserId)
    });
    
    await updateUserProfile(friendUserId, {
      friends: arrayRemove(userId)
    });
    
    return { success: true, message: 'Friend removed' };
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

// Get friends list
export const getFriendsList = async (userId) => {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile || !userProfile.friends) return [];
    
    const friends = [];
    for (const friendId of userProfile.friends) {
      const friendProfile = await getUserProfile(friendId);
      if (friendProfile) {
        friends.push({
          id: friendId,
          ...friendProfile
        });
      }
    }
    
    return friends;
  } catch (error) {
    console.error('Error getting friends list:', error);
    throw error;
  }
};

// Get friend requests
export const getFriendRequests = async (userId) => {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile || !userProfile.friendRequests) return [];
    
    const requests = [];
    for (const requestId of userProfile.friendRequests) {
      const requesterProfile = await getUserProfile(requestId);
      if (requesterProfile) {
        requests.push({
          id: requestId,
          ...requesterProfile
        });
      }
    }
    
    return requests;
  } catch (error) {
    console.error('Error getting friend requests:', error);
    throw error;
  }
};

// Update song recognition count
export const updateSongCount = async (userId) => {
  try {
    const userProfile = await getUserProfile(userId);
    const newCount = (userProfile?.totalSongsRecognized || 0) + 1;
    
    await updateUserProfile(userId, {
      totalSongsRecognized: newCount
    });
    
    return newCount;
  } catch (error) {
    console.error('Error updating song count:', error);
    throw error;
  }
}; 