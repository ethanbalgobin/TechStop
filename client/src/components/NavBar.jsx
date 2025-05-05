import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Import hooks to access context
import { useAuth } from '../context/AuthContext'; 
import { useCart } from '../context/CartContext';

function NavBar() {
  // Get auth state and functions from context
  const { token, logout } = useAuth();
  // Get cart count from CartContext
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const onLogoutClick = () => {
    logout();
    navigate('/login');
  };

  return (
    // Main nav container: White background, subtle bottom border, padding, flex layout
    <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 shadow-sm">
      {/* Use flex container for the overall layout */}
      <div className="flex justify-between items-center h-14"> {/* Fixed height */}

        {/* Left side links: */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 justify-start"> {/* flex-1 allows it to grow, justify-start aligns left */}
          <Link
            to="/"
            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Home
          </Link>
          <Link
            to="/products"
            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Products
          </Link>
        </div>

        {/* Center Brand Name */}
        <div className="flex-shrink-0"> {/* Prevents the brand from shrinking too much */}
           <Link to="/" className="font-semibold text-lg text-gray-800 hover:text-gray-900">
             TechStop
           </Link>
        </div>


        {/* Right side links/buttons: Use fixed width or flex-basis for balancing */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 justify-end"> {/* flex-1 allows it to grow, justify-end aligns right */}
          {/* Cart Link */}
          <Link
            to="/cart"
            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Cart ({cartCount !== undefined ? cartCount : 0})
          </Link>

          {token ? (
            // If logged in
            <>
              <Link
                to="/orders"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Orders
              </Link>
              <Link
                to="/profile"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
              {/* Styled Logout Button */}
              <button
                onClick={onLogoutClick}
                className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Logout
              </button>
            </>
          ) : (
            // If logged out
            <>
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
