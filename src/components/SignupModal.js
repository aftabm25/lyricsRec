import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import './SignupModal.css';

const SignupModal = ({ spotifyUser, onSignupSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  useEffect(() => {
    if (spotifyUser) {
      // Generate initial username from Spotify display name
      const generatedUsername = authService.generateUsername(spotifyUser.display_name);
      setUsername(generatedUsername);
    }
  }, [spotifyUser]);

  const handleUsernameChange = async (value) => {
    setUsername(value);
    setError('');
    
    if (value.length >= 3) {
      setIsCheckingUsername(true);
      try {
        const available = await authService.isUsernameAvailable(value);
        setIsUsernameAvailable(available);
      } catch (error) {
        console.error('Error checking username:', error);
        setIsUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    } else {
      setIsUsernameAvailable(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password || !confirmPassword || !username) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!isUsernameAvailable) {
      setError('Username is not available');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await authService.signUpWithEmailAndSpotify(
        email, 
        password, 
        spotifyUser, 
        username
      );
      
      if (result.success) {
        onSignupSuccess(result.user, result.userData);
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!spotifyUser) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content signup-modal">
        <h3>Complete Your Profile</h3>
        <p className="signup-subtitle">
          Welcome, {spotifyUser.display_name}! Please create your account to continue.
        </p>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          <div className="form-group">
            <label>Username:</label>
            <div className="username-input-container">
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Choose a username"
                required
                className={!isUsernameAvailable ? 'username-taken' : ''}
              />
              {isCheckingUsername && (
                <div className="username-checking">Checking...</div>
              )}
              {!isCheckingUsername && username.length >= 3 && (
                <div className={`username-status ${isUsernameAvailable ? 'available' : 'taken'}`}>
                  {isUsernameAvailable ? '✓ Available' : '✗ Taken'}
                </div>
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onCancel}
              className="cancel-btn"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="signup-btn"
              disabled={isLoading || !isUsernameAvailable}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupModal; 