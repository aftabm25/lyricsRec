import React, { createContext, useContext, useState, useEffect } from 'react';
import userService from '../services/userService';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing user session on app load
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const storedToken = localStorage.getItem('spotify_access_token');
        if (storedToken) {
          // Fetch user profile from Spotify
          const response = await fetch('https://api.spotify.com/v1/me', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });

          if (response.ok) {
            const spotifyUser = await response.json();
            
            // Get or create user in database
            const dbUser = await userService.createOrUpdateUser(spotifyUser);
            setCurrentUser({
              spotify: spotifyUser,
              database: dbUser
            });
          } else {
            // Token expired, clear it
            localStorage.removeItem('spotify_access_token');
          }
        }
      } catch (error) {
        console.error('Error checking user session:', error);
        setError('Failed to load user session');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserSession();
  }, []);

  const loginUser = async (spotifyUser) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const dbUser = await userService.createOrUpdateUser(spotifyUser);
      setCurrentUser({
        spotify: spotifyUser,
        database: dbUser
      });
      
      return dbUser;
    } catch (error) {
      console.error('Error logging in user:', error);
      setError('Failed to log in user');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = () => {
    localStorage.removeItem('spotify_access_token');
    setCurrentUser(null);
    setError(null);
  };

  const updateUserProfile = async (updates) => {
    try {
      if (!currentUser?.database?.id) {
        throw new Error('No user logged in');
      }
      
      await userService.updateUserProfile(currentUser.database.id, updates);
      
      // Update local state
      setCurrentUser(prev => ({
        ...prev,
        database: {
          ...prev.database,
          ...updates
        }
      }));
    } catch (error) {
      console.error('Error updating user profile:', error);
      setError('Failed to update profile');
      throw error;
    }
  };

  const refreshUserData = async () => {
    try {
      if (!currentUser?.database?.id) return;
      
      const updatedUser = await userService.getUserBySpotifyId(currentUser.database.id);
      if (updatedUser) {
        setCurrentUser(prev => ({
          ...prev,
          database: updatedUser
        }));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const value = {
    currentUser,
    isLoading,
    error,
    loginUser,
    logoutUser,
    updateUserProfile,
    refreshUserData,
    isAuthenticated: !!currentUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}; 