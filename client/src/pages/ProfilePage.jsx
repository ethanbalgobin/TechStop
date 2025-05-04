// client/src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import for potential redirection

function ProfilePage() {
  // State for profile data, loading status, and errors
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Hook for navigation

  // Effect to fetch profile data when the component mounts
  useEffect(() => {
    console.log("ProfilePage: Attempting to fetch profile...");
    setLoading(true);
    setError(''); // Clear previous errors

    // Retrieve the token directly from localStorage within the effect
    const token = localStorage.getItem('authToken');
    console.log("ProfilePage: Token from localStorage:", token);

    // Check if token exists before fetching
    if (!token) {
      console.log("ProfilePage: No token found, redirecting to login.");
      setError('You must be logged in to view this page.');
      setLoading(false);
      // Redirect to login page if no token is found
      navigate('/login'); // Redirect immediately
      return; // Stop the effect execution
    }

    // Fetch data from the protected endpoint
    fetch('/api/auth/me', { // Ensure this matches your server route
      method: 'GET',
      headers: {
        // Include the Authorization header
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    .then(async response => { // Make the callback async to await response.json()
      console.log("ProfilePage: Fetch response status:", response.status);
      const data = await response.json(); // Attempt to parse JSON regardless of status

      if (!response.ok) {
        // If not OK, construct an error message using server's response if available
        const errorMessage = data.message || `Error fetching profile: ${response.status} ${response.statusText}`;
        // Check for specific auth errors (401/403)
        if (response.status === 401 || response.status === 403) {
            console.log("ProfilePage: Authentication error (401/403). Token might be invalid/expired.");
            // Clear potentially invalid token and redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
            // We might need to update App's state too - ideally using Context later
            navigate('/login'); // Redirect
        }
        // Throw error to be caught by .catch()
        throw new Error(errorMessage);
      }
      // --- Profile Fetch Success ---
      console.log("ProfilePage: Profile data fetched successfully:", data);
      setProfileData(data); // Set the fetched profile data
      setError(''); // Clear any previous errors
    })
    .catch(err => {
      console.error("ProfilePage: Error during profile fetch:", err);
      setError(err.message || 'Failed to fetch profile data.'); // Set error state
      setProfileData(null); // Clear profile data on error
    })
    .finally(() => {
      setLoading(false); // Set loading to false
    });

  // Dependency array includes navigate to satisfy exhaustive-deps, although it's stable
  }, [navigate]);

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
          {/* Display other profile fields as needed */}
          <hr />
          <h3>Raw Data:</h3>
          <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', border: '1px solid #ddd', overflowX: 'auto' }}>
            {JSON.stringify(profileData, null, 2)}
          </pre>
        </div>
      ) : (
        // Should ideally not be reached if loading/error/redirect handles all cases
        <p>No profile data available.</p>
      )}
    </div>
  );
}

export default ProfilePage;
