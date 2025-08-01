# Firebase Setup Guide

This guide will help you set up Firebase for the Lyrics PWA application.

## Prerequisites

1. A Google account
2. Node.js installed on your machine

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "lyrics-rec-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In the Firebase Console, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 3: Get Firebase Configuration

1. In the Firebase Console, click on the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to the "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "lyrics-pwa")
6. Copy the Firebase configuration object

## Step 4: Configure Environment Variables

1. Create a `.env` file in your `lyricspwa/` directory
2. Add your Firebase configuration:

```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id-here
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id-here
```

3. Replace the placeholder values with your actual Firebase configuration

## Step 5: Set Up Firestore Security Rules

1. In the Firebase Console, go to "Firestore Database"
2. Click on the "Rules" tab
3. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - anyone can read, users can only update their own
    match /users/{userId} {
      allow read: if true;  // Allow public read for friend discovery
      allow create: if true;  // Allow user creation
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;  // Prevent user deletion
    }
    
    // Friendships collection - authenticated users can read/write
    match /friendships/{friendshipId} {
      allow read, write: if request.auth != null;
    }
    
    // User songs collection - authenticated users can read/write
    match /user_songs/{userSongId} {
      allow read, write: if request.auth != null;
    }
    
    // Song shares collection - authenticated users can read/write
    match /song_shares/{shareId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Click "Publish"

## Step 6: Enable Authentication (Optional)

If you want to add Firebase Authentication later:

1. In the Firebase Console, go to "Authentication"
2. Click "Get started"
3. Choose your sign-in methods (Google, Email/Password, etc.)
4. Configure the settings as needed

## Step 7: Test the Setup

1. Start your development server:
```bash
npm start
```

2. Connect with Spotify and check if user data is being saved to Firestore
3. Check the Firestore Console to see if collections are being created

## Database Schema

The application uses the following Firestore collections:

### `users`
- `spotifyId` (string): Spotify user ID
- `displayName` (string): User's display name
- `email` (string): User's email
- `profileImage` (string): URL to profile image
- `username` (string): Unique username
- `createdAt` (timestamp): Account creation date
- `updatedAt` (timestamp): Last update date
- `lastLoginAt` (timestamp): Last login date
- `isActive` (boolean): Account status

### `friendships`
- `fromUserId` (string): Sender's user ID
- `toUserId` (string): Recipient's user ID
- `status` (string): "pending", "accepted", or "rejected"
- `createdAt` (timestamp): Request creation date
- `acceptedAt` (timestamp): Acceptance date (if accepted)
- `rejectedAt` (timestamp): Rejection date (if rejected)

### `user_songs`
- `userId` (string): User ID
- `songId` (string): Song ID
- `songData` (object): Song information
- `isFavorite` (boolean): Whether song is favorited
- `playCount` (number): Number of times played
- `addedAt` (timestamp): When added to favorites
- `lastPlayedAt` (timestamp): Last play date

### `song_shares`
- `fromUserId` (string): Sender's user ID
- `toUserId` (string): Recipient's user ID
- `songId` (string): Song ID
- `songData` (object): Song information
- `message` (string): Optional message
- `sharedAt` (timestamp): Share date
- `isRead` (boolean): Whether recipient has read it

## Troubleshooting

### Common Issues:

1. **"Firebase not initialized" errors**
   - Check that your Firebase configuration is correct
   - Ensure all environment variables are set
   - Restart your development server

2. **"Permission denied" errors**
   - Check your Firestore security rules
   - Ensure the rules allow the operations you're trying to perform

3. **"Project not found" errors**
   - Verify your project ID is correct
   - Ensure the project exists and Firestore is enabled

4. **Environment variables not loading**
   - Make sure your `.env` file is in the correct location
   - Ensure variable names start with `REACT_APP_`
   - Restart your development server

### Getting Help:

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## Security Best Practices

1. **Use environment variables for sensitive configuration**
2. **Implement proper Firestore security rules**
3. **Regularly review and update security rules**
4. **Monitor usage and costs in Firebase Console**
5. **Use the principle of least privilege for security rules**

## Cost Considerations

Firebase pricing is based on:
- Document reads, writes, and deletes
- Storage used
- Network egress

For a typical PWA with moderate usage:
- Estimated cost: $5-20/month
- Free tier includes 50,000 reads, 20,000 writes, and 20,000 deletes per day

Monitor your usage in the Firebase Console to optimize costs.

## Production Deployment

For production deployment:

1. **Set up environment variables in your hosting platform**
   - Vercel: Add environment variables in project settings
   - Netlify: Add environment variables in site settings
   - Other platforms: Follow their documentation

2. **Configure Firebase for production**
   - Add your production domain to authorized domains
   - Set up proper security rules
   - Monitor usage and performance

3. **Test thoroughly**
   - Test all user flows
   - Verify data is being saved correctly
   - Check for any console errors 