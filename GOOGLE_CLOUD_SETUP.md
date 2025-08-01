# Google Cloud Firestore Setup Guide

This guide will help you set up Google Cloud Firestore for the Lyrics PWA application.

## Prerequisites

1. A Google Cloud account
2. Node.js installed on your machine
3. Google Cloud CLI (gcloud) installed

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "lyrics-rec-app")
5. Click "Create"

## Step 2: Enable Firestore

1. In the Google Cloud Console, navigate to "Firestore Database"
2. Click "Create Database"
3. Choose "Start in production mode"
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 3: Create a Service Account

1. In the Google Cloud Console, go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Enter a name (e.g., "lyrics-app-service")
4. Add a description (optional)
5. Click "Create and Continue"
6. For roles, add:
   - "Cloud Datastore User" (for Firestore access)
   - "Firebase Admin" (if you plan to use Firebase features)
7. Click "Continue"
8. Click "Done"

## Step 4: Generate Service Account Key

1. In the Service Accounts list, click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Click "Create"
6. The JSON file will be downloaded automatically

## Step 5: Configure Environment Variables

1. Rename the downloaded JSON file to `service-account-key.json`
2. Place it in the `lyricspwa/` directory (or a secure location)
3. Add the file to your `.gitignore` to keep it secure:

```bash
# Add to .gitignore
service-account-key.json
.env
```

4. Set the environment variable:

### For Development (macOS/Linux):
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/lyricspwa/service-account-key.json"
```

### For Development (Windows):
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your\lyricspwa\service-account-key.json
```

### For Production (Vercel/Netlify):
Add the environment variable in your deployment platform's settings:
- Variable name: `GOOGLE_APPLICATION_CREDENTIALS`
- Variable value: The entire content of your JSON file (as a single line)

## Step 6: Update Firestore Configuration

1. Open `src/config/firestore.js`
2. Update the `projectId` to match your Google Cloud project ID:

```javascript
const firestore = new Firestore({
  projectId: 'your-project-id-here', // Replace with your actual project ID
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});
```

## Step 7: Set Up Firestore Security Rules

1. In the Firestore Console, go to "Rules"
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Friendships collection
    match /friendships/{friendshipId} {
      allow read, write: if request.auth != null;
    }
    
    // User songs collection
    match /user_songs/{userSongId} {
      allow read, write: if request.auth != null;
    }
    
    // Song shares collection
    match /song_shares/{shareId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

## Step 8: Test the Setup

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

1. **"Permission denied" errors**
   - Check that your service account has the correct roles
   - Verify the service account key is valid
   - Check Firestore security rules

2. **"Project not found" errors**
   - Verify your project ID is correct
   - Ensure the project exists and Firestore is enabled

3. **Environment variable not found**
   - Check that `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
   - Restart your development server after setting the variable

4. **CORS errors in production**
   - Add your domain to the allowed origins in Google Cloud Console
   - Check that your service account key is properly configured in production

### Getting Help:

- [Google Cloud Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## Security Best Practices

1. **Never commit service account keys to version control**
2. **Use environment variables for sensitive configuration**
3. **Implement proper Firestore security rules**
4. **Regularly rotate service account keys**
5. **Monitor usage and costs in Google Cloud Console**
6. **Use the principle of least privilege for service account roles**

## Cost Considerations

Firestore pricing is based on:
- Document reads, writes, and deletes
- Storage used
- Network egress

For a typical PWA with moderate usage:
- Estimated cost: $5-20/month
- Free tier includes 50,000 reads, 20,000 writes, and 20,000 deletes per day

Monitor your usage in the Google Cloud Console to optimize costs. 