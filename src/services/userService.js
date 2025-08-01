import firestore, { COLLECTIONS } from '../config/firestore';

class UserService {
  // Create or update user profile
  async createOrUpdateUser(spotifyUser, username = null) {
    try {
      const userRef = firestore.collection(COLLECTIONS.USERS).doc(spotifyUser.id);
      
      const userData = {
        spotifyId: spotifyUser.id,
        displayName: spotifyUser.display_name,
        email: spotifyUser.email,
        profileImage: spotifyUser.images?.[0]?.url || null,
        username: username || this.generateUsername(spotifyUser.display_name),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true
      };

      await userRef.set(userData, { merge: true });
      return userData;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // Get user by Spotify ID
  async getUserBySpotifyId(spotifyId) {
    try {
      const userRef = firestore.collection(COLLECTIONS.USERS).doc(spotifyId);
      const doc = await userRef.get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by Spotify ID:', error);
      throw error;
    }
  }

  // Get user by username
  async getUserByUsername(username) {
    try {
      const usersRef = firestore.collection(COLLECTIONS.USERS);
      const query = usersRef.where('username', '==', username);
      const snapshot = await query.get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
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
      const userRef = firestore.collection(COLLECTIONS.USERS).doc(spotifyId);
      await userRef.update({
        ...updates,
        updatedAt: new Date()
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

      const friendshipRef = firestore.collection(COLLECTIONS.FRIENDSHIPS);
      const existingRequest = await friendshipRef
        .where('fromUserId', '==', fromUserId)
        .where('toUserId', '==', toUser.id)
        .get();

      if (!existingRequest.empty) {
        throw new Error('Friend request already sent');
      }

      await friendshipRef.add({
        fromUserId,
        toUserId: toUser.id,
        status: 'pending',
        createdAt: new Date()
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
      const friendshipRef = firestore.collection(COLLECTIONS.FRIENDSHIPS).doc(friendshipId);
      await friendshipRef.update({
        status: 'accepted',
        acceptedAt: new Date()
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }

  // Reject friend request
  async rejectFriendRequest(friendshipId) {
    try {
      const friendshipRef = firestore.collection(COLLECTIONS.FRIENDSHIPS).doc(friendshipId);
      await friendshipRef.update({
        status: 'rejected',
        rejectedAt: new Date()
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      throw error;
    }
  }

  // Get friend requests for a user
  async getFriendRequests(userId) {
    try {
      const requestsRef = firestore.collection(COLLECTIONS.FRIENDSHIPS);
      const snapshot = await requestsRef
        .where('toUserId', '==', userId)
        .where('status', '==', 'pending')
        .get();

      const requests = [];
      for (const doc of snapshot.docs) {
        const request = { id: doc.id, ...doc.data() };
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
      const friendshipsRef = firestore.collection(COLLECTIONS.FRIENDSHIPS);
      const snapshot = await friendshipsRef
        .where('status', '==', 'accepted')
        .get();

      const friends = [];
      for (const doc of snapshot.docs) {
        const friendship = doc.data();
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

  // Search users by username
  async searchUsers(query, currentUserId) {
    try {
      const usersRef = firestore.collection(COLLECTIONS.USERS);
      const snapshot = await usersRef
        .where('username', '>=', query)
        .where('username', '<=', query + '\uf8ff')
        .limit(10)
        .get();

      const users = [];
      for (const doc of snapshot.docs) {
        const user = { id: doc.id, ...doc.data() };
        if (user.id !== currentUserId) {
          users.push(user);
        }
      }

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}

export default new UserService(); 