import React, { useState, useEffect } from 'react';
import { 
  createUserProfile, 
  getUserProfile, 
  updateUserProfile,
  searchUsersByUsername,
  sendFriendRequest,
  getFriendsList,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  updateSongCount
} from '../services/userService';
import './UserProfile.css';

const UserProfile = ({ spotifyUserId, spotifyProfile, onProfileUpdate }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (spotifyUserId) {
      loadUserProfile();
    }
  }, [spotifyUserId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      let profile = await getUserProfile(spotifyUserId);
      
      if (!profile) {
        // Create new profile if doesn't exist
        profile = await createUserProfile(spotifyUserId, spotifyProfile);
      }
      
      setUserProfile(profile);
      setEditForm({
        displayName: profile.displayName,
        username: profile.username
      });
      
      // Load friends and requests
      await loadFriends();
      await loadFriendRequests();
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const friendsList = await getFriendsList(spotifyUserId);
      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const requests = await getFriendRequests(spotifyUserId);
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile(spotifyUserId, editForm);
      await loadUserProfile();
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      if (onProfileUpdate) onProfileUpdate();
    } catch (error) {
      setError('Failed to update profile');
    }
  };

  const handleSearchUsers = async () => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchUsersByUsername(searchUsername);
      // Filter out current user
      const filteredResults = results.filter(user => user.spotifyUserId !== spotifyUserId);
      setSearchResults(filteredResults);
    } catch (error) {
      setError('Failed to search users');
    }
  };

  const handleSendFriendRequest = async (toUsername) => {
    try {
      await sendFriendRequest(spotifyUserId, toUsername);
      setSuccess('Friend request sent!');
      setSearchUsername('');
      setSearchResults([]);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAcceptRequest = async (friendUserId) => {
    try {
      await acceptFriendRequest(spotifyUserId, friendUserId);
      await loadFriends();
      await loadFriendRequests();
      setSuccess('Friend request accepted!');
    } catch (error) {
      setError('Failed to accept request');
    }
  };

  const handleRejectRequest = async (friendUserId) => {
    try {
      await rejectFriendRequest(spotifyUserId, friendUserId);
      await loadFriendRequests();
      setSuccess('Friend request rejected');
    } catch (error) {
      setError('Failed to reject request');
    }
  };

  const handleRemoveFriend = async (friendUserId) => {
    try {
      await removeFriend(spotifyUserId, friendUserId);
      await loadFriends();
      setSuccess('Friend removed');
    } catch (error) {
      setError('Failed to remove friend');
    }
  };

  if (isLoading) {
    return (
      <div className="user-profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="user-profile-error">
        <p>Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>👤 User Profile</h2>
        <div className="profile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Requests ({friendRequests.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Find Friends
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          <p>{success}</p>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="profile-content">
          <div className="profile-info">
            <div className="profile-image">
              {userProfile.profileImage ? (
                <img src={userProfile.profileImage} alt="Profile" />
              ) : (
                <div className="profile-placeholder">👤</div>
              )}
            </div>
            
            {isEditing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Display Name:</label>
                  <input
                    type="text"
                    value={editForm.displayName}
                    onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Username:</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  />
                </div>
                <div className="form-actions">
                  <button onClick={handleSaveProfile} className="save-btn">Save</button>
                  <button onClick={() => setIsEditing(false)} className="cancel-btn">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="profile-details">
                <h3>{userProfile.displayName}</h3>
                <p className="username">@{userProfile.username}</p>
                <p className="email">{userProfile.email}</p>
                <p className="stats">
                  🎵 Songs Recognized: {userProfile.totalSongsRecognized}
                </p>
                <p className="member-since">
                  Member since: {new Date(userProfile.createdAt).toLocaleDateString()}
                </p>
                <button onClick={() => setIsEditing(true)} className="edit-btn">
                  ✏️ Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="friends-content">
          {friends.length === 0 ? (
            <div className="empty-state">
              <p>No friends yet. Start by finding friends!</p>
            </div>
          ) : (
            <div className="friends-list">
              {friends.map((friend) => (
                <div key={friend.id} className="friend-item">
                  <div className="friend-info">
                    <div className="friend-image">
                      {friend.profileImage ? (
                        <img src={friend.profileImage} alt={friend.displayName} />
                      ) : (
                        <div className="friend-placeholder">👤</div>
                      )}
                    </div>
                    <div className="friend-details">
                      <h4>{friend.displayName}</h4>
                      <p>@{friend.username}</p>
                      <p>🎵 {friend.totalSongsRecognized} songs</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveFriend(friend.spotifyUserId)}
                    className="remove-friend-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="requests-content">
          {friendRequests.length === 0 ? (
            <div className="empty-state">
              <p>No pending friend requests</p>
            </div>
          ) : (
            <div className="requests-list">
              {friendRequests.map((request) => (
                <div key={request.id} className="request-item">
                  <div className="request-info">
                    <div className="request-image">
                      {request.profileImage ? (
                        <img src={request.profileImage} alt={request.displayName} />
                      ) : (
                        <div className="request-placeholder">👤</div>
                      )}
                    </div>
                    <div className="request-details">
                      <h4>{request.displayName}</h4>
                      <p>@{request.username}</p>
                      <p>🎵 {request.totalSongsRecognized} songs</p>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      onClick={() => handleAcceptRequest(request.spotifyUserId)}
                      className="accept-btn"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleRejectRequest(request.spotifyUserId)}
                      className="reject-btn"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="search-content">
          <div className="search-form">
            <input
              type="text"
              placeholder="Search by username..."
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
            />
            <button onClick={handleSearchUsers} className="search-btn">
              🔍 Search
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Search Results</h3>
              {searchResults.map((user) => (
                <div key={user.id} className="search-result-item">
                  <div className="result-info">
                    <div className="result-image">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.displayName} />
                      ) : (
                        <div className="result-placeholder">👤</div>
                      )}
                    </div>
                    <div className="result-details">
                      <h4>{user.displayName}</h4>
                      <p>@{user.username}</p>
                      <p>🎵 {user.totalSongsRecognized} songs</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSendFriendRequest(user.username)}
                    className="add-friend-btn"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile; 