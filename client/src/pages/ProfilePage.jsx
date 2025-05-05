import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
// Import the custom hook to access auth context
import { useAuth } from '../context/AuthContext'; 

function ProfilePage() {
  // State for profile data, loading status, and errors
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get token and logout function from context
  const { token, logout } = useAuth();
  const navigate = useNavigate(); // Hook for navigation

  // Effect to fetch profile data when the component mounts OR when the token changes
  useEffect(() => {
    if (!token) {
      console.log("ProfilePage: No token found in context, redirecting (should have been caught by ProtectedRoute).");
      navigate('/login');
      return; // Stop the effect
    }

    console.log("ProfilePage: Attempting to fetch profile with token from context...");
    setLoading(true);
    setError(null);

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
      const data = await response.json().catch(() => ({})); // Try parsing JSON
      if (!response.ok) {
        const errorMessage = data?.error || `Error fetching profile: ${response.status} ${response.statusText}`;
        if (response.status === 401 || response.status === 403) {
            console.log(`ProfilePage: Authentication error (${response.status}). Token might be invalid/expired. Logging out.`);
            logout();
            navigate('/login');
        }
        throw new Error(errorMessage);
      }
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

  }, [token, navigate, logout]); // Dependencies

  // --- Render Logic ---

  if (loading) {
    // Centered loading text
    return <div className="text-center text-gray-500 py-10">Loading profile...</div>;
  }

  if (error) {
    // Centered error message with styling
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-md mx-auto">Error: {error}</div>;
  }

  if (!profileData) {
    // Message shown if loading finished but no data (e.g., fetch error handled)
    return <div className="text-center text-gray-500 py-10">Could not load profile data.</div>;
  }

  // Display profile data if successfully loaded
  return (
    // Container with max width and padding
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Profile</h1>
      {/* Profile Details Section */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 space-y-5">
        {/* User ID */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</span>
          <span className="block text-sm text-gray-900 mt-1">{profileData.id}</span>
        </div>
        {/* Username */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Username</span>
          <span className="block text-sm text-gray-900 mt-1">{profileData.username}</span>
        </div>
        {/* Email */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Email</span>
          <span className="block text-sm text-gray-900 mt-1">{profileData.email}</span>
        </div>
        {/* First Name */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</span>
          <span className="block text-sm text-gray-900 mt-1">{profileData.first_name || 'N/A'}</span>
        </div>
        {/* Last Name */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</span>
          <span className="block text-sm text-gray-900 mt-1">{profileData.last_name || 'N/A'}</span>
        </div>
        {/* --- End Stacked layout --- */}


        {/* Placeholder for Edit Profile button */}
        <div className="pt-4 text-right border-t border-gray-200 mt-5"> {/* Added top border */}
            <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled>
                Edit Profile (Soon!)
            </button>
        </div>
      </div>

      {/* Optional: Raw Data display (can be removed later) */}
      <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Raw Data (for debugging):</h3>
          <pre className="bg-gray-100 p-4 rounded-md border border-gray-200 text-xs overflow-x-auto">
            {JSON.stringify(profileData, null, 2)}
          </pre>
      </div>
    </div>
  );
}

export default ProfilePage;
