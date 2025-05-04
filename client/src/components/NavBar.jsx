// client/src/components/NavBar.jsx

import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link for navigation and useNavigate for logout redirect

// NavBar receives the current token and the handleLogout function as props
function NavBar({ token, handleLogout }) {
  const navigate = useNavigate(); // Hook for programmatic navigation

  const onLogoutClick = () => {
    handleLogout(); // Call the logout function passed from App
    navigate('/login'); // Redirect to login page after logout
  };

  // TODO: Basic inline styles for the navbar (replace with CSS classes later)
  const navStyle = {
    backgroundColor: '#f0f0f0',
    padding: '10px 20px',
    marginBottom: '15px',
    borderBottom: '1px solid #ccc',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const linkStyle = {
    margin: '0 10px',
    textDecoration: 'none',
    color: '#333',
  };

  const buttonStyle = {
    marginLeft: '10px',
    padding: '5px 10px',
    cursor: 'pointer',
  };

  return (
    <nav style={navStyle}>
      <div> {/* Left side links */}
        <Link to="/" style={linkStyle}>Home</Link>
        <Link to="/products" style={linkStyle}>Products</Link>
      </div>
      <div> {/* Right side links/buttons */}
        {token ? (
          // If logged in, show Profile link and Logout button
          <>
            <Link to="/profile" style={linkStyle}>Profile</Link>
            <button onClick={onLogoutClick} style={buttonStyle}>Logout</button>
          </>
        ) : (
          // If logged out, show Login link
          <Link to="/login" style={linkStyle}>Login</Link>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
