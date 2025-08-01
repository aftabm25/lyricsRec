import React, { useState } from 'react';
import authService from '../services/authService';
import './AuthPage.css';

const AuthPage = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await authService.loginWithEmail(email, password);
      if (result.success) {
        onAuthSuccess(result.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
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
      const result = await authService.signUpWithEmail(email, password, username);
      if (result.success) {
        onAuthSuccess(result.user, result.userData);
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

  const handleSubmit = (e) => {
    if (isLogin) {
      handleLogin(e);
    } else {
      handleSignup(e);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>LyricsRec</h1>
          <p>Your music, your lyrics, your friends</p>
        </div>

        <div className="auth-form-container">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to continue to your music journey' : 'Join us and discover music with friends'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Username</label>
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
              </>
            )}

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={isLoading || (!isLogin && !isUsernameAvailable)}
            >
              {isLoading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="auth-toggle">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={toggleMode} className="toggle-btn">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 