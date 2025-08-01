import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firestore';
import userService from './userService';

class AuthService {
  // Check if user exists by Spotify ID
  async checkUserExistsBySpotifyId(spotifyId) {
    try {
      const user = await userService.getUserBySpotifyId(spotifyId);
      return user !== null;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }

  // Sign up new user with email/password and Spotify data
  async signUpWithEmailAndSpotify(email, password, spotifyUser, username) {
    try {
      console.log('Creating new user account with email:', email);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile with display name
      await updateProfile(firebaseUser, {
        displayName: spotifyUser.display_name,
        photoURL: spotifyUser.images?.[0]?.url || null
      });

      // Create user document in Firestore
      const userData = {
        spotifyId: spotifyUser.id,
        displayName: spotifyUser.display_name,
        email: email,
        profileImage: spotifyUser.images?.[0]?.url || null,
        username: username,
        firebaseUid: firebaseUser.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true
      };

      await userService.createUserDocument(firebaseUser.uid, userData);
      
      console.log('User account created successfully');
      return { success: true, user: firebaseUser, userData };
    } catch (error) {
      console.error('Error creating user account:', error);
      throw error;
    }
  }

  // Login existing user with email/password
  async loginWithEmail(email, password) {
    try {
      console.log('Logging in user with email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update last login time
      await userService.updateLastLogin(user.uid);
      
      console.log('User logged in successfully');
      return { success: true, user };
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  // Login existing user with Spotify (if they already have an account)
  async loginWithSpotify(spotifyUser) {
    try {
      console.log('Attempting to login with Spotify:', spotifyUser.id);
      
      // Check if user exists in our database by Spotify ID
      const existingUser = await userService.getUserBySpotifyId(spotifyUser.id);
      console.log('Existing user lookup result:', existingUser);
      
      if (existingUser) {
        // User exists, update their profile and return success
        console.log('Found existing user, updating profile...');
        await userService.updateUserProfile(spotifyUser.id, {
          displayName: spotifyUser.display_name,
          profileImage: spotifyUser.images?.[0]?.url || null,
          lastLoginAt: new Date()
        });
        
        console.log('Existing user logged in with Spotify successfully');
        return { success: true, user: existingUser, isExistingUser: true };
      } else {
        // User doesn't exist, need to sign up
        console.log('No existing user found, needs signup');
        return { success: false, needsSignup: true, spotifyUser };
      }
    } catch (error) {
      console.error('Error in loginWithSpotify:', error);
      // If there's an error, assume user needs signup
      return { success: false, needsSignup: true, spotifyUser, error: error.message };
    }
  }

  // Sign out user
  async signOut() {
    try {
      await signOut(auth);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Get current authenticated user
  getCurrentUser() {
    return auth.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Check if username is available
  async isUsernameAvailable(username) {
    return await userService.isUsernameAvailable(username);
  }

  // Generate unique username
  generateUsername(displayName) {
    return userService.generateUsername(displayName);
  }
}

export default new AuthService(); 