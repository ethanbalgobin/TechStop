import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Import the custom hook to access auth context
import { useAuth } from '../context/authContext'; // Adjust path if needed

function ProfilePage() {
  // State for profile data, loading status, and errors
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get token and logout function from context
  const { token, logout } = useAuth();
  const navigate = useNavigate(); // Hook for navigation

  // Effect to fetch profile data when the component mounts OR when the token changes
  useEffect(() => {
    // Although ProtectedRoute handles initial access, this effect runs when the component mounts.
    // We rely on the token from context now.
    if (!token) {
      // This check might seem redundant due to ProtectedRoute, but it handles cases
      // where the token might become null *after* initial mount but before fetch completes,
      // or if ProtectedRoute logic changes. It also ensures the effect doesn't run fetch without a token.
      console.log("ProfilePage: No token found in context, redirecting (should have been caught by ProtectedRoute).");
      navigate('/login');
      return; // Stop the effect
    }

    console.log("ProfilePage: Attempting to fetch profile with token from context...");
    setLoading(true);
    setError(''); // Clear previous errors

    // Fetch data from the protected endpoint using the token from context
    fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Use token from useAuth()
        'Content-Type': 'application/json',
      },
    })
    .then(async response => {
      console.log("ProfilePage: Fetch response status:", response.status);
      // Try to parse JSON regardless of status, as error messages might be in the body
      const data = await response.json().catch(() => ({ message: `Invalid JSON response for status ${response.status}` }));

      if (!response.ok) {
        const errorMessage = data.message || `Error fetching profile: ${response.status} ${response.statusText}`;
        // Check for specific auth errors (401/403)
        if (response.status === 401 || response.status === 403) {
            console.log(`ProfilePage: Authentication error (${response.status}). Token might be invalid/expired. Logging out.`);
            // Use the logout function from context to clear state globally
            logout();
            // Navigate might be redundant if logout causes re-render/redirect via ProtectedRoute, but can be kept as fallback
            navigate('/login');
        }
        throw new Error(errorMessage); // Throw error to be caught by .catch()
      }
      // --- Profile Fetch Success ---
      console.log("ProfilePage: Profile data fetched successfully:", data);
      setProfileData(data);
      setError('');
    })
    .catch(err => {
      console.error("ProfilePage: Error during profile fetch:", err);
      setError(err.message || 'Failed to fetch profile data.');
      setProfileData(null);
    })
    .finally(() => {
      setLoading(false);
    });

  // Rerun the effect if the token changes (e.g., after login/logout)
  // Also include navigate and logout in deps array as they are used inside effect
  }, [token, navigate, logout]);

  // --- Render Logic ---

  if (loading) {
    return <div>Loading profile...</div>;
  }

  // Display error if one occurred (and not loading)
  if (error) {
    // The redirect should happen in useEffect, but this is a fallback message
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  // Display profile data if successfully loaded
  return (
    <div>
      <h1>Your Profile</h1>
      {profileData ? (
        <div>
          <p><strong>ID:</strong> {profileData.id}</p>
          <p><strong>Username:</strong> {profileData.username}</p>
          <p><strong>Email:</strong> {profileData.email}</p>
          <p><strong>First Name:</strong> {profileData.first_name || 'N/A'}</p>
          <p><strong>Last Name:</strong> {profileData.last_name || 'N/A'}</p>
          <hr />
          <h3>Raw Data:</h3>
          <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', border: '1px solid #ddd', overflowX: 'auto' }}>
            {JSON.stringify(profileData, null, 2)}
          </pre>
        </div>
      ) : (
        <p>No profile data available.</p>
      )}
    </div>
  );
}

export default ProfilePage;
