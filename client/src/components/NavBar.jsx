import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Import the hooks to access context
import { useAuth } from '../context/authContext'; // Auth context
import { useCart } from '../context/CartContext';

// NavBar no longer needs props for token or logout handler
function NavBar() {
  // Get auth state and functions from context
  const { token, logout } = useAuth(); 
  const { cartCount } = useCart(); // Getting the Cart count from CartContext
  const navigate = useNavigate();

  const onLogoutClick = () => {
    // Call the logout function obtained from the context
    logout();
    // Navigate after context's logout logic runs
    navigate('/login');
  };

  // --- Styles ---
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
  const cartLinkStyle = {
    margin: '0 10px',
    textDecoration: 'none',
    color: '#333',
    fontWeight: 'bold',
  };
  const buttonStyle = {
    marginLeft: '10px',
    padding: '5px 10px',
    cursor: 'pointer',
  };
  // --- End Styles ---

  return (
    <nav style={navStyle}>
      <div> {/* Left side links */}
        <Link to="/" style={linkStyle}>Home</Link>
        <Link to="/products" style={linkStyle}>Products</Link>
      </div>
      <div> {/* Right side links/buttons */}
        {/* Using the token from context for conditional rendering */}
        <Link to="/cart" style={cartLinkStyle}>
          Cart ({cartCount !== undefined ? cartCount : 0})
        </Link>
        {token ? (
          // If logged in
          <>
            <Link to="/profile" style={linkStyle}>Profile</Link>
            <button onClick={onLogoutClick} style={buttonStyle}>Logout</button>
          </>
        ) : (
          // If logged out
          <>
            <Link to="/login" style={linkStyle}>Login</Link>
            <Link to="/register" style={linkStyle}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
