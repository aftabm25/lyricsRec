import { 
  doc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import firestore, { COLLECTIONS } from '../config/firestore';

class UserSongService {
  // Add song to user's favorites
  async addToFavorites(userId, songId, songData) {
    try {
      const userSongRef = doc(firestore, COLLECTIONS.USER_SONGS, `${userId}_${songId}`);
      
      const userSongData = {
        userId,
        songId,
        songData,
        isFavorite: true,
        addedAt: serverTimestamp(),
        lastPlayedAt: serverTimestamp(),
        playCount: 1
      };

      await setDoc(userSongRef, userSongData, { merge: true });
      return userSongData;
    } catch (error) {
      console.error('Error adding song to favorites:', error);
      throw error;
    }
  }

  // Remove song from user's favorites
  async removeFromFavorites(userId, songId) {
    try {
      const userSongRef = doc(firestore, COLLECTIONS.USER_SONGS, `${userId}_${songId}`);
      await updateDoc(userSongRef, {
        isFavorite: false,
        removedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing song from favorites:', error);
      throw error;
    }
  }

  // Get user's favorite songs
  async getUserFavorites(userId) {
    try {
      const userSongsRef = collection(firestore, COLLECTIONS.USER_SONGS);
      const q = query(
        userSongsRef,
        where('userId', '==', userId),
        where('isFavorite', '==', true),
        orderBy('addedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const favorites = [];
      querySnapshot.forEach(docSnap => {
        favorites.push({ id: docSnap.id, ...docSnap.data() });
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
      const userSongRef = doc(firestore, COLLECTIONS.USER_SONGS, `${userId}_${songId}`);
      
      const userSongData = {
        userId,
        songId,
        songData,
        lastPlayedAt: serverTimestamp(),
        playCount: increment(1)
      };

      await setDoc(userSongRef, userSongData, { merge: true });
      return userSongData;
    } catch (error) {
      console.error('Error recording song play:', error);
      throw error;
    }
  }

  // Get user's recently played songs
  async getRecentlyPlayed(userId, limitCount = 10) {
    try {
      const userSongsRef = collection(firestore, COLLECTIONS.USER_SONGS);
      const q = query(
        userSongsRef,
        where('userId', '==', userId),
        orderBy('lastPlayedAt', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);

      const recentlyPlayed = [];
      querySnapshot.forEach(docSnap => {
        recentlyPlayed.push({ id: docSnap.id, ...docSnap.data() });
      });

      return recentlyPlayed;
    } catch (error) {
      console.error('Error getting recently played songs:', error);
      throw error;
    }
  }

  // Get user's most played songs
  async getMostPlayed(userId, limitCount = 10) {
    try {
      const userSongsRef = collection(firestore, COLLECTIONS.USER_SONGS);
      const q = query(
        userSongsRef,
        where('userId', '==', userId),
        orderBy('playCount', 'desc'),
        limit(limitCount)
      );
      const querySnapshot = await getDocs(q);

      const mostPlayed = [];
      querySnapshot.forEach(docSnap => {
        mostPlayed.push({ id: docSnap.id, ...docSnap.data() });
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
      const shareRef = collection(firestore, 'song_shares');
      await addDoc(shareRef, {
        fromUserId,
        toUserId,
        songId,
        songData,
        message,
        sharedAt: serverTimestamp(),
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
      const sharesRef = collection(firestore, 'song_shares');
      const q = query(
        sharesRef,
        where('toUserId', '==', userId),
        orderBy('sharedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const sharedSongs = [];
      for (const docSnap of querySnapshot.docs) {
        const share = { id: docSnap.id, ...docSnap.data() };
        // Get the sender's info
        const fromUserRef = doc(firestore, COLLECTIONS.USERS, share.fromUserId);
        const fromUserSnap = await getDoc(fromUserRef);
        if (fromUserSnap.exists()) {
          share.fromUser = { id: fromUserSnap.id, ...fromUserSnap.data() };
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
      const shareRef = doc(firestore, 'song_shares', shareId);
      await updateDoc(shareRef, {
        isRead: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking shared song as read:', error);
      throw error;
    }
  }

  // Get user's song statistics
  async getUserSongStats(userId) {
    try {
      const userSongsRef = collection(firestore, COLLECTIONS.USER_SONGS);
      const q = query(userSongsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      let totalPlays = 0;
      let uniqueSongs = 0;
      let favoriteSongs = 0;

      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
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
  async getFriendsRecentActivity(userId, limitCount = 20) {
    try {
      // First get user's friends
      const friendshipsRef = collection(firestore, COLLECTIONS.FRIENDSHIPS);
      const q = query(friendshipsRef, where('status', '==', 'accepted'));
      const querySnapshot = await getDocs(q);

      const friendIds = [];
      querySnapshot.forEach(docSnap => {
        const friendship = docSnap.data();
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
      const userSongsRef = collection(firestore, COLLECTIONS.USER_SONGS);
      const recentActivity = [];

      for (const friendId of friendIds) {
        const friendSongsQuery = query(
          userSongsRef,
          where('userId', '==', friendId),
          orderBy('lastPlayedAt', 'desc'),
          limit(5)
        );
        const friendSongsSnapshot = await getDocs(friendSongsQuery);

        friendSongsSnapshot.forEach(docSnap => {
          recentActivity.push({ id: docSnap.id, ...docSnap.data() });
        });
      }

      // Sort by last played and limit results
      recentActivity.sort((a, b) => {
        const aTime = a.lastPlayedAt?.toDate?.() || new Date(0);
        const bTime = b.lastPlayedAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      return recentActivity.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting friends recent activity:', error);
      throw error;
    }
  }
}

export default new UserSongService(); 