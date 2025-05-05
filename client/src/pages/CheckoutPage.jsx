import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
// Import contexts
import { useCart } from '../context/CartContext'; 
import { useAuth } from '../context/AuthContext'; 
// Import country list
import { countryList } from '../constants/countries';

function CheckoutPage() {
  // Get cart data and clearCart function
  const { cartItems, cartTotal, clearCart, isLoading: isCartLoading } = useCart();
  // Get auth token
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate(); // Hook for navigation on success

  // State for Shipping Form Inputs
  const [fullName, setFullName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('');
  // State for form submission status
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for submission
  const [formError, setFormError] = useState('');


  // --- Basic Styles ---
  const containerStyle = { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', maxWidth: '1000px', margin: '0 auto' };
  const sectionStyle = { border: '1px solid #eee', padding: '20px', borderRadius: '8px' };
  const summaryItemStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9em' };
  const summaryTotalStyle = { ...summaryItemStyle, fontWeight: 'bold', fontSize: '1.1em', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #ccc' };
  const inputGroupStyle = { marginBottom: '15px' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold' };
  const inputStyle = { width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' };
  const buttonStyle = { display: 'block', width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1.1em', cursor: 'pointer', marginTop: '20px' };
  // --- End Styles ---

  // --- Checks (Auth, Cart Loading, Empty Cart) ---
  if (!token) {
    console.log("CheckoutPage: No token found, redirecting to login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (isCartLoading) {
    return <div>Loading cart for checkout...</div>;
  }
  if (!isCartLoading && cartItems.length === 0) {
    console.log("CheckoutPage: Cart is empty, showing message.");
    return ( <div> <h1>Checkout</h1> <p>Your cart is empty. Add some products before checking out!</p> <Link to="/products">Go Shopping</Link> </div> );
  }
  // --- End Checks ---


  // --- Updated submit handler to call the backend API ---
  const handlePlaceOrder = async (event) => {
      event.preventDefault();
      setFormError(''); // Clear previous errors

      // Basic validation check
      if (!fullName || !address1 || !city || !postcode || !country) {
          setFormError('Please fill in all required shipping fields.');
          return;
      }
      if (!countryList.includes(country)) {
          setFormError('Please select a valid country from the list.');
          return;
      }

      setIsSubmitting(true); // Set loading state for button

      // Gather shipping details from state
      const shippingDetails = { fullName, address1, address2, city, postcode, country };

      // Prepare order data (shipping + cart info)
      const orderPayload = {
          shippingDetails: shippingDetails,
          items: cartItems, // Get cart items from context
          total: cartTotal, // Get total from context
      };

      console.log("Placing Order...");
      console.log("Order Payload:", JSON.stringify(orderPayload, null, 2));

      try {
          // Make the API call to the backend
          const response = await fetch('/api/orders', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  // Include the auth token
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(orderPayload)
          });

          const responseData = await response.json(); // Try to parse JSON response

          if (!response.ok) {
              // Throw error using message from backend if available
              throw new Error(responseData.error || `Failed to place order: ${response.status}`);
          }

          // --- Order Success ---
          console.log("Order placed successfully!", responseData);
          alert(`Order placed successfully! Order ID: ${responseData.order?.id}`); // Simple confirmation

          // Clear the cart using the context function
          clearCart();

          // Redirect to an order confirmation/success page
          navigate(`/order-success/${responseData.order?.id}`); // Pass order ID if needed

      } catch (error) {
          console.error("Error placing order:", error);
          setFormError(error.message || 'An unexpected error occurred while placing the order.');
      } finally {
          setIsSubmitting(false); // Reset loading state
      }
  };


  // --- Render Checkout Form and Summary ---
  return (
    <div>
      <h1>Checkout</h1>
      <div style={containerStyle}>
        {/* Column 1: Shipping Details Form */}
        <div style={sectionStyle}>
          <h2>Shipping Information</h2>
          {/* Use the handlePlaceOrder function for onSubmit */}
          <form onSubmit={handlePlaceOrder}>
            {/* Name */}
            <div style={inputGroupStyle}>
              <label htmlFor="name" style={labelStyle}>Full Name:</label>
              <input type="text" id="name" name="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={isSubmitting} style={inputStyle} />
            </div>
            {/* Address Line 1 */}
            <div style={inputGroupStyle}>
              <label htmlFor="address1" style={labelStyle}>Address Line 1:</label>
              <input type="text" id="address1" name="address1" value={address1} onChange={(e) => setAddress1(e.target.value)} required disabled={isSubmitting} style={inputStyle} />
            </div>
            {/* Address Line 2 */}
            <div style={inputGroupStyle}>
              <label htmlFor="address2" style={labelStyle}>Address Line 2 (Optional):</label>
              <input type="text" id="address2" name="address2" value={address2} onChange={(e) => setAddress2(e.target.value)} disabled={isSubmitting} style={inputStyle} />
            </div>
            {/* City */}
            <div style={inputGroupStyle}>
              <label htmlFor="city" style={labelStyle}>City:</label>
              <input type="text" id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} required disabled={isSubmitting} style={inputStyle} />
            </div>
            {/* Postcode */}
            <div style={inputGroupStyle}>
              <label htmlFor="postcode" style={labelStyle}>Postcode:</label>
              <input type="text" id="postcode" name="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} required disabled={isSubmitting} style={inputStyle} />
            </div>
            {/* Country */}
            <div style={inputGroupStyle}>
              <label htmlFor="country" style={labelStyle}>Country:</label>
              <input type="text" id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} required disabled={isSubmitting} style={inputStyle} list="country-list" autoComplete="off" />
              <datalist id="country-list">
                {countryList.map((countryName) => (<option key={countryName} value={countryName} />))}
              </datalist>
            </div>

            {/* Payment Placeholder */}
            <h2 style={{marginTop: '30px'}}>Payment Information</h2>
            <p>(Payment integration like Stripe will go here)</p>

            {/* Display form errors */}
            {formError && <p style={{ color: 'red', marginTop: '10px' }}>{formError}</p>}

            {/* Submit Button - Disable while submitting */}
            <button type="submit" style={buttonStyle} disabled={isSubmitting}>
              {isSubmitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </form>
        </div>

        {/* Column 2: Order Summary */}
        <div style={sectionStyle}>
          <h2>Order Summary</h2>
          {cartItems.map(item => (
            <div key={item.product.id} style={summaryItemStyle}>
              <span>{item.product.name} (x{item.quantity})</span>
              <span>${(Number(item.product.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={summaryTotalStyle}>
            <span>Total:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
           <Link to="/cart" style={{display: 'block', textAlign: 'center', marginTop: '15px'}}>Edit Cart</Link>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
