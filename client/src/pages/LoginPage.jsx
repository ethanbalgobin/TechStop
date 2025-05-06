import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


function LoginPage() {

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // --- State for 2FA step ---
  const [totpCode, setTotpCode] = useState(''); // Input for the 2FA code
  const [requires2FA, setRequires2FA] = useState(false); // Flag to show 2FA input
  const [pendingUserId, setPendingUserId] = useState(null); // Store userId between steps
  // --- End State ---

  // Other state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hooks
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect path after successful login
  const from = location.state?.from?.pathname || "/profile";

  // --- Handler for initial Email/Password Submission ---
  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setRequires2FA(false); // Reset 2FA flag on new attempt
    setPendingUserId(null);
    setTotpCode('');

    try {
      const response = await fetch('/api/auth/login', { // Step 1: Password check
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Login failed with status: ${response.status}`);
      }

      // --- Check response from backend ---
      if (data.requires2FA && data.userId) {
        // 2FA is required! Update state to show 2FA input
        console.log("LoginPage: 2FA required for user ID:", data.userId);
        setRequires2FA(true);
        setPendingUserId(data.userId);
        setPasswordInput(''); // Clear password field for security
        setError(''); // Clear any previous errors
      } else if (data.token && data.user) {
        // Login successful (no 2FA or already verified), proceed 
        console.log('LoginPage: Login successful (no 2FA needed)', data);
        login(data.token, data.user); // Update global state via context
        console.log(`LoginPage: Navigating to ${from}`);
        navigate(from, { replace: true });
      } else {
        // Unexpected response from backend
        throw new Error('Invalid response received from server during login.');
      }

    } catch (err) {
      console.error('LoginPage: Password submission error:', err);
      setError(err.message || 'Login failed. Please check credentials or server connection.');
      setRequires2FA(false); // Ensure 2FA form isn't shown on error
      setPendingUserId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handler for 2FA Code Submission ---
  const handle2FASubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    if (!pendingUserId || !totpCode) {
        setError('User ID or 2FA code is missing. Please try logging in again.');
        setIsLoading(false);
        // Reset state
        setRequires2FA(false);
        setPendingUserId(null);
        setTotpCode('');
        setEmailInput(''); // Clear email
        return;
    }

    try {
        const response = await fetch('/api/auth/verify-2fa', { // Step 2: 2FA code check
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: pendingUserId, totpCode: totpCode }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Specific error for invalid code vs other errors
            throw new Error(data.error || `2FA verification failed: ${response.status}`);
        }

        // 2FA successful, backend sends back token and user data
        if (login && data.token && data.user) {
            console.log('LoginPage: 2FA successful, logging in.', data);
            login(data.token, data.user); // Update global state
            console.log(`LoginPage: Navigating to ${from}`);
            navigate(from, { replace: true });
        } else {
            throw new Error('Invalid response received from server after 2FA verification.');
        }

    } catch (err) {
        console.error('LoginPage: 2FA submission error:', err);
        setError(err.message || 'Failed to verify 2FA code.');
        // Keep 2FA input visible for retry, but clear code
        setTotpCode('');
    } finally {
        setIsLoading(false);
    }
  };

  // --- Styling Classes ---
  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const buttonClasses = "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          {/* --- Update heading based on state --- */}
          {requires2FA ? 'Enter Verification Code' : 'Login to TechStop'}
        </h1>

        {/* -- Conditionally render forms based on 'requires2FA' state --- */}
        {!requires2FA ? (
          // --- Password Form ---
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className={labelClasses}>Email address</label>
              <input
                type="email" id="email" name="email" value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)} required disabled={isLoading}
                placeholder="you@example.com" className={inputClasses} autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClasses}>Password</label>
              <input
                type="password" id="password" name="password" value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)} required disabled={isLoading}
                placeholder="Password" className={inputClasses} autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-600 text-center font-medium">{error}</p>}
            <div>
              <button type="submit" disabled={isLoading} className={buttonClasses}>
                {isLoading ? 'Checking...' : 'Login'}
              </button>
            </div>
          </form>
        ) : (
          // --- 2FA Code Form ---
          <form onSubmit={handle2FASubmit} className="space-y-6">
            <p className="text-sm text-center text-gray-600">
              Enter the 6-digit code shown in your authenticator app.
            </p>
            <div>
              <label htmlFor="totp-code" className={labelClasses}>Verification Code</label>
              <input
                type="text" id="totp-code" name="totpCode" value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)} required disabled={isLoading}
                placeholder="123456" maxLength="6" pattern="\d{6}" inputMode="numeric"
                className={`${inputClasses} text-center tracking-widest`} // Center text, add tracking
                autoComplete="one-time-code"
              />
            </div>
            {error && <p className="text-sm text-red-600 text-center font-medium">{error} Please try again.</p>}
            <div>
              <button type="submit" disabled={isLoading || totpCode.length !== 6} className={buttonClasses}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setRequires2FA(false); setPendingUserId(null); setError(''); setEmailInput(''); setPasswordInput(''); }}
              disabled={isLoading}
              className="w-full text-center text-sm text-gray-600 hover:text-blue-800 mt-2"
            >
              Cancel / Use different account
            </button>
          </form>
        )}

        {/* Link to Registration Page (only show if not in 2FA step) */}
        {!requires2FA && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Register here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
