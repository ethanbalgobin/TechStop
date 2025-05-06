import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import TwoFactorAuthSetup from '../components/TwoFactorAuthSetup';

function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [disable2FAError, setDisable2FAError] = useState('');
  const [disable2FAMessage, setDisable2FAMessage] = useState('');

  // --- State for custom password prompt ---
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordToDisable, setPasswordToDisable] = useState('');
  // --- End State ---

  const { token, logout, dismiss2FAReminder } = useAuth();
  const navigate = useNavigate();

  const fetchProfileData = useCallback(async () => {
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    console.log("ProfilePage: Fetching profile data...");
    setLoading(true);
    setError(null);
    setDisable2FAError('');
    setDisable2FAMessage('');
    try {
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
  }, [token, logout, navigate]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handle2FASetupComplete = () => {
    console.log("ProfilePage: 2FA setup complete, refetching profile data...");
    fetchProfileData();
    dismiss2FAReminder();
  };

  // --- Handler for disabling 2FA ---
  const handleDisable2FAInitiate = () => {
    setShowPasswordPrompt(true);
    setPasswordToDisable(''); // Clear any previous password
    setDisable2FAError('');
    setDisable2FAMessage('');
  };

  const handleConfirmDisable2FA = async () => {
    if (!passwordToDisable) {
      setDisable2FAError("Password is required to disable 2FA.");
      return;
    }

    setIsDisabling2FA(true);
    setDisable2FAError('');
    setDisable2FAMessage('');

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: passwordToDisable }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA.');
      }

      setDisable2FAMessage(data.message || '2FA has been disabled.');
      setShowPasswordPrompt(false); // Hide password prompt on success
      setPasswordToDisable('');    // Clear password
      fetchProfileData();      // Refetch profile data
      dismiss2FAReminder();    // Dismiss reminder

    } catch (err) {
      console.error("Error disabling 2FA:", err);
      setDisable2FAError(err.message || 'Could not disable 2FA. Incorrect password?');
    } finally {
      setIsDisabling2FA(false);
    }
  };


  // --- Styling Classes ---
  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const buttonClasses = "px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50";
  const secondaryButtonClasses = "px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50";


  // --- Render Logic ---
  if (loading && !userProfile) {
    return <div className="text-center text-gray-500 py-10">Loading profile...</div>;
  }
  if (error && !userProfile) {
    return <div className="text-center text-red-600 bg-red-100 p-4 rounded-md max-w-md mx-auto">Error: {error}</div>;
  }
  if (!userProfile) {
    return <div className="text-center text-gray-500 py-10">Could not load profile data.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Profile</h1>

      {/* Profile Details Section */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 space-y-5 mb-8">
        {/* ... User details ... */}
        <div><span className={labelClasses + " uppercase tracking-wider"}>User ID</span><span className="block text-sm text-gray-900 mt-1">{userProfile.id}</span></div>
        <div><span className={labelClasses + " uppercase tracking-wider"}>Username</span><span className="block text-sm text-gray-900 mt-1">{userProfile.username}</span></div>
        <div><span className={labelClasses + " uppercase tracking-wider"}>Email</span><span className="block text-sm text-gray-900 mt-1">{userProfile.email}</span></div>
        <div><span className={labelClasses + " uppercase tracking-wider"}>First Name</span><span className="block text-sm text-gray-900 mt-1">{userProfile.first_name || 'N/A'}</span></div>
        <div><span className={labelClasses + " uppercase tracking-wider"}>Last Name</span><span className="block text-sm text-gray-900 mt-1">{userProfile.last_name || 'N/A'}</span></div>
        <div className="pt-4 text-right border-t border-gray-200 mt-5">
            <button className={secondaryButtonClasses} disabled>Edit Profile (Soon!)</button>
        </div>
      </div>


      {/* --- 2FA Section --- */}
      <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
         <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-semibold text-gray-800">Two-Factor Authentication (2FA)</h2>
             {userProfile.is_2fa_enabled && (
                 <span className="text-green-600" title="2FA Enabled">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                     </svg>
                 </span>
             )}
         </div>

         {/* Display messages for disable action */}
         {disable2FAMessage && <p className="text-sm text-green-600 mb-3">{disable2FAMessage}</p>}
         {disable2FAError && <p className="text-sm text-red-600 mb-3">{disable2FAError}</p>}

         {userProfile.is_2fa_enabled ? (
            <div>
                <p className="text-sm text-gray-600 mb-4">
                    Authenticator App 2FA is enabled for your account.
                </p>
                {/* --- Conditionally show password prompt or Disable button --- */}
                {!showPasswordPrompt ? (
                    <button
                        onClick={handleDisable2FAInitiate}
                        disabled={isDisabling2FA}
                        className={secondaryButtonClasses}
                    >
                        {isDisabling2FA ? 'Processing...' : 'Disable 2FA'}
                    </button>
                ) : (
                    <div className="mt-4 space-y-3">
                        <label htmlFor="disable-2fa-password" className={labelClasses}>
                            Enter current password to disable 2FA:
                        </label>
                        <input
                            type="password"
                            id="disable-2fa-password"
                            value={passwordToDisable}
                            onChange={(e) => setPasswordToDisable(e.target.value)}
                            className={inputClasses}
                            autoComplete="current-password"
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={handleConfirmDisable2FA}
                                disabled={isDisabling2FA || !passwordToDisable}
                                className={`${buttonClasses} bg-red-600 hover:bg-red-700 focus:ring-red-500`} // Red for destructive action
                            >
                                {isDisabling2FA ? 'Disabling...' : 'Confirm Disable'}
                            </button>
                            <button
                                onClick={() => {setShowPasswordPrompt(false); setDisable2FAError('');}}
                                disabled={isDisabling2FA}
                                className={secondaryButtonClasses}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
         ) : (
            // If 2FA is not enabled (setup component and dismiss button)
            <>
                <TwoFactorAuthSetup onSetupComplete={handle2FASetupComplete} />
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <button
                        onClick={dismiss2FAReminder}
                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                    >
                        Remind me later
                    </button>
                </div>
            </>
         )}
      </div>
    </div>
  );
}

export default ProfilePage;
