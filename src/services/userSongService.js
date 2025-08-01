import firestore, { COLLECTIONS } from '../config/firestore';

class UserSongService {
  // Add song to user's favorites
  async addToFavorites(userId, songId, songData) {
    try {
      const userSongRef = firestore.collection(COLLECTIONS.USER_SONGS).doc(`${userId}_${songId}`);
      
      const userSongData = {
        userId,
        songId,
        songData,
        isFavorite: true,
        addedAt: new Date(),
        lastPlayedAt: new Date(),
        playCount: 1
      };

      await userSongRef.set(userSongData, { merge: true });
      return userSongData;
    } catch (error) {
      console.error('Error adding song to favorites:', error);
      throw error;
    }
  }

  // Remove song from user's favorites
  async removeFromFavorites(userId, songId) {
    try {
      const userSongRef = firestore.collection(COLLECTIONS.USER_SONGS).doc(`${userId}_${songId}`);
      await userSongRef.update({
        isFavorite: false,
        removedAt: new Date()
      });
    } catch (error) {
      console.error('Error removing song from favorites:', error);
      throw error;
    }
  }

  // Get user's favorite songs
  async getUserFavorites(userId) {
    try {
      const userSongsRef = firestore.collection(COLLECTIONS.USER_SONGS);
      const snapshot = await userSongsRef
        .where('userId', '==', userId)
        .where('isFavorite', '==', true)
        .orderBy('addedAt', 'desc')
        .get();

      const favorites = [];
      snapshot.docs.forEach(doc => {
        favorites.push({ id: doc.id, ...doc.data() });
      });

      return favorites;
    } catch (error) {
      console.error('Error getting user favorites:', error);
      throw error;
    }
  }

  // Record song play
  async recordSongPlay(userId, songId, songData) {
    try {
      const userSongRef = firestore.collection(COLLECTIONS.USER_SONGS).doc(`${userId}_${songId}`);
      
      const userSongData = {
        userId,
        songId,
        songData,
        lastPlayedAt: new Date(),
        playCount: firestore.FieldValue.increment(1)
      };

      await userSongRef.set(userSongData, { merge: true });
      return userSongData;
    } catch (error) {
      console.error('Error recording song play:', error);
      throw error;
    }
  }

  // Get user's recently played songs
  async getRecentlyPlayed(userId, limit = 10) {
    try {
      const userSongsRef = firestore.collection(COLLECTIONS.USER_SONGS);
      const snapshot = await userSongsRef
        .where('userId', '==', userId)
        .orderBy('lastPlayedAt', 'desc')
        .limit(limit)
        .get();

      const recentlyPlayed = [];
      snapshot.docs.forEach(doc => {
        recentlyPlayed.push({ id: doc.id, ...doc.data() });
      });

      return recentlyPlayed;
    } catch (error) {
      console.error('Error getting recently played songs:', error);
      throw error;
    }
  }

  // Get user's most played songs
  async getMostPlayed(userId, limit = 10) {
    try {
      const userSongsRef = firestore.collection(COLLECTIONS.USER_SONGS);
      const snapshot = await userSongsRef
        .where('userId', '==', userId)
        .orderBy('playCount', 'desc')
        .limit(limit)
        .get();

      const mostPlayed = [];
      snapshot.docs.forEach(doc => {
        mostPlayed.push({ id: doc.id, ...doc.data() });
      });

      return mostPlayed;
    } catch (error) {
      console.error('Error getting most played songs:', error);
      throw error;
    }
  }

  // Share song with friend
  async shareSongWithFriend(fromUserId, toUserId, songId, songData, message = '') {
    try {
      const shareRef = firestore.collection('song_shares');
      await shareRef.add({
        fromUserId,
        toUserId,
        songId,
        songData,
        message,
        sharedAt: new Date(),
        isRead: false
      });
    } catch (error) {
      console.error('Error sharing song with friend:', error);
      throw error;
    }
  }

  // Get songs shared with user
  async getSharedSongs(userId) {
    try {
      const sharesRef = firestore.collection('song_shares');
      const snapshot = await sharesRef
        .where('toUserId', '==', userId)
        .orderBy('sharedAt', 'desc')
        .get();

      const sharedSongs = [];
      for (const doc of snapshot.docs) {
        const share = { id: doc.id, ...doc.data() };
        // Get the sender's info
        const fromUser = await firestore.collection(COLLECTIONS.USERS).doc(share.fromUserId).get();
        if (fromUser.exists) {
          share.fromUser = { id: fromUser.id, ...fromUser.data() };
        }
        sharedSongs.push(share);
      }

      return sharedSongs;
    } catch (error) {
      console.error('Error getting shared songs:', error);
      throw error;
    }
  }

  // Mark shared song as read
  async markSharedSongAsRead(shareId) {
    try {
      const shareRef = firestore.collection('song_shares').doc(shareId);
      await shareRef.update({
        isRead: true,
        readAt: new Date()
      });
    } catch (error) {
      console.error('Error marking shared song as read:', error);
      throw error;
    }
  }

  // Get user's song statistics
  async getUserSongStats(userId) {
    try {
      const userSongsRef = firestore.collection(COLLECTIONS.USER_SONGS);
      const snapshot = await userSongsRef
        .where('userId', '==', userId)
        .get();

      let totalPlays = 0;
      let uniqueSongs = 0;
      let favoriteSongs = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalPlays += data.playCount || 0;
        uniqueSongs++;
        if (data.isFavorite) {
          favoriteSongs++;
        }
      });

      return {
        totalPlays,
        uniqueSongs,
        favoriteSongs,
        averagePlaysPerSong: uniqueSongs > 0 ? Math.round(totalPlays / uniqueSongs) : 0
      };
    } catch (error) {
      console.error('Error getting user song stats:', error);
      throw error;
    }
  }

  // Get friends' recent activity
  async getFriendsRecentActivity(userId, limit = 20) {
    try {
      // First get user's friends
      const friendshipsRef = firestore.collection(COLLECTIONS.FRIENDSHIPS);
      const friendshipsSnapshot = await friendshipsRef
        .where('status', '==', 'accepted')
        .get();

      const friendIds = [];
      friendshipsSnapshot.docs.forEach(doc => {
        const friendship = doc.data();
        if (friendship.fromUserId === userId) {
          friendIds.push(friendship.toUserId);
        } else if (friendship.toUserId === userId) {
          friendIds.push(friendship.fromUserId);
        }
      });

      if (friendIds.length === 0) {
        return [];
      }

      // Get recent song plays from friends
      const userSongsRef = firestore.collection(COLLECTIONS.USER_SONGS);
      const recentActivity = [];

      for (const friendId of friendIds) {
        const friendSongsSnapshot = await userSongsRef
          .where('userId', '==', friendId)
          .orderBy('lastPlayedAt', 'desc')
          .limit(5)
          .get();

        friendSongsSnapshot.docs.forEach(doc => {
          recentActivity.push({ id: doc.id, ...doc.data() });
        });
      }

      // Sort by last played and limit results
      recentActivity.sort((a, b) => b.lastPlayedAt.toDate() - a.lastPlayedAt.toDate());
      return recentActivity.slice(0, limit);
    } catch (error) {
      console.error('Error getting friends recent activity:', error);
      throw error;
    }
  }
}

export default new UserSongService(); 