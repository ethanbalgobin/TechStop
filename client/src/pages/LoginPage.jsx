import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
// Import the custom hook to access auth context
import { useAuth } from '../context/authContext'; // Adjust path if needed

// Removed onLoginSuccess prop
function LoginPage() {
  // State specific to the login form
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get the login function from the Auth context
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get location state

  // Determine where to redirect after login
  // If redirected from ProtectedRoute, 'from' will contain the original path
  const from = location.state?.from?.pathname || "/profile"; // Default to /profile

  // Handles the form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          password: passwordInput
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Login failed with status: ${response.status}`);
      }

      // --- Login Success ---
      console.log('LoginPage: Login successful', data);

      // Call the login function from the context
      if (login && data.token && data.user) {
        login(data.token, data.user); // Update global state via context
        // Navigate to the originally intended page or default (/profile)
        console.log(`LoginPage: Navigating to ${from}`);
        navigate(from, { replace: true }); // Use replace to avoid login page in history
      } else {
          console.error("Login successful but context login function or token/user data is missing.");
          setError("Login succeeded but failed to update application state.");
      }

    } catch (err) {
      console.error('LoginPage: Login error:', err);
      setError(err.message || 'Login failed. Please check credentials or server connection.');
    } finally {
      setIsLoading(false);
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
            type="email"
            id="email"
            name="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            disabled={isLoading}
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
            disabled={isLoading}
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
