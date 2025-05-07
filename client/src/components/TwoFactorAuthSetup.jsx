import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function TwoFactorAuthSetup({ onSetupComplete }) {
  const { token } = useAuth(); 

  // States for the setup process
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [setupStarted, setSetupStarted] = useState(false);


  const handleGenerateSecret = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    setQrCodeUrl('');
    setSecret('');
    setVerificationCode('');

    try {
      const response = await fetch('/api/auth/2fa/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate 2FA secret.');
      }
      setSecret(data.secret); // base32 secret
      setQrCodeUrl(data.qrCodeUrl);
      setSetupStarted(true); // Show the verification step
      setMessage('Scan the QR code with your authenticator app and enter the code below.');
    } catch (err) {
      console.error("Error generating 2FA secret:", err);
      setError(err.message || 'Could not start 2FA setup.');
      setSetupStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Verify Code and Enable 2FA
  const handleVerifyCode = async (event) => {
    event.preventDefault();
    if (!verificationCode || !secret) {
      setError('Please enter the code from your authenticator app.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationCode, secret: secret }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      // Verification successful
      setMessage('2FA enabled successfully!');
      setQrCodeUrl('');
      setSecret('');
      setVerificationCode('');
      setSetupStarted(false);
      if (onSetupComplete) {
        onSetupComplete();
      }

    } catch (err) {
      console.error("Error verifying 2FA code:", err);
      setError(err.message || 'Could not verify code. It might be incorrect or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Tailwind Classes) ---
  const inputClasses = "appearance-none block w-full max-w-xs mx-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const buttonClasses = "px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50";
  // const secondaryButtonClasses = "px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50";


  return (
    <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50 text-center">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Setup Two-Factor Authentication</h2>

      {!setupStarted ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Enhance your account security by enabling 2FA using an authenticator app (Google Authenticator, Authy, etc.).
          </p>
          <button
            onClick={handleGenerateSecret}
            disabled={isLoading}
            className={`${buttonClasses} inline-flex justify-center`} // Center button text
          >
            {isLoading ? 'Generating...' : 'Start 2FA Setup'}
          </button>
        </>
      ) : (
        // Step 2: Show QR Code and Verification Input
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Scan the QR code below with your authenticator app. If you cannot scan the code, manually enter the secret key.
          </p>
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto my-4 border border-gray-300 p-2 bg-white" />
          )}
          {secret && (
            <p className="text-xs text-gray-500 break-all">
              Secret Key: <code className="bg-gray-200 px-1 rounded">{secret}</code>
            </p>
          )}
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
              Enter Verification Code:
            </label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              maxLength="6"
              pattern="\d{6}"
              title="Enter the 6-digit code from your authenticator app"
              disabled={isLoading}
              className={inputClasses}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className={`${buttonClasses} inline-flex justify-center w-full max-w-xs mx-auto`}
            >
              {isLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
            </button>
          </form>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default TwoFactorAuthSetup;
