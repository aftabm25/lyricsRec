import React, { useState, useEffect } from 'react';
import { SPOTIFY_CONFIG, isSpotifyConfigured, getSpotifyConfig } from '../config/api';
import userService from '../services/userService';
import authService from '../services/authService';
import SignupModal from './SignupModal';
import './UserProfile.css';

const UserProfile = ({ currentUser }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [dbUser, setDbUser] = useState(currentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tempSpotifyUser, setTempSpotifyUser] = useState(null);
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setDbUser(currentUser);
      // Check if user has Spotify connected
      if (currentUser.spotifyId) {
        setIsConnected(true);
        // Load friend requests and friends
        loadFriendRequests(currentUser.id);
        loadFriends(currentUser.id);
      }
    }
  }, [currentUser]);

  const fetchUserProfile = async (token) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching user profile with token...');

      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token expired, clear it
        console.log('Token expired, clearing...');
        localStorage.removeItem('spotify_access_token');
        setAccessToken(null);
        setIsConnected(false);
        setUserProfile(null);
        setDbUser(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Spotify profile data:', data);
        setUserProfile(data);
        setIsConnected(true); // Mark as connected first
        
        // Now check if user exists in our database
        setTimeout(async () => {
          try {
            setIsCheckingUser(true);
            console.log('Checking if user exists in database...');
            const loginResult = await authService.loginWithSpotify(data);
            console.log('Login result:', loginResult);
            
            if (loginResult.success) {
              // User exists, set the user data
              console.log('User exists, setting user data...');
              setDbUser(loginResult.user);
              
              // Load friend requests and friends
              if (loginResult.user) {
                loadFriendRequests(loginResult.user.id);
                loadFriends(loginResult.user.id);
              }
            } else if (loginResult.needsSignup) {
              // New user needs to sign up
              console.log('New user needs signup, showing signup modal...');
              setTempSpotifyUser(data);
              setShowSignupModal(true);
            }
          } catch (authError) {
            console.error('Auth error:', authError);
            // If auth fails, show signup modal as fallback
            console.log('Auth failed, showing signup modal as fallback...');
            setTempSpotifyUser(data);
            setShowSignupModal(true);
          } finally {
            setIsCheckingUser(false);
          }
        }, 1000); // Small delay to ensure Spotify connection is stable
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSuccess = (firebaseUser, userData) => {
    setShowSignupModal(false);
    setTempSpotifyUser(null);
    setDbUser(userData);
    
    // Load friend requests and friends
    if (userData) {
      loadFriendRequests(userData.id);
      loadFriends(userData.id);
    }
  };

  const handleSignupCancel = () => {
    setShowSignupModal(false);
    setTempSpotifyUser(null);
    // Disconnect Spotify since user cancelled signup
    handleDisconnect();
  };

  const loadFriendRequests = async (userId) => {
    try {
      const requests = await userService.getFriendRequests(userId);
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const loadFriends = async (userId) => {
    try {
      const userFriends = await userService.getUserFriends(userId);
      setFriends(userFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const handleSpotifyLogin = () => {
    const config = getSpotifyConfig();
    const params = new URLSearchParams({
      client_id: config.CLIENT_ID,
      response_type: 'code',
      redirect_uri: config.REDIRECT_URI,
      scope: config.SCOPES,
      show_dialog: 'true'
    });
    
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    window.location.href = authUrl;
  };

  const handleDisconnect = () => {
    localStorage.removeItem('spotify_access_token');
    setAccessToken(null);
    setIsConnected(false);
    setUserProfile(null);
    setDbUser(null);
    setError(null);
    setFriendRequests([]);
    setFriends([]);
    setTempSpotifyUser(null);
    setShowSignupModal(false);
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !isConnected) {
      exchangeCodeForToken(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isConnected]);

  const exchangeCodeForToken = async (code) => {
    try {
      const config = getSpotifyConfig();
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(config.CLIENT_ID + ':' + config.CLIENT_SECRET)
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: config.REDIRECT_URI
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        setAccessToken(data.access_token);
        localStorage.setItem('spotify_access_token', data.access_token);
        setIsConnected(true);
        fetchUserProfile(data.access_token);
        return true;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      setError('Failed to connect to Spotify');
      return false;
    }
  };

  const handleAcceptFriendRequest = async (friendshipId) => {
    try {
      await userService.acceptFriendRequest(friendshipId);
      // Reload friend requests and friends
      if (dbUser) {
        loadFriendRequests(dbUser.id);
        loadFriends(dbUser.id);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setError('Failed to accept friend request');
    }
  };

  const handleRejectFriendRequest = async (friendshipId) => {
    try {
      await userService.rejectFriendRequest(friendshipId);
      // Reload friend requests
      if (dbUser) {
        loadFriendRequests(dbUser.id);
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      setError('Failed to reject friend request');
    }
  };

  const handleSearchUsers = async (query) => {
    if (!query.trim() || !dbUser) return;
    
    try {
      setIsSearching(true);
      const results = await userService.searchUsers(query, dbUser.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (username) => {
    try {
      await userService.sendFriendRequest(dbUser.id, username);
      setShowAddFriendModal(false);
      setSearchQuery('');
      setSearchResults([]);
      alert('Friend request sent successfully!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError(error.message);
    }
  };

  if (!isSpotifyConfigured()) {
    return null;
  }

  return (
    <div className="user-profile">
      {!isConnected ? (
        <button className="spotify-connect-btn" onClick={handleSpotifyLogin}>
          <span className="spotify-icon">🎵</span>
          <span className="connect-text">Connect Spotify</span>
        </button>
      ) : (
        <div className="profile-container">
          {isLoading ? (
            <div className="profile-loading">
              <div className="loading-spinner"></div>
              <p>Connecting to Spotify...</p>
            </div>
          ) : isCheckingUser ? (
            <div className="profile-loading">
              <div className="loading-spinner"></div>
              <p>Setting up your profile...</p>
            </div>
          ) : userProfile ? (
            <div className="user-profile-info">
              <div className="profile-image">
                {userProfile.images && userProfile.images.length > 0 ? (
                  <img 
                    src={userProfile.images[0].url} 
                    alt={userProfile.display_name}
                    className="profile-avatar"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {userProfile.display_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="connection-status connected"></div>
              </div>
              <div className="profile-info">
                <span className="user-name">{userProfile.display_name}</span>
                {dbUser && <span className="user-username">@{dbUser.username}</span>}
                <span className="user-email">{userProfile.email}</span>
              </div>
              <div className="profile-actions">
                <button 
                  className="profile-btn" 
                  onClick={() => setShowProfileModal(true)}
                  title="Edit Profile"
                >
                  ⚙️
                </button>
                <button 
                  className="friends-btn" 
                  onClick={() => setShowFriendsModal(true)}
                  title="Friends"
                >
                  👥
                  {friendRequests.length > 0 && (
                    <span className="friend-requests-badge">{friendRequests.length}</span>
                  )}
                </button>
                <button 
                  className="disconnect-btn" 
                  onClick={handleDisconnect} 
                  title="Disconnect Spotify"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-error">
              <span className="error-icon">⚠️</span>
              <button className="retry-btn" onClick={() => fetchUserProfile(accessToken)}>
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && tempSpotifyUser && (
        <SignupModal
          spotifyUser={tempSpotifyUser}
          onSignupSuccess={handleSignupSuccess}
          onCancel={handleSignupCancel}
        />
      )}

      {/* Profile Modal */}
      {showProfileModal && dbUser && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            <div className="profile-form">
              <div className="form-group">
                <label>User ID:</label>
                <div className="user-id-container">
                  <input 
                    type="text" 
                    value={dbUser.id} 
                    readOnly 
                    className="user-id-input"
                  />
                  <button 
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(dbUser.id);
                      alert('User ID copied to clipboard!');
                    }}
                    title="Copy User ID"
                  >
                    📋
                  </button>
                </div>
                <small>Share this ID with friends to help them find you</small>
              </div>
              <div className="form-group">
                <label>Username:</label>
                <input 
                  type="text" 
                  value={dbUser.username} 
                  readOnly 
                  className="username-input"
                />
                <small>Username cannot be changed</small>
              </div>
              <div className="form-group">
                <label>Display Name:</label>
                <input 
                  type="text" 
                  value={dbUser.displayName} 
                  readOnly 
                />
                <small>Updated from Spotify</small>
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input 
                  type="email" 
                  value={dbUser.email} 
                  readOnly 
                />
                <small>Updated from Spotify</small>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {showFriendsModal && (
        <div className="modal-overlay" onClick={() => setShowFriendsModal(false)}>
          <div className="modal-content friends-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Friends</h3>
            
            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <div className="friend-requests-section">
                <h4>Friend Requests ({friendRequests.length})</h4>
                {friendRequests.map((request) => (
                  <div key={request.id} className="friend-request-item">
                    <div className="friend-request-info">
                      <span className="friend-name">{request.fromUser.displayName}</span>
                      <span className="friend-username">@{request.fromUser.username}</span>
                    </div>
                    <div className="friend-request-actions">
                      <button 
                        className="accept-btn"
                        onClick={() => handleAcceptFriendRequest(request.id)}
                      >
                        Accept
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={() => handleRejectFriendRequest(request.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Friends List */}
            <div className="friends-section">
              <h4>Your Friends ({friends.length})</h4>
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <div key={friend.id} className="friend-item">
                    <div className="friend-avatar">
                      {friend.profileImage ? (
                        <img src={friend.profileImage} alt={friend.displayName} />
                      ) : (
                        <div className="friend-avatar-placeholder">
                          {friend.displayName?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="friend-info">
                      <span className="friend-name">{friend.displayName}</span>
                      <span className="friend-username">@{friend.username}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-friends">No friends yet. Add some friends to get started!</p>
              )}
            </div>

            {/* Add Friend Button */}
            <button 
              className="add-friend-btn"
              onClick={() => setShowAddFriendModal(true)}
            >
              Add Friend
            </button>

            <div className="modal-actions">
              <button onClick={() => setShowFriendsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="modal-overlay" onClick={() => setShowAddFriendModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Friend</h3>
            <div className="search-section">
              <input
                type="text"
                placeholder="Search by username or user ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    handleSearchUsers(e.target.value);
                  } else {
                    setSearchResults([]);
                  }
                }}
                className="search-input"
              />
              {isSearching && <div className="search-loading">Searching...</div>}
            </div>
            
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((user) => (
                  <div key={user.id} className="search-result-item">
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt={user.displayName} />
                        ) : (
                          <div className="user-avatar-placeholder">
                            {user.displayName?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="user-details">
                        <span className="user-name">{user.displayName}</span>
                        <span className="user-username">@{user.username}</span>
                      </div>
                    </div>
                    <button 
                      className="add-friend-request-btn"
                      onClick={() => handleSendFriendRequest(user.username)}
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowAddFriendModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile; 