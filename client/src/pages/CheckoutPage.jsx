import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext'; 
import { countryList } from '../constants/countries';

function CheckoutPage() {
  const { cartItems, cartTotal, clearCart, isLoading: isCartLoading } = useCart();
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // State for Shipping Form Inputs
  const [fullName, setFullName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('');
  // State for form submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // --- Consistent Input Styling Class ---
  const inputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";


  // --- Checks (Auth, Cart Loading, Empty Cart) ---
  if (!token) {
    console.log("CheckoutPage: No token found, redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (isCartLoading) {
    return <div className="text-center text-gray-500 py-10">Loading cart for checkout...</div>;
  }
  if (!isCartLoading && cartItems.length === 0) {
    console.log("CheckoutPage: Cart is empty, showing message.");
    return (
      <div className="text-center py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Checkout</h1>
        <p className="text-xl text-gray-500 mb-4">Your cart is empty. Add some products before checking out!</p>
        <Link
            to="/products"
            className="inline-block px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
            Go Shopping
        </Link>
      </div>
     );
  }
  // --- End Checks ---


  // --- Submit Handler ---
  const handlePlaceOrder = async (event) => {
      event.preventDefault();
      setFormError('');
      if (!fullName || !address1 || !city || !postcode || !country) {
          setFormError('Please fill in all required shipping fields.');
          return;
      }
      if (!countryList.includes(country)) {
          setFormError('Please select a valid country from the list.');
          return;
      }
      setIsSubmitting(true);
      const shippingDetails = { fullName, address1, address2, city, postcode, country };
      const orderPayload = { shippingDetails: shippingDetails, items: cartItems, total: cartTotal };
      console.log("Placing Order...");
      console.log("Order Payload:", JSON.stringify(orderPayload, null, 2));
      try {
          const response = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(orderPayload)
          });
          const responseData = await response.json();
          if (!response.ok) { throw new Error(responseData.error || `Failed to place order: ${response.status}`); }
          console.log("Order placed successfully!", responseData);
          // alert(`Order placed successfully! Order ID: ${responseData.order?.id}`); // Consider replacing alert
          clearCart();
          navigate(`/order-success/${responseData.order?.id}`);
      } catch (error) {
          console.error("Error placing order:", error);
          setFormError(error.message || 'An unexpected error occurred while placing the order.');
      } finally {
          setIsSubmitting(false);
      }
  };
  // --- End Submit Handler ---


  // --- Render Checkout Form and Summary ---
  return (
    // Page container
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Checkout</h1>
      {/* Responsive grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Column 1 & 2: Shipping & Payment Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handlePlaceOrder} className="space-y-6">
            {/* Shipping Section */}
            <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Shipping Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="name" className={labelClasses}>Full Name</label>
                  <input type="text" id="name" name="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={isSubmitting} className={inputClasses} />
                </div>
                {/* Address Line 1 */}
                <div className="sm:col-span-2">
                  <label htmlFor="address1" className={labelClasses}>Address Line 1</label>
                  <input type="text" id="address1" name="address1" value={address1} onChange={(e) => setAddress1(e.target.value)} required disabled={isSubmitting} className={inputClasses} />
                </div>
                {/* Address Line 2 */}
                <div className="sm:col-span-2">
                  <label htmlFor="address2" className={labelClasses}>Address Line 2 <span className="text-gray-500">(Optional)</span></label>
                  <input type="text" id="address2" name="address2" value={address2} onChange={(e) => setAddress2(e.target.value)} disabled={isSubmitting} className={inputClasses} />
                </div>
                {/* City */}
                <div>
                  <label htmlFor="city" className={labelClasses}>City</label>
                  <input type="text" id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} required disabled={isSubmitting} className={inputClasses} />
                </div>
                {/* Postcode */}
                <div>
                  <label htmlFor="postcode" className={labelClasses}>Postcode</label>
                  <input type="text" id="postcode" name="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} required disabled={isSubmitting} className={inputClasses} />
                </div>
                {/* Country */}
                <div className="sm:col-span-2">
                  <label htmlFor="country" className={labelClasses}>Country</label>
                  <input type="text" id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} required disabled={isSubmitting} className={inputClasses} list="country-list" autoComplete="off" />
                  <datalist id="country-list">
                    {countryList.map((countryName) => (<option key={countryName} value={countryName} />))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Payment Placeholder Section */}
            <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Information</h2>
              <p className="text-sm text-gray-600">(Payment integration like Stripe Elements will go here)</p>
              {/* Placeholder for Stripe Elements or other payment form */}
            </div>

            {/* Display form errors */}
            {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{formError}</span>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting || cartItems.length === 0} // Disable if submitting or cart empty
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </form>
        </div>

        {/* Column 3: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 sticky top-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {cartItems.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.product.name} (x{item.quantity})</span>
                  <span className="text-gray-800 font-medium">${(Number(item.product.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-base font-semibold text-gray-900">
                <span>Total:</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>
            <Link to="/cart" className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-4 block text-center">
              Edit Cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
