import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext'; 

function LoginPage() {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/profile";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Login failed with status: ${response.status}`);
      }
      if (login && data.token && data.user) {
        login(data.token, data.user);
        console.log(`LoginPage: Navigating to ${from}`);
        navigate(from, { replace: true });
      } else {
        console.error("Login successful but context login function or token/user data is missing.");
        setError("Login succeeded but failed to update application state.");
      }
    } catch (err) {
      console.error('LoginPage: Login error:', err);
      setError(err.message || 'Login failed. Please check credentials or server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Centering container with max width
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900">Login to TechStop</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              disabled={isLoading}
              placeholder="you@example.com" // Added placeholder
              // Style input: padding, border, rounded, focus state
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Password" // Added placeholder
              // Style input: padding, border, rounded, focus state
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {/* Display login errors */}
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
              // Style button: width, padding, colors, rounded, focus state, disabled state
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
         {/* Link to Registration Page */}
         <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Register
            </Link>
          </p>
      </div>
    </div>
  );
}

export default LoginPage;
