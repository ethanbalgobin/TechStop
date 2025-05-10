import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext'; 
import { useCart } from '../context/CartContext'; 

function NavBar() {
  const { token, logout, isAdmin, show2FAReminder } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const onLogoutClick = () => {
    logout();
    navigate('/login');
  };

  // Tailwind Classes
  const baseLinkClasses = "text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium relative inline-block";
  const activeLinkClasses = "font-semibold text-green-600";
  const cartLinkClasses = "text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium mr-2";
  const buttonStyle = "ml-3 inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500";
  const primaryButtonStyle = "ml-3 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  const adminLinkClasses = "px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500";
  const reminderDotStyle = {
      position: 'absolute',
      top: '5px',
      right: '5px',
      width: '6px',
      height: '6px',
      backgroundColor: 'red',
      borderRadius: '50%',
  };

  const getNavLinkClass = ({ isActive }) => {
    return `${baseLinkClasses} ${isActive ? activeLinkClasses : ''}`.trim();
  };


  return (
    // Main nav container
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 shadow-sm">
      <div className="flex justify-between items-center h-14">

        {/* Left side links */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 justify-start">
          <NavLink to="/" className={getNavLinkClass} end> {/* 'end' prop ensures exact match for root path */}
            Home
          </NavLink>
          <NavLink to="/products" className={getNavLinkClass}>
            Products
          </NavLink>
        </div>

        {/* Center Brand Name */}
        <div className="flex-shrink-0">
           <Link to="/" className="font-semibold text-lg text-gray-800 hover:text-gray-900">
             TechStop
           </Link>
        </div>

        {/* Right side links/buttons */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 justify-end">
          <NavLink to="/cart" className={({ isActive }) => `${cartLinkClasses} ${isActive ? activeLinkClasses : ''}`.trim()}>
            Cart ({cartCount !== undefined ? cartCount : 0})
          </NavLink>

          {token ? (
            // If logged in
            <> {/* Use Fragment */}
              <NavLink to="/orders" className={getNavLinkClass}>
                Orders
              </NavLink>
              <NavLink to="/profile" className={getNavLinkClass}>
                Profile
                {show2FAReminder && (
                  <span style={reminderDotStyle} title="2FA Setup Recommended"></span>
                )}
              </NavLink>
              {isAdmin && (
                <NavLink
                    to="/admin/dashboard"
                    className={({ isActive }) => `${adminLinkClasses} ${isActive ? 'ring-2 ring-offset-2 ring-indigo-400' : ''}`.trim()}
                >
                  Manage
                </NavLink>
              )}
              <button onClick={onLogoutClick} className={buttonStyle}>Logout</button>
            </>
          ) : (
            // If logged out
            <> {/* Use Fragment */}
              <NavLink to="/login" className={getNavLinkClass}>
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => `${primaryButtonStyle} ${isActive ? 'ring-2 ring-offset-2 ring-blue-400' : ''}`.trim()}
              >
                Register
              </NavLink>
            </>
          )}
        </div> 
      </div> 
    </nav> 
  ); 
}

export default NavBar;
