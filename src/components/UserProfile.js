import React, { useState, useEffect } from 'react';
import { createUserProfile, getUserProfile, updateUserProfile, addFriend, removeFriend, getFriendsList } from '../config/firestore';
import './UserProfile.css';

const UserProfile = ({ spotifyUser, onProfileUpdate }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    isPublic: true
  });
  const [friends, setFriends] = useState([]);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // Load user profile on component mount
  useEffect(() => {
    if (spotifyUser && spotifyUser.id) {
      loadUserProfile();
      loadFriendsList();
    }
  }, [spotifyUser]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getUserProfile(spotifyUser.id);
      
      if (result.success) {
        setUserProfile(result.user);
        setFormData({
          username: result.user.username || '',
          displayName: result.user.displayName || spotifyUser.display_name || '',
          bio: result.user.bio || '',
          isPublic: result.user.isPublic !== false
        });
      } else {
        // User doesn't exist, show registration form
        setUserProfile(null);
        setFormData({
          username: '',
          displayName: spotifyUser.display_name || '',
          bio: '',
          isPublic: true
        });
      }
    } catch (error) {
      setError('Failed to load user profile');
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendsList = async () => {
    try {
      const result = await getFriendsList(spotifyUser.id);
      if (result.success) {
        setFriends(result.friends);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userData = {
        spotifyId: spotifyUser.id,
        spotifyEmail: spotifyUser.email,
        spotifyDisplayName: spotifyUser.display_name,
        spotifyImageUrl: spotifyUser.images?.[0]?.url,
        ...formData
      };

      let result;
      if (userProfile) {
        // Update existing profile
        result = await updateUserProfile(spotifyUser.id, userData);
      } else {
        // Create new profile
        result = await createUserProfile(spotifyUser.id, userData);
      }

      if (result.success) {
        setUserProfile(userData);
        setIsEditing(false);
        if (onProfileUpdate) {
          onProfileUpdate(userData);
        }
      } else {
        setError(result.error || 'Failed to save profile');
      }
    } catch (error) {
      setError('Failed to save profile');
      console.error('Error saving profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!newFriendUsername.trim()) return;

    setIsAddingFriend(true);
    setError(null);

    try {
      const result = await addFriend(spotifyUser.id, newFriendUsername.trim());
      
      if (result.success) {
        setNewFriendUsername('');
        await loadFriendsList(); // Reload friends list
      } else {
        setError(result.error || 'Failed to add friend');
      }
    } catch (error) {
      setError('Failed to add friend');
      console.error('Error adding friend:', error);
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      const result = await removeFriend(spotifyUser.id, friendId);
      
      if (result.success) {
        await loadFriendsList(); // Reload friends list
      } else {
        setError(result.error || 'Failed to remove friend');
      }
    } catch (error) {
      setError('Failed to remove friend');
      console.error('Error removing friend:', error);
    }
  };

  if (isLoading && !userProfile) {
    return (
      <div className="user-profile">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h3>👤 User Profile</h3>
        {userProfile && !isEditing && (
          <button 
            className="edit-profile-btn"
            onClick={() => setIsEditing(true)}
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="profile-error">
          <p>⚠️ {error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {!userProfile || isEditing ? (
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Choose a unique username"
              required
              disabled={userProfile && userProfile.username} // Can't change username once set
            />
            {userProfile && userProfile.username && (
              <small>Username cannot be changed once set</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              placeholder="Your display name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              rows="3"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleInputChange}
              />
              Make profile public (friends can see your song history)
            </label>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="save-profile-btn"
              disabled={isLoading}
            >
              {isLoading ? '💾 Saving...' : userProfile ? '💾 Update Profile' : '💾 Create Profile'}
            </button>
            
            {isEditing && (
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    username: userProfile.username || '',
                    displayName: userProfile.displayName || '',
                    bio: userProfile.bio || '',
                    isPublic: userProfile.isPublic !== false
                  });
                }}
              >
                ❌ Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="profile-display">
          <div className="profile-info">
            <div className="profile-avatar">
              {userProfile.spotifyImageUrl ? (
                <img src={userProfile.spotifyImageUrl} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  {userProfile.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            
            <div className="profile-details">
              <h4>{userProfile.displayName || userProfile.spotifyDisplayName}</h4>
              <p className="username">@{userProfile.username}</p>
              {userProfile.bio && <p className="bio">{userProfile.bio}</p>}
              <p className="privacy-status">
                {userProfile.isPublic ? '🌐 Public Profile' : '🔒 Private Profile'}
              </p>
            </div>
          </div>

          {/* Friends Section */}
          <div className="friends-section">
            <h4>👥 Friends ({friends.length})</h4>
            
            <form className="add-friend-form" onSubmit={handleAddFriend}>
              <input
                type="text"
                value={newFriendUsername}
                onChange={(e) => setNewFriendUsername(e.target.value)}
                placeholder="Enter friend's username"
                disabled={isAddingFriend}
              />
              <button 
                type="submit" 
                disabled={isAddingFriend || !newFriendUsername.trim()}
              >
                {isAddingFriend ? '➕ Adding...' : '➕ Add Friend'}
              </button>
            </form>

            <div className="friends-list">
              {friends.length === 0 ? (
                <p className="no-friends">No friends yet. Add some friends to see their song histories!</p>
              ) : (
                friends.map(friend => (
                  <div key={friend.id} className="friend-item">
                    <div className="friend-info">
                      <div className="friend-avatar">
                        {friend.spotifyImageUrl ? (
                          <img src={friend.spotifyImageUrl} alt={friend.displayName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {friend.displayName?.charAt(0) || 'F'}
                          </div>
                        )}
                      </div>
                      <div className="friend-details">
                        <h5>{friend.displayName}</h5>
                        <p>@{friend.username}</p>
                      </div>
                    </div>
                    <button 
                      className="remove-friend-btn"
                      onClick={() => handleRemoveFriend(friend.id)}
                      title="Remove friend"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile; 