// Song Storage Service - Separate from user management
// This service handles all song-related data storage and retrieval

// Song History Management
export const saveSongToHistory = async (userId, songData) => {
  try {
    const historyKey = `song_history_${userId}`;
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Create song history entry
    const historyEntry = {
      id: `${songData.spotify_id}_${Date.now()}`,
      ...songData,
      addedAt: new Date().toISOString(),
      userId: userId
    };
    
    // Add to beginning of history (most recent first)
    const updatedHistory = [historyEntry, ...existingHistory];
    
    // Keep only last 100 songs to prevent localStorage from getting too large
    const trimmedHistory = updatedHistory.slice(0, 100);
    
    localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
    
    return { success: true, songId: historyEntry.id };
  } catch (error) {
    console.error('Error saving song to history:', error);
    return { success: false, error: error.message };
  }
};

export const getUserSongHistory = async (userId, limit = 50) => {
  try {
    const historyKey = `song_history_${userId}`;
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Return limited results
    const limitedHistory = history.slice(0, limit);
    
    return { success: true, history: limitedHistory };
  } catch (error) {
    console.error('Error getting user song history:', error);
    return { success: false, error: error.message };
  }
};

export const clearUserSongHistory = async (userId) => {
  try {
    const historyKey = `song_history_${userId}`;
    localStorage.removeItem(historyKey);
    return { success: true };
  } catch (error) {
    console.error('Error clearing user song history:', error);
    return { success: false, error: error.message };
  }
};

export const removeSongFromHistory = async (userId, songId) => {
  try {
    const historyKey = `song_history_${userId}`;
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    const updatedHistory = existingHistory.filter(song => song.id !== songId);
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    
    return { success: true };
  } catch (error) {
    console.error('Error removing song from history:', error);
    return { success: false, error: error.message };
  }
};

// Song Favorites Management
export const addSongToFavorites = async (userId, songData) => {
  try {
    const favoritesKey = `song_favorites_${userId}`;
    const existingFavorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    
    // Check if song is already in favorites
    const isAlreadyFavorite = existingFavorites.some(fav => fav.spotify_id === songData.spotify_id);
    
    if (isAlreadyFavorite) {
      return { success: false, error: 'Song is already in favorites' };
    }
    
    const favoriteEntry = {
      id: `${songData.spotify_id}_${Date.now()}`,
      ...songData,
      addedAt: new Date().toISOString(),
      userId: userId
    };
    
    const updatedFavorites = [favoriteEntry, ...existingFavorites];
    localStorage.setItem(favoritesKey, JSON.stringify(updatedFavorites));
    
    return { success: true, songId: favoriteEntry.id };
  } catch (error) {
    console.error('Error adding song to favorites:', error);
    return { success: false, error: error.message };
  }
};

export const removeSongFromFavorites = async (userId, songId) => {
  try {
    const favoritesKey = `song_favorites_${userId}`;
    const existingFavorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    
    const updatedFavorites = existingFavorites.filter(song => song.id !== songId);
    localStorage.setItem(favoritesKey, JSON.stringify(updatedFavorites));
    
    return { success: true };
  } catch (error) {
    console.error('Error removing song from favorites:', error);
    return { success: false, error: error.message };
  }
};

export const getUserFavorites = async (userId) => {
  try {
    const favoritesKey = `song_favorites_${userId}`;
    const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    
    return { success: true, favorites };
  } catch (error) {
    console.error('Error getting user favorites:', error);
    return { success: false, error: error.message };
  }
};

export const isSongInFavorites = async (userId, spotifyId) => {
  try {
    const favoritesKey = `song_favorites_${userId}`;
    const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    
    const isFavorite = favorites.some(song => song.spotify_id === spotifyId);
    return { success: true, isFavorite };
  } catch (error) {
    console.error('Error checking if song is in favorites:', error);
    return { success: false, error: error.message };
  }
};

// Song Playlists Management
export const createPlaylist = async (userId, playlistData) => {
  try {
    const playlistsKey = `song_playlists_${userId}`;
    const existingPlaylists = JSON.parse(localStorage.getItem(playlistsKey) || '[]');
    
    const playlist = {
      id: `playlist_${Date.now()}`,
      ...playlistData,
      songs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: userId
    };
    
    const updatedPlaylists = [playlist, ...existingPlaylists];
    localStorage.setItem(playlistsKey, JSON.stringify(updatedPlaylists));
    
    return { success: true, playlistId: playlist.id };
  } catch (error) {
    console.error('Error creating playlist:', error);
    return { success: false, error: error.message };
  }
};

export const addSongToPlaylist = async (userId, playlistId, songData) => {
  try {
    const playlistsKey = `song_playlists_${userId}`;
    const existingPlaylists = JSON.parse(localStorage.getItem(playlistsKey) || '[]');
    
    const playlistIndex = existingPlaylists.findIndex(playlist => playlist.id === playlistId);
    
    if (playlistIndex === -1) {
      return { success: false, error: 'Playlist not found' };
    }
    
    const playlist = existingPlaylists[playlistIndex];
    
    // Check if song is already in playlist
    const isAlreadyInPlaylist = playlist.songs.some(song => song.spotify_id === songData.spotify_id);
    
    if (isAlreadyInPlaylist) {
      return { success: false, error: 'Song is already in playlist' };
    }
    
    const songEntry = {
      id: `${songData.spotify_id}_${Date.now()}`,
      ...songData,
      addedAt: new Date().toISOString()
    };
    
    playlist.songs.push(songEntry);
    playlist.updatedAt = new Date().toISOString();
    
    localStorage.setItem(playlistsKey, JSON.stringify(existingPlaylists));
    
    return { success: true, songId: songEntry.id };
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    return { success: false, error: error.message };
  }
};

export const getUserPlaylists = async (userId) => {
  try {
    const playlistsKey = `song_playlists_${userId}`;
    const playlists = JSON.parse(localStorage.getItem(playlistsKey) || '[]');
    
    return { success: true, playlists };
  } catch (error) {
    console.error('Error getting user playlists:', error);
    return { success: false, error: error.message };
  }
};

// Song Analytics and Statistics
export const saveSongPlayEvent = async (userId, songData) => {
  try {
    const analyticsKey = `song_analytics_${userId}`;
    const existingAnalytics = JSON.parse(localStorage.getItem(analyticsKey) || '{}');
    
    const songId = songData.spotify_id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!existingAnalytics[songId]) {
      existingAnalytics[songId] = {
        totalPlays: 0,
        firstPlayed: new Date().toISOString(),
        lastPlayed: new Date().toISOString(),
        playDates: {}
      };
    }
    
    existingAnalytics[songId].totalPlays += 1;
    existingAnalytics[songId].lastPlayed = new Date().toISOString();
    
    if (!existingAnalytics[songId].playDates[today]) {
      existingAnalytics[songId].playDates[today] = 0;
    }
    existingAnalytics[songId].playDates[today] += 1;
    
    localStorage.setItem(analyticsKey, JSON.stringify(existingAnalytics));
    
    return { success: true };
  } catch (error) {
    console.error('Error saving song play event:', error);
    return { success: false, error: error.message };
  }
};

export const getUserSongAnalytics = async (userId) => {
  try {
    const analyticsKey = `song_analytics_${userId}`;
    const analytics = JSON.parse(localStorage.getItem(analyticsKey) || '{}');
    
    return { success: true, analytics };
  } catch (error) {
    console.error('Error getting user song analytics:', error);
    return { success: false, error: error.message };
  }
};

// Export/Import functionality for data portability
export const exportUserSongData = async (userId) => {
  try {
    const historyKey = `song_history_${userId}`;
    const favoritesKey = `song_favorites_${userId}`;
    const playlistsKey = `song_playlists_${userId}`;
    const analyticsKey = `song_analytics_${userId}`;
    
    const exportData = {
      userId: userId,
      exportDate: new Date().toISOString(),
      songHistory: JSON.parse(localStorage.getItem(historyKey) || '[]'),
      favorites: JSON.parse(localStorage.getItem(favoritesKey) || '[]'),
      playlists: JSON.parse(localStorage.getItem(playlistsKey) || '[]'),
      analytics: JSON.parse(localStorage.getItem(analyticsKey) || '{}')
    };
    
    return { success: true, data: exportData };
  } catch (error) {
    console.error('Error exporting user song data:', error);
    return { success: false, error: error.message };
  }
};

export const importUserSongData = async (userId, importData) => {
  try {
    const historyKey = `song_history_${userId}`;
    const favoritesKey = `song_favorites_${userId}`;
    const playlistsKey = `song_playlists_${userId}`;
    const analyticsKey = `song_analytics_${userId}`;
    
    if (importData.songHistory) {
      localStorage.setItem(historyKey, JSON.stringify(importData.songHistory));
    }
    
    if (importData.favorites) {
      localStorage.setItem(favoritesKey, JSON.stringify(importData.favorites));
    }
    
    if (importData.playlists) {
      localStorage.setItem(playlistsKey, JSON.stringify(importData.playlists));
    }
    
    if (importData.analytics) {
      localStorage.setItem(analyticsKey, JSON.stringify(importData.analytics));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error importing user song data:', error);
    return { success: false, error: error.message };
  }
}; 