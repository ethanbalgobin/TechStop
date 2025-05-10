import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fetchApi from '../utils/api';

function RegistrationPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName
        })
      });

      // Registration successful, redirect to login
      navigate('/login', { 
        state: { message: 'Registration successful! Please log in.' }
      });
    } catch (err) {
      setError(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const checkboxLabelClasses = "ml-2 block text-sm text-gray-900";
  const checkboxClasses = "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500";

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] py-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold text-center text-gray-900">Create your TechStop Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label htmlFor="reg-username" className={labelClasses}>Username</label>
            <input type="text" id="reg-username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required disabled={isLoading} className={inputClasses} />
          </div>
          {/* Email Input */}
          <div>
            <label htmlFor="reg-email" className={labelClasses}>Email address</label>
            <input type="email" id="reg-email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={isLoading} className={inputClasses} />
          </div>
          {/* Password Input */}
          <div>
            <label htmlFor="reg-password" className={labelClasses}>Password</label>
            <input type="password" id="reg-password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required disabled={isLoading} className={inputClasses} />
          </div>
          {/* Confirm Password Input */}
          <div>
            <label htmlFor="reg-confirm-password" className={labelClasses}>Confirm Password</label>
            <input type="password" id="reg-confirm-password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required disabled={isLoading} className={inputClasses} />
          </div>
          {/* First Name Input */}
          <div>
            <label htmlFor="reg-firstname" className={labelClasses}>First Name <span className="text-gray-500">(Optional)</span></label>
            <input type="text" id="reg-firstname" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} disabled={isLoading} className={inputClasses} />
          </div>
          {/* Last Name Input */}
          <div>
            <label htmlFor="reg-lastname" className={labelClasses}>Last Name <span className="text-gray-500">(Optional)</span></label>
            <input type="text" id="reg-lastname" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} disabled={isLoading} className={inputClasses} />
          </div>
          {error && <p className="text-sm text-red-600 text-center font-medium">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
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
              Login here
            </Link>
          </p>
      </div>
    </div>
  );
}

export default RegistrationPage;
