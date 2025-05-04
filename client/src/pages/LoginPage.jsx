// client/src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Hook for navigation

// Accepts a function prop 'onLoginSuccess' which will be called after successful login
function LoginPage({ onLoginSuccess }) {
  // State specific to the login form
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hook to programmatically navigate
  const navigate = useNavigate();

  // Handles the form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission behavior
    setIsLoading(true);
    setError(''); // Clear previous errors

    try {
      // Make the actual API call to the backend
      const response = await fetch('/api/auth/login', { // Use the correct server path
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput, // Send email from state
          password: passwordInput // Send password from state
        }),
      });

      const data = await response.json(); // Attempt to parse JSON regardless of status first

      if (!response.ok) {
        // Throw an error with the message from the server's JSON response or default
        throw new Error(data.message || `Login failed with status: ${response.status}`);
      }

      // --- Login Success ---
      console.log('LoginPage: Login successful', data);

      // Call the callback function passed from App, providing the token and user data
      if (onLoginSuccess && data.token && data.user) {
        onLoginSuccess(data.token, data.user); // Pass token and user up to App
        // Navigate to the profile page (or home/dashboard) after successful login
        navigate('/profile'); // Redirect user
      } else {
          // This case means login succeeded on server but callback or data is missing
          console.error("Login successful but onLoginSuccess callback or token/user data is missing.");
          setError("Login succeeded but failed to update application state.");
      }

    } catch (err) {
      // Catch errors from fetch or the throw statement above
      console.error('LoginPage: Login error:', err);
      setError(err.message || 'Login failed. Please check credentials or server connection.');
      // Do NOT navigate on error
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  // Render the login form
  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email" // Use type="email"
            id="email"
            name="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            disabled={isLoading} // Disable input while loading
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #ccc' }}
          />
        </div>
        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            required
            disabled={isLoading} // Disable input while loading
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #ccc' }}
          />
        </div>
        <button type="submit" disabled={isLoading} style={{ padding: '10px 15px', cursor: 'pointer', border: '1px solid #ccc' }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {/* Display login errors */}
      {error && <p style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>{error}</p>}
    </div>
  );
}

export default LoginPage;
