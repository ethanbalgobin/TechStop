// client/src/pages/ProfilePage.jsx

// --- MODIFIED: Added useCallback ---
import React, { useState, useEffect, useCallback } from 'react';
// --- MODIFIED: Removed unused Link import ---
import { useNavigate } from 'react-router-dom';
// Import the custom hook to access auth context
import { useAuth } from '../context/AuthContext'; // Adjust path if needed
// --- NEW: Import the 2FA Setup component ---
import TwoFactorAuthSetup from '../components/TwoFactorAuthSetup'; // Adjust path if needed

function ProfilePage() {
  // State for profile data, loading status, and errors
  // Renamed profileData to userProfile
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get token and logout function from context
  const { token, logout } = useAuth();
  const navigate = useNavigate(); // Hook for navigation

  // --- MODIFIED: Wrapped fetch logic in useCallback ---
  const fetchProfileData = useCallback(async () => {
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    console.log("ProfilePage: Fetching profile data...");
    setLoading(true);
    setError(null);
    try {
      // Fetch logic remains the same, now includes is_2fa_enabled from API
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error || `Error fetching profile: ${response.status}`;
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
        }
        throw new Error(errorMessage);
      }
      console.log("ProfilePage: Profile data fetched:", data);
      setUserProfile(data);
    } catch (err) {
      console.error("ProfilePage: Fetch error:", err);
      setError(err.message || 'Failed to load profile data.');
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]); // Dependencies for useCallback


  // --- MODIFIED: useEffect now depends on stable fetchProfileData ---
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);


  // --- NEW: Callback for when 2FA setup completes ---
  const handle2FASetupComplete = () => {
    console.log("ProfilePage: 2FA setup complete, refetching profile data...");
    // Refetch profile data to update the is_2fa_enabled status display
    fetchProfileData();
  };

  // --- Render Logic ---

  if (loading) {
    return <div className="text-center text-gray-500 py-10">Loading profile...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-md mx-auto">Error: {error}</div>;
  }

  if (!userProfile) {
    return <div className="text-center text-gray-500 py-10">Could not load profile data.</div>;
  }

  // Display profile data if successfully loaded
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Profile</h1>

      {/* Profile Details Section (Layout updated previously) */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 space-y-5 mb-8">
        {/* User ID */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</span>
          <span className="block text-sm text-gray-900 mt-1">{userProfile.id}</span>
        </div>
        {/* Username */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Username</span>
          <span className="block text-sm text-gray-900 mt-1">{userProfile.username}</span>
        </div>
        {/* Email */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Email</span>
          <span className="block text-sm text-gray-900 mt-1">{userProfile.email}</span>
        </div>
        {/* First Name */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</span>
          <span className="block text-sm text-gray-900 mt-1">{userProfile.first_name || 'N/A'}</span>
        </div>
        {/* Last Name */}
        <div>
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</span>
          <span className="block text-sm text-gray-900 mt-1">{userProfile.last_name || 'N/A'}</span>
        </div>

        {/* Edit Profile button */}
        <div className="pt-4 text-right border-t border-gray-200 mt-5">
            <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled>
                Edit Profile (Soon!)
            </button>
        </div>
      </div>


      {/* --- NEW: 2FA Section --- */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
         <h2 className="text-xl font-semibold text-gray-800 mb-4">Two-Factor Authentication (2FA)</h2>
         {/* --- NEW: Conditional rendering based on is_2fa_enabled --- */}
         {userProfile.is_2fa_enabled ? (
            // If 2FA is already enabled
            <div>
                <p className="text-sm text-green-600 font-medium mb-4">
                    Authenticator App 2FA is enabled for your account.
                </p>
                {/* TODO: Add Disable 2FA button/logic here */}
                <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" disabled>
                    Disable 2FA (Soon!)
                </button>
            </div>
         ) : (
            // If 2FA is not enabled, render the setup component
            // --- NEW: Rendering TwoFactorAuthSetup and passing callback ---
            <TwoFactorAuthSetup onSetupComplete={handle2FASetupComplete} />
         )}
      </div>
      {/* --- End 2FA Section --- */}
    </div>
  );
}

export default ProfilePage;
