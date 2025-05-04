import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// Import the custom hook to access auth context
import { useAuth } from '../context/authContext'; // Adjust path if needed

// ProtectedRoute no longer needs token prop, it gets it from context
function ProtectedRoute({ children }) {
  // Get the token from the authentication context
  const { token } = useAuth();
  const location = useLocation(); // Get the current location

  // Check if the token exists (user is authenticated)
  if (!token) {
    // If no token exists:
    console.log("ProtectedRoute: No token found via context, redirecting to login.");
    // Redirect them to the /login page, passing the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a token exists, render the child component (the actual protected page).
  return children;
}

export default ProtectedRoute;
