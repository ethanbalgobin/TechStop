import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // custom hook to access auth context

function AdminProtectedRoute({ children }) {
  // Get the token and isAdmin status from the authentication context
  const { token, isAdmin, user } = useAuth();
  const location = useLocation();


  if (!token) {
    // User is not logged in, redirect to login page
    console.log("AdminProtectedRoute: No token, redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // User is logged in but not an admin, redirect to home or an unauthorized page
    console.log("AdminProtectedRoute: User is not an admin, redirecting to home.");
    return <Navigate to="/" replace />;
  }

  // User is logged in and is an admin, render the child component (admin page).
  console.log("AdminProtectedRoute: User is admin, access granted.");
  return children;
}

export default AdminProtectedRoute;
