import React, { useState, useEffect } from 'react';
import userService from '../services/userService';
import userSongService from '../services/userSongService';
import './UserDashboard.css';

const UserDashboard = ({ userId }) => {
  const [userStats, setUserStats] = useState(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [sharedSongs, setSharedSongs] = useState([]);
  const [friendsActivity, setFriendsActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load all data in parallel
      const [
        stats,
        recent,
        favs,
        shared,
        activity
      ] = await Promise.all([
        userSongService.getUserSongStats(userId),
        userSongService.getRecentlyPlayed(userId, 5),
        userSongService.getUserFavorites(userId),
        userSongService.getSharedSongs(userId),
        userSongService.getFriendsRecentActivity(userId, 10)
      ]);

      setUserStats(stats);
      setRecentlyPlayed(recent);
      setFavorites(favs);
      setSharedSongs(shared);
      setFriendsActivity(activity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffInHours = Math.floor((now - d) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(d);
  };

  if (isLoading) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h2>Your Dashboard</h2>
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
          <button 
            className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="dashboard-overview">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🎵</div>
              <div className="stat-content">
                <h3>{userStats?.totalPlays || 0}</h3>
                <p>Total Plays</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❤️</div>
              <div className="stat-content">
                <h3>{userStats?.favoriteSongs || 0}</h3>
                <p>Favorites</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>{userStats?.uniqueSongs || 0}</h3>
                <p>Unique Songs</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <h3>{userStats?.averagePlaysPerSong || 0}</h3>
                <p>Avg Plays/Song</p>
              </div>
            </div>
          </div>

          {/* Recently Played */}
          <div className="dashboard-section">
            <h3>Recently Played</h3>
            {recentlyPlayed.length > 0 ? (
              <div className="song-list">
                {recentlyPlayed.map((song) => (
                  <div key={song.id} className="song-item">
                    <div className="song-info">
                      <h4>{song.songData?.title || 'Unknown Song'}</h4>
                      <p>{song.songData?.artist || 'Unknown Artist'}</p>
                      <span className="play-count">{song.playCount || 1} plays</span>
                    </div>
                    <div className="song-meta">
                      <span className="last-played">{formatTimeAgo(song.lastPlayedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No songs played yet. Start listening to see your activity!</p>
            )}
          </div>

          {/* Shared Songs */}
          {sharedSongs.length > 0 && (
            <div className="dashboard-section">
              <h3>Songs Shared with You</h3>
              <div className="song-list">
                {sharedSongs.slice(0, 3).map((share) => (
                  <div key={share.id} className="song-item shared">
                    <div className="song-info">
                      <h4>{share.songData?.title || 'Unknown Song'}</h4>
                      <p>{share.songData?.artist || 'Unknown Artist'}</p>
                      <span className="shared-by">Shared by @{share.fromUser?.username || 'Unknown'}</span>
                    </div>
                    <div className="song-meta">
                      <span className="shared-time">{formatTimeAgo(share.sharedAt)}</span>
                      {!share.isRead && <span className="unread-badge">New</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="dashboard-activity">
          {/* Favorites */}
          <div className="dashboard-section">
            <h3>Your Favorites</h3>
            {favorites.length > 0 ? (
              <div className="song-list">
                {favorites.map((song) => (
                  <div key={song.id} className="song-item favorite">
                    <div className="song-info">
                      <h4>{song.songData?.title || 'Unknown Song'}</h4>
                      <p>{song.songData?.artist || 'Unknown Artist'}</p>
                      <span className="added-date">Added {formatDate(song.addedAt)}</span>
                    </div>
                    <div className="song-meta">
                      <span className="play-count">{song.playCount || 1} plays</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No favorite songs yet. Like some songs to see them here!</p>
            )}
          </div>

          {/* Most Played */}
          <div className="dashboard-section">
            <h3>Most Played</h3>
            {recentlyPlayed.length > 0 ? (
              <div className="song-list">
                {recentlyPlayed
                  .sort((a, b) => (b.playCount || 1) - (a.playCount || 1))
                  .slice(0, 5)
                  .map((song) => (
                    <div key={song.id} className="song-item">
                      <div className="song-info">
                        <h4>{song.songData?.title || 'Unknown Song'}</h4>
                        <p>{song.songData?.artist || 'Unknown Artist'}</p>
                      </div>
                      <div className="song-meta">
                        <span className="play-count">{song.playCount || 1} plays</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="empty-state">No songs played yet. Start listening to see your most played!</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="dashboard-friends">
          {/* Friends Activity */}
          <div className="dashboard-section">
            <h3>Friends Activity</h3>
            {friendsActivity.length > 0 ? (
              <div className="activity-list">
                {friendsActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-info">
                      <h4>{activity.songData?.title || 'Unknown Song'}</h4>
                      <p>{activity.songData?.artist || 'Unknown Artist'}</p>
                      <span className="activity-time">{formatTimeAgo(activity.lastPlayedAt)}</span>
                    </div>
                    <div className="activity-meta">
                      <span className="play-count">{activity.playCount || 1} plays</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No friends activity yet. Add some friends to see what they're listening to!</p>
            )}
          </div>

          {/* Shared Songs */}
          {sharedSongs.length > 0 && (
            <div className="dashboard-section">
              <h3>Songs Shared with You</h3>
              <div className="song-list">
                {sharedSongs.map((share) => (
                  <div key={share.id} className="song-item shared">
                    <div className="song-info">
                      <h4>{share.songData?.title || 'Unknown Song'}</h4>
                      <p>{share.songData?.artist || 'Unknown Artist'}</p>
                      <span className="shared-by">Shared by @{share.fromUser?.username || 'Unknown'}</span>
                      {share.message && <p className="share-message">"{share.message}"</p>}
                    </div>
                    <div className="song-meta">
                      <span className="shared-time">{formatTimeAgo(share.sharedAt)}</span>
                      {!share.isRead && <span className="unread-badge">New</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboard; 