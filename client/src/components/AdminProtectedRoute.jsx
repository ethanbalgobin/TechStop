import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminProtectedRoute({ children }) {
  const { token, isAdmin, user } = useAuth();
  const location = useLocation();


  if (!token) {
    console.log("AdminProtectedRoute: No token, redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!isAdmin) {
    console.log("AdminProtectedRoute: User is not an admin, redirecting to home.");
    return <Navigate to="/" replace />;
  }
  console.log("AdminProtectedRoute: User is admin, access granted.");
  return children;
}

export default AdminProtectedRoute;
