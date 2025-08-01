# User Management Features

This document describes the new user management features added to the Lyrics PWA application, including user profiles, friend system, and social features.

## Features Overview

### 🔐 User Authentication
- **Spotify OAuth Integration**: Users authenticate using their Spotify accounts
- **Automatic Profile Creation**: User profiles are automatically created when connecting with Spotify
- **Unique Usernames**: Each user gets a unique username for friend discovery
- **Session Management**: Persistent login sessions with automatic token refresh

### 👥 Friend System
- **Friend Requests**: Send and receive friend requests using usernames
- **Friend Management**: Accept, reject, and view friend requests
- **Friend Discovery**: Search for users by username
- **Friend Activity**: View what your friends are listening to

### 📊 User Dashboard
- **Personal Statistics**: View your listening statistics and activity
- **Recently Played**: Track your recently played songs
- **Favorites**: Manage your favorite songs
- **Most Played**: See your most frequently played songs
- **Shared Songs**: View songs shared with you by friends

### 🎵 Social Features
- **Song Sharing**: Share songs with friends
- **Activity Feed**: See friends' recent listening activity
- **Social Interactions**: Like, comment, and interact with shared content

## Database Schema

### Users Collection
```javascript
{
  spotifyId: "spotify_user_id",
  displayName: "User Display Name",
  email: "user@example.com",
  profileImage: "https://profile-image-url.com",
  username: "unique_username1234",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  lastLoginAt: Timestamp,
  isActive: true
}
```

### Friendships Collection
```javascript
{
  fromUserId: "sender_user_id",
  toUserId: "recipient_user_id",
  status: "pending" | "accepted" | "rejected",
  createdAt: Timestamp,
  acceptedAt: Timestamp, // optional
  rejectedAt: Timestamp  // optional
}
```

### User Songs Collection
```javascript
{
  userId: "user_id",
  songId: "song_id",
  songData: {
    title: "Song Title",
    artist: "Artist Name",
    album: "Album Name",
    year: "2023"
  },
  isFavorite: true,
  playCount: 5,
  addedAt: Timestamp,
  lastPlayedAt: Timestamp
}
```

### Song Shares Collection
```javascript
{
  fromUserId: "sender_user_id",
  toUserId: "recipient_user_id",
  songId: "song_id",
  songData: {
    title: "Song Title",
    artist: "Artist Name"
  },
  message: "Check out this song!",
  sharedAt: Timestamp,
  isRead: false
}
```

## How to Use

### 1. Connecting with Spotify
1. Click the "Connect Spotify" button in the top-right corner
2. Authorize the application to access your Spotify account
3. Your profile will be automatically created with a unique username

### 2. Managing Your Profile
1. Click the settings icon (⚙️) next to your profile
2. View your profile information (username, display name, email)
3. Note: Username cannot be changed once created

### 3. Adding Friends
1. Click the friends icon (👥) next to your profile
2. Click "Add Friend"
3. Search for users by their username
4. Send friend requests to users you want to connect with

### 4. Managing Friend Requests
1. Click the friends icon (👥) to open the friends modal
2. View pending friend requests in the "Friend Requests" section
3. Accept or reject requests as needed
4. View your current friends in the "Your Friends" section

### 5. Using the Dashboard
1. Click the "📊 My Dashboard" button on the home screen
2. Navigate between different tabs:
   - **Overview**: General statistics and recent activity
   - **Activity**: Your favorites and most played songs
   - **Friends**: Friends' activity and shared songs

### 6. Sharing Songs
1. While viewing a song, look for the share button
2. Select a friend to share with
3. Add an optional message
4. The song will appear in your friend's shared songs

## API Services

### UserService
Handles all user-related operations:
- `createOrUpdateUser(spotifyUser, username)`: Create or update user profile
- `getUserBySpotifyId(spotifyId)`: Get user by Spotify ID
- `getUserByUsername(username)`: Get user by username
- `updateUserProfile(spotifyId, updates)`: Update user profile
- `sendFriendRequest(fromUserId, toUsername)`: Send friend request
- `acceptFriendRequest(friendshipId)`: Accept friend request
- `rejectFriendRequest(friendshipId)`: Reject friend request
- `getFriendRequests(userId)`: Get pending friend requests
- `getUserFriends(userId)`: Get user's friends
- `searchUsers(query, currentUserId)`: Search users by username

### UserSongService
Handles song-related user interactions:
- `addToFavorites(userId, songId, songData)`: Add song to favorites
- `removeFromFavorites(userId, songId)`: Remove from favorites
- `recordSongPlay(userId, songId, songData)`: Record song play
- `getUserFavorites(userId)`: Get user's favorite songs
- `getRecentlyPlayed(userId, limit)`: Get recently played songs
- `getMostPlayed(userId, limit)`: Get most played songs
- `shareSongWithFriend(fromUserId, toUserId, songId, songData, message)`: Share song
- `getSharedSongs(userId)`: Get songs shared with user
- `getUserSongStats(userId)`: Get user statistics
- `getFriendsRecentActivity(userId, limit)`: Get friends' activity

## Components

### UserProfile
Main user profile component with:
- Spotify authentication
- Profile display
- Friend management
- Settings access

### UserDashboard
Comprehensive dashboard showing:
- User statistics
- Recent activity
- Favorites and most played
- Friends' activity
- Shared songs

### UserContext
React context providing:
- Global user state management
- Authentication status
- User data persistence
- Session management

## Security Features

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read any user profile but only update their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Friendships require authentication
    match /friendships/{friendshipId} {
      allow read, write: if request.auth != null;
    }
    
    // User songs require authentication
    match /user_songs/{userSongId} {
      allow read, write: if request.auth != null;
    }
    
    // Song shares require authentication
    match /song_shares/{shareId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Data Protection
- User passwords are not stored (Spotify handles authentication)
- Sensitive data is encrypted in transit
- Service account keys are kept secure
- Environment variables for configuration

## Performance Optimizations

### Caching
- User data is cached in React context
- Friend lists are cached locally
- Song data is cached to reduce API calls

### Lazy Loading
- Dashboard components load data on demand
- Friend activity is paginated
- Search results are limited to prevent performance issues

### Real-time Updates
- Friend requests update in real-time
- Shared songs appear immediately
- Activity feeds refresh automatically

## Troubleshooting

### Common Issues

1. **"User not found" when searching**
   - Ensure the username is correct
   - Check that the user has connected their Spotify account

2. **Friend requests not appearing**
   - Refresh the page
   - Check your internet connection
   - Verify Firestore permissions

3. **Dashboard not loading**
   - Ensure you're logged in with Spotify
   - Check browser console for errors
   - Verify Google Cloud credentials

4. **Song sharing not working**
   - Ensure both users are friends
   - Check that the song data is valid
   - Verify Firestore write permissions

### Getting Help

- Check the browser console for error messages
- Verify your Google Cloud setup in `GOOGLE_CLOUD_SETUP.md`
- Ensure all environment variables are set correctly
- Check Firestore security rules

## Future Enhancements

### Planned Features
- **Real-time messaging** between friends
- **Group playlists** for collaborative music discovery
- **Music recommendations** based on friend activity
- **Advanced analytics** and listening insights
- **Mobile app** with push notifications
- **Integration with other music services**

### Technical Improvements
- **Offline support** with service workers
- **Advanced caching** strategies
- **Performance monitoring** and analytics
- **A/B testing** framework
- **Automated testing** suite

## Contributing

To contribute to the user management features:

1. Follow the existing code structure
2. Add proper error handling
3. Include unit tests for new services
4. Update documentation
5. Follow security best practices
6. Test with real Google Cloud credentials

## Support

For support with user management features:
- Check the troubleshooting section above
- Review the Google Cloud setup guide
- Open an issue with detailed error information
- Include browser console logs and network requests 