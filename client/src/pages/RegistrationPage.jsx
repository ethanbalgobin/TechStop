import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function RegistrationPage() {
  // State for form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // State for loading and errors/success
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    if (!username || !email || !password) {
      setError('Username, email, and password are required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Registration failed: ${response.status}`);
      }

      console.log('Registration successful:', data);
      setSuccessMessage('Registration successful! Redirecting to login...');
      setUsername('');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Input Styling Class ---
  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  return (
    // Centering container with max width, similar to LoginPage
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] py-8"> {/* Added py-8 for vertical padding */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900">Create your TechStop Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4"> {/* Reduced space-y slightly */}
          {/* Username Input */}
          <div>
            <label htmlFor="reg-username" className={labelClasses}>Username</label>
            <input
              type="text"
              id="reg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              className={inputClasses} // Apply consistent input style
            />
          </div>
          {/* Email Input */}
          <div>
            <label htmlFor="reg-email" className={labelClasses}>Email address</label>
            <input
              type="email"
              id="reg-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className={inputClasses} // Apply consistent input style
            />
          </div>
          {/* Password Input */}
          <div>
            <label htmlFor="reg-password" className={labelClasses}>Password</label>
            <input
              type="password"
              id="reg-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className={inputClasses} // Apply consistent input style
            />
          </div>
          {/* First Name Input (Optional) */}
          <div>
            <label htmlFor="reg-firstname" className={labelClasses}>First Name <span className="text-gray-500">(Optional)</span></label>
            <input
              type="text"
              id="reg-firstname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isLoading}
              className={inputClasses} // Apply consistent input style
            />
          </div>
          {/* Last Name Input (Optional) */}
          <div>
            <label htmlFor="reg-lastname" className={labelClasses}>Last Name <span className="text-gray-500">(Optional)</span></label>
            <input
              type="text"
              id="reg-lastname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isLoading}
              className={inputClasses} // Apply consistent input style
            />
          </div>

          {/* Display Success or Error Messages */}
          {successMessage && (
            <p className="text-sm text-green-600 text-center font-medium">
              {successMessage}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 text-center font-medium">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              // Consistent button styling with LoginPage
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Registering...' : 'Create Account'}
            </button>
          </div>
        </form>
        {/* Link to Login Page */}
        <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Login
            </Link>
          </p>
      </div>
    </div>
  );
}

export default RegistrationPage;
