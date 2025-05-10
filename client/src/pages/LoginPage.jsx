import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import fetchApi from '../utils/api';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ 
          email: username,
          password: password 
        })
      });

      if (data.requires2FA) {
        setUserId(data.userId);
        setShow2FA(true);
      } else {
        login(data.token, data.user);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('LoginPage: Password submission error:', err);
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await fetchApi('/api/auth/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userId: userId,
          totpCode: twoFactorCode 
        })
      });

      login(data.token, data.user);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('LoginPage: 2FA submission error:', err);
      setError(err.message || 'Failed to verify 2FA code');
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
          {show2FA ? 'Enter Verification Code' : 'Login to TechStop'}
        </h1>
        {!show2FA ? (
          // --- Password Form ---
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className={labelClasses}>E-mail address</label>
              <input
                type="text" id="username" name="username" value={username}
                onChange={(e) => setUsername(e.target.value)} required disabled={isLoading}
                placeholder="you@example.com" className={inputClasses} autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClasses}>Password</label>
              <input
                type="password" id="password" name="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required disabled={isLoading}
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
              <label htmlFor="two-factor-code" className={labelClasses}>Verification Code</label>
              <input
                type="text" id="two-factor-code" name="twoFactorCode" value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)} required disabled={isLoading}
                placeholder="123456" maxLength="6" pattern="\d{6}" inputMode="numeric"
                className={`${inputClasses} text-center tracking-widest`} // Center text, add tracking
                autoComplete="one-time-code"
              />
            </div>
            {error && <p className="text-sm text-red-600 text-center font-medium">{error} Please try again.</p>}
            <div>
              <button type="submit" disabled={isLoading || twoFactorCode.length !== 6} className={buttonClasses}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setShow2FA(false); setError(''); setUsername(''); setPassword(''); }}
              disabled={isLoading}
              className="w-full text-center text-sm text-gray-600 hover:text-blue-800 mt-2"
            >
              Cancel / Use different account
            </button>
          </form>
        )}
        {!show2FA && (
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
