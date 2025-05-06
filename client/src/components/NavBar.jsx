import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import { useCart } from '../context/CartContext';

function NavBar() {
  // Get auth state and functions from context
  // --- Destructure show2FAReminder ---
  const { token, logout, show2FAReminder } = useAuth();
  // Get cart count from CartContext
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const onLogoutClick = () => {
    logout();
    navigate('/login');
  };

  // --- Styles ---
  const navStyle = {
    backgroundColor: '#f0f0f0', // light grey
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
    position: 'relative', // Needed for absolute positioning of the dot
    display: 'inline-block', // Needed for positioning context
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
  // --- Style for the reminder dot ---
  const reminderDotStyle = {
      position: 'absolute',
      top: '0px', // Adjust position as needed
      right: '-8px', // Adjust position as needed
      width: '8px',
      height: '8px',
      backgroundColor: 'red',
      borderRadius: '50%',
  };
  // --- End Styles ---

  return (
    <nav style={navStyle}>
      {/* Left side links */}
      <div className="flex items-center space-x-2 sm:space-x-4 flex-1 justify-start">
        <Link to="/" style={linkStyle}>Home</Link>
        <Link to="/products" style={linkStyle}>Products</Link>
      </div>

      {/* Center Brand Name */}
      <div className="flex-shrink-0">
         <Link to="/" className="font-semibold text-lg text-gray-800 hover:text-gray-900">
           TechStop
         </Link>
      </div>

      {/* Right side links/buttons */}
      <div className="flex items-center space-x-2 sm:space-x-4 flex-1 justify-end">
        {/* Cart Link */}
        <Link to="/cart" style={cartLinkStyle}>
          Cart ({cartCount !== undefined ? cartCount : 0})
        </Link>

        {token ? (
          // If logged in
          <>
            <Link to="/orders" style={linkStyle}>Orders</Link>
            {/* Profile Link with conditional reminder dot */}
            <Link to="/profile" style={linkStyle}>
              Profile
              {/* --- Conditionally render reminder dot --- */}
              {show2FAReminder && (
                <span style={reminderDotStyle} title="2FA Setup Recommended"></span>
              )}
            </Link>
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
