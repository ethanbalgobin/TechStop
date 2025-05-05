// client/src/pages/CartPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
// Import the useCart hook to access cart state and functions
import { useCart } from '../context/CartContext'; // Adjust path if needed

function CartPage() {
  // Get cart data and functions from the context
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, isLoading } = useCart();

  // Helper function to safely format price
  const formatPrice = (price) => {
    const numPrice = Number(price);
    if (!isNaN(numPrice)) {
      return numPrice.toFixed(2);
    }
    console.warn(`CartPage: Invalid price value encountered: ${price}`);
    return 'N/A';
  };

  // Helper function to calculate subtotal safely
  const calculateSubtotal = (price, quantity) => {
      const numPrice = Number(price);
      const numQuantity = Number(quantity);
      if (!isNaN(numPrice) && !isNaN(numQuantity)) {
          return (numPrice * numQuantity).toFixed(2);
      }
      return 'N/A';
  };

  // --- Render Logic ---

  if (isLoading) {
      return <div className="text-center text-gray-500 py-10">Loading cart...</div>;
  }

  return (
    // Container with padding
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Shopping Cart</h1>

      {cartItems.length === 0 ? (
        // Display message if cart is empty
        <div className="text-center py-10">
          <p className="text-xl text-gray-500 mb-4">Your cart is currently empty.</p>
          <Link
            to="/products"
            className="inline-block px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        // Display cart contents if not empty
        <>
          {/* --- CHANGE: Replaced Table with CSS Grid using Divs --- */}
          <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Grid Header Row */}
            <div className="grid grid-cols-12 gap-4 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {/* Define column spans (total 12 for easy division) */}
              <div className="col-span-5">Product</div> {/* Approx 5/12 */}
              <div className="col-span-2">Price</div>   {/* Approx 2/12 */}
              <div className="col-span-2 text-center">Quantity</div> {/* Approx 2/12 */}
              <div className="col-span-2">Subtotal</div> {/* Approx 2/12 */}
              <div className="col-span-1 text-right"></div> {/* Actions column takes remaining space */}
            </div>

            {/* Grid Body Rows */}
            <div className="bg-white divide-y divide-gray-200">
              {cartItems.map(item => (
                // Grid Row for each item
                <div key={item.product.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  {/* Product Name Column */}
                  <div className="col-span-5 text-sm font-medium text-gray-900 truncate" title={item.product.name}>
                    {item.product.name}
                  </div>
                  {/* Price Column */}
                  <div className="col-span-2 text-sm text-gray-500">
                    ${formatPrice(item.product.price)}
                  </div>
                  {/* Quantity Column */}
                  <div className="col-span-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value, 10) || 0)}
                      className="w-16 border border-gray-300 rounded-md shadow-sm text-center focus:ring-blue-500 focus:border-blue-500 sm:text-sm mx-auto"
                      aria-label={`Quantity for ${item.product.name}`}
                    />
                  </div>
                  {/* Subtotal Column */}
                  <div className="col-span-2 text-sm text-gray-500">
                    ${calculateSubtotal(item.product.price, item.quantity)}
                  </div>
                  {/* Actions Column */}
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* --- End CSS Grid Replacement --- */}


          {/* Cart Summary and Actions Section (remains the same) */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col items-end space-y-3 mt-4 border border-gray-200 rounded-lg shadow-sm">
            <div className="text-lg font-semibold text-gray-900">
              Total ({cartCount} items): ${cartTotal.toFixed(2)}
            </div>
            <div className="flex space-x-3">
               <button
                 onClick={clearCart}
                 className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
               >
                 Clear Cart
               </button>
               <Link
                 to="/checkout"
                 className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
               >
                 Proceed to Checkout
               </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CartPage;
