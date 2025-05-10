import React, { useState } from 'react';
import { useAuth } from '../context/authContext';
import fetchApi from '../utils/api';

function TwoFactorAuthSetup({ onSetupComplete }) {
  const [step, setStep] = useState('init');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const initiate2FASetup = async () => {
    setError('');
    setIsLoading(true);
    try {
      const data = await fetchApi('/api/auth/2fa/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSecret(data.secret);
      setQrCode(data.qrCodeUrl);
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Failed to initiate 2FA setup');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable2FA = async (e) => {
    e.preventDefault(); // Prevent form submission from refreshing the page
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (!secret) {
      setError('Missing 2FA secret. Please try starting the setup again.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      console.log('Verifying 2FA with:', { token: verificationCode, secret });
      const response = await fetchApi('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: verificationCode,
          secret: secret 
        })
      });
      
      console.log('2FA verification response:', response);
      setStep('complete');
      if (onSetupComplete) {
        onSetupComplete();
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError(err.message || 'Failed to verify 2FA code');
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

      {step === 'init' ? (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Enhance your account security by enabling 2FA using an authenticator app (Google Authenticator, Authy, etc.).
          </p>
          <button
            onClick={initiate2FASetup}
            disabled={isLoading}
            className={`${buttonClasses} inline-flex justify-center`} // Center button text
          >
            {isLoading ? 'Generating...' : 'Start 2FA Setup'}
          </button>
        </>
      ) : step === 'verify' ? (
        // Step 2: Show QR Code and Verification Input
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Scan the QR code below with your authenticator app. If you cannot scan the code, manually enter the secret key.
          </p>
          {qrCode && (
            <img src={qrCode} alt="2FA QR Code" className="mx-auto my-4 border border-gray-300 p-2 bg-white" />
          )}
          {secret && (
            <p className="text-xs text-gray-500 break-all">
              Secret Key: <code className="bg-gray-200 px-1 rounded">{secret}</code>
            </p>
          )}
          <form onSubmit={verifyAndEnable2FA} className="space-y-3">
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
      ) : (
        <p className="mt-4 text-sm text-green-600">2FA enabled successfully!</p>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default TwoFactorAuthSetup;
