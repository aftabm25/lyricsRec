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
  serverTimestamp 
} from 'firebase/firestore';
import firestore, { COLLECTIONS } from '../config/firestore';

class UserService {
  // Create user document in Firestore
  async createUserDocument(firebaseUid, userData) {
    try {
      const userRef = doc(firestore, COLLECTIONS.USERS, firebaseUid);
      await setDoc(userRef, userData);
      console.log('User document created in Firestore');
      return { id: firebaseUid, ...userData };
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  }

  // Update last login time
  async updateLastLogin(firebaseUid) {
    try {
      const userRef = doc(firestore, COLLECTIONS.USERS, firebaseUid);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Create or update user profile
  async createOrUpdateUser(spotifyUser, username = null) {
    try {
      console.log('Creating/updating user:', spotifyUser.id, spotifyUser.display_name);
      const userRef = doc(firestore, COLLECTIONS.USERS, spotifyUser.id);
      
      const userData = {
        spotifyId: spotifyUser.id,
        displayName: spotifyUser.display_name,
        email: spotifyUser.email,
        profileImage: spotifyUser.images?.[0]?.url || null,
        username: username || this.generateUsername(spotifyUser.display_name),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true
      };

      console.log('User data to save:', userData);
      await setDoc(userRef, userData, { merge: true });
      console.log('User saved successfully to Firestore');
      return { id: spotifyUser.id, ...userData };
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // Get user by Spotify ID
  async getUserBySpotifyId(spotifyId) {
    try {
      console.log('Looking up user by Spotify ID:', spotifyId);
      const userRef = doc(firestore, COLLECTIONS.USERS, spotifyId);
      const docSnap = await getDoc(userRef);
      
      console.log('Document exists:', docSnap.exists());
      if (docSnap.exists()) {
        const userData = { id: docSnap.id, ...docSnap.data() };
        console.log('Found user data:', userData);
        return userData;
      } else {
        console.log('No user found with Spotify ID:', spotifyId);
        return null;
      }
    } catch (error) {
      console.error('Error getting user by Spotify ID:', error);
      throw error;
    }
  }

  // Get user by username
  async getUserByUsername(username) {
    try {
      const usersRef = collection(firestore, COLLECTIONS.USERS);
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(spotifyId, updates) {
    try {
      const userRef = doc(firestore, COLLECTIONS.USERS, spotifyId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Check if username is available
  async isUsernameAvailable(username) {
    try {
      const user = await this.getUserByUsername(username);
      return user === null;
    } catch (error) {
      console.error('Error checking username availability:', error);
      throw error;
    }
  }

  // Generate a unique username
  generateUsername(displayName) {
    const baseUsername = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    
    const timestamp = Date.now().toString().slice(-4);
    return `${baseUsername}${timestamp}`;
  }

  // Friend management
  async sendFriendRequest(fromUserId, toUsername) {
    try {
      const toUser = await this.getUserByUsername(toUsername);
      if (!toUser) {
        throw new Error('User not found');
      }

      if (fromUserId === toUser.id) {
        throw new Error('Cannot send friend request to yourself');
      }

      const friendshipsRef = collection(firestore, COLLECTIONS.FRIENDSHIPS);
      const q = query(
        friendshipsRef, 
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUser.id)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error('Friend request already sent');
      }

      await addDoc(friendshipsRef, {
        fromUserId,
        toUserId: toUser.id,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      return { success: true, message: 'Friend request sent successfully' };
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  // Accept friend request
  async acceptFriendRequest(friendshipId) {
    try {
      const friendshipRef = doc(firestore, COLLECTIONS.FRIENDSHIPS, friendshipId);
      await updateDoc(friendshipRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }

  // Reject friend request
  async rejectFriendRequest(friendshipId) {
    try {
      const friendshipRef = doc(firestore, COLLECTIONS.FRIENDSHIPS, friendshipId);
      await updateDoc(friendshipRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  }

  // Get friend requests for a user
  async getFriendRequests(userId) {
    try {
      const requestsRef = collection(firestore, COLLECTIONS.FRIENDSHIPS);
      const q = query(
        requestsRef,
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);

      const requests = [];
      for (const docSnap of querySnapshot.docs) {
        const request = { id: docSnap.id, ...docSnap.data() };
        const fromUser = await this.getUserBySpotifyId(request.fromUserId);
        requests.push({
          ...request,
          fromUser
        });
      }

      return requests;
    } catch (error) {
      console.error('Error getting friend requests:', error);
      throw error;
    }
  }

  // Get user's friends
  async getUserFriends(userId) {
    try {
      const friendshipsRef = collection(firestore, COLLECTIONS.FRIENDSHIPS);
      const q = query(friendshipsRef, where('status', '==', 'accepted'));
      const querySnapshot = await getDocs(q);

      const friends = [];
      for (const docSnap of querySnapshot.docs) {
        const friendship = docSnap.data();
        if (friendship.fromUserId === userId || friendship.toUserId === userId) {
          const friendId = friendship.fromUserId === userId ? friendship.toUserId : friendship.fromUserId;
          const friend = await this.getUserBySpotifyId(friendId);
          if (friend) {
            friends.push(friend);
          }
        }
      }

      return friends;
    } catch (error) {
      console.error('Error getting user friends:', error);
      throw error;
    }
  }

  // Search users by username or user ID
  async searchUsers(query, currentUserId) {
    try {
      console.log('Searching users with query:', query, 'currentUserId:', currentUserId);
      const usersRef = collection(firestore, COLLECTIONS.USERS);
      
      // First try to find by exact user ID
      if (query.length >= 10) { // User IDs are typically longer
        try {
          console.log('Trying to find user by ID:', query);
          const userById = await this.getUserBySpotifyId(query);
          if (userById && userById.id !== currentUserId) {
            console.log('Found user by ID:', userById);
            return [userById];
          }
        } catch (error) {
          console.log('Error finding user by ID, continuing with username search:', error);
          // Continue with username search if ID search fails
        }
      }
      
      // Search by username (partial match)
      console.log('Searching by username:', query);
      const q = query(
        usersRef,
        where('username', '>=', query),
        where('username', '<=', query + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);

      const users = [];
      for (const docSnap of querySnapshot.docs) {
        const user = { id: docSnap.id, ...docSnap.data() };
        if (user.id !== currentUserId) {
          users.push(user);
        }
      }

      console.log('Found users by username:', users);
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}

export default new UserService(); 