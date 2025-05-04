import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// This componenet wraps all routes that require authentication
// It receives the authentication token and the component to render (children) as props.

function ProtectedRoute({ token, children }) {
    const location = useLocation();

    if(!token) {
        // If no token exists, user is not logged in
        console.log('ProtectedRoute: No token found, redirecting to login');
        // Paasing the the current location in 'state' so the login page can redirect
        // back to the originally requested page after successful login .
        return <Navigate to ='/login' state={{ from: location }} replace />
    }

    // if(token), render the child component (the protected page)
    return children;
}

export default ProtectedRoute;