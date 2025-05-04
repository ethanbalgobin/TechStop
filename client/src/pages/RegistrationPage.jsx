// client/src/pages/RegistrationPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RegistrationPage() {
  // State for form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(''); // Optional
  const [lastName, setLastName] = useState('');   // Optional

  // State for loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    // Basic client-side validation (add more as needed)
    if (!username || !email || !password) {
      setError('Username, email, and password are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', { // Ensure this matches your server route
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          first_name: firstName, // Send optional fields
          last_name: lastName
        }),
      });

      const data = await response.json(); // Attempt to parse JSON

      if (!response.ok) {
        // Use error message from server response if available
        throw new Error(data.error || `Registration failed: ${response.status}`);
      }

      // --- Registration Success ---
      console.log('Registration successful:', data);
      setSuccessMessage('Registration successful! Please log in.');
      // Clear form fields
      setUsername('');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      // Optionally redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 2000); // Redirect after 2 seconds

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Register New Account</h1>
      <form onSubmit={handleSubmit}>
        {/* Username Input */}
        <div>
          <label htmlFor="reg-username" style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
          <input
            type="text"
            id="reg-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #ccc' }}
          />
        </div>
        {/* Email Input */}
        <div>
          <label htmlFor="reg-email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            id="reg-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #ccc' }}
          />
        </div>
        {/* Password Input */}
        <div>
          <label htmlFor="reg-password" style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input
            type="password"
            id="reg-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #ccc' }}
          />
        </div>
        {/* First Name Input (Optional) */}
        <div>
          <label htmlFor="reg-firstname" style={{ display: 'block', marginBottom: '5px' }}>First Name (Optional):</label>
          <input
            type="text"
            id="reg-firstname"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #ccc' }}
          />
        </div>
        {/* Last Name Input (Optional) */}
        <div>
          <label htmlFor="reg-lastname" style={{ display: 'block', marginBottom: '5px' }}>Last Name (Optional):</label>
          <input
            type="text"
            id="reg-lastname"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box', border: '1px solid #ccc' }}
          />
        </div>

        <button type="submit" disabled={isLoading} style={{ padding: '10px 15px', cursor: 'pointer', border: '1px solid #ccc' }}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      {/* Display Success or Error Messages */}
      {successMessage && <p style={{ color: 'green', marginTop: '10px' }}>{successMessage}</p>}
      {error && <p style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>{error}</p>}
    </div>
  );
}

export default RegistrationPage;
